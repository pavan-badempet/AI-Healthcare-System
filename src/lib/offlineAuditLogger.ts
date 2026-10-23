/**
 * AI Healthcare System — Local IndexedDB Clinical Audit Logger
 * Tracks all clinical data access (GET) and modifications (POST/PUT/PATCH/DELETE)
 * performed while offline in a persistent IndexedDB object store ('offline_audit_logs')
 * and synchronizes them with the server once connectivity is restored.
 */
import { create } from 'zustand';
import { computeClinicalIntegrityHash } from './offlineSync';
import { toast } from './toast';

const IDB_DATABASE_NAME = 'clinos_hipaa_audit_db';
const IDB_DATABASE_VERSION = 1;
const IDB_STORE_NAME = 'offline_audit_logs';
const FALLBACK_STORAGE_KEY = 'clinos_indexeddb_audit_fallback_v1';

export type OfflineAuditEventType = 'DATA_ACCESS' | 'DATA_MODIFICATION';

export interface OfflineAuditLogEntry {
  id: string;
  timestamp: string;
  eventType: OfflineAuditEventType;
  action: string;
  resourcePath: string;
  httpMethod: string;
  actorUserId: number;
  actorRole: string;
  targetPatientId: number | null;
  details: string;
  integrityChecksum: string;
  synced: boolean;
  syncedAt: string | null;
}

export interface RecordOfflineAuditInput {
  eventType: OfflineAuditEventType;
  action: string;
  resourcePath: string;
  httpMethod: string;
  actorUserId?: number;
  actorRole?: string;
  targetPatientId?: number | null;
  details: string;
}

/**
 * Opens the browser IndexedDB database and initializes the 'offline_audit_logs' object store.
 */
function openAuditIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_DATABASE_NAME, IDB_DATABASE_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('eventType', 'eventType', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

function readFallbackLogs(): OfflineAuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineAuditLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeFallbackLogs(entries: OfflineAuditLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Saves or updates an audit log entry inside IndexedDB (with automatic localStorage mirror fallback).
 */
async function putAuditEntryToIndexedDB(entry: OfflineAuditLogEntry): Promise<void> {
  const existing = readFallbackLogs().filter((e) => e.id !== entry.id);
  writeFallbackLogs([entry, ...existing]);

  const db = await openAuditIndexedDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(entry);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/**
 * Reads all offline audit log entries from IndexedDB, sorted newest first.
 */
export async function getAllAuditEntriesFromIndexedDB(): Promise<OfflineAuditLogEntry[]> {
  const db = await openAuditIndexedDB();
  if (!db) {
    return readFallbackLogs().sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = Array.isArray(req.result)
          ? (req.result as OfflineAuditLogEntry[])
          : readFallbackLogs();
        db.close();
        const mergedMap = new Map<string, OfflineAuditLogEntry>();
        for (const item of readFallbackLogs()) mergedMap.set(item.id, item);
        for (const item of result) mergedMap.set(item.id, item);
        const sorted = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        resolve(sorted);
      };

      req.onerror = () => {
        db.close();
        resolve(readFallbackLogs());
      };
    } catch {
      db.close();
      resolve(readFallbackLogs());
    }
  });
}

/**
 * Infers a target patient ID from a clinical API route path if present.
 */
export function extractPatientIdFromPath(path: string, bodyStr?: string | null): number | null {
  const match = path.match(/\/patients\/(\d+)/i) || path.match(/\/organ-health\/(\d+)/i);
  if (match && match[1]) {
    return Number(match[1]);
  }
  if (bodyStr) {
    try {
      const parsed = JSON.parse(bodyStr);
      if (parsed && typeof parsed.patient_id === 'number') {
        return parsed.patient_id;
      }
    } catch {
      // Ignore non-JSON body
    }
  }
  return null;
}

/**
 * Infers a descriptive HIPAA audit action code from an HTTP method and endpoint path.
 */
export function classifyOfflineClinicalAction(
  method: string,
  path: string
): { eventType: OfflineAuditEventType; action: string; summary: string } {
  const upperMethod = method.toUpperCase();
  const isRead = upperMethod === 'GET';
  const eventType: OfflineAuditEventType = isRead ? 'DATA_ACCESS' : 'DATA_MODIFICATION';

  if (path.includes('/emr-notes')) {
    return {
      eventType,
      action: isRead ? 'OFFLINE_ACCESS_EMR_NOTES' : 'OFFLINE_CREATE_EMR_NOTE',
      summary: isRead
        ? `Offline clinical read of patient EMR notes (${path}).`
        : `Offline creation of clinical EMR observation note (${path}).`,
    };
  }
  if (path.includes('/clinical-orders') || path.includes('/orders')) {
    return {
      eventType,
      action: isRead ? 'OFFLINE_ACCESS_CLINICAL_ORDERS' : 'OFFLINE_CREATE_CLINICAL_ORDER',
      summary: isRead
        ? `Offline review of clinical orders (${path}).`
        : `Offline clinical requisition order recorded (${path}).`,
    };
  }
  if (path.includes('/organ-health') || path.includes('/predict')) {
    return {
      eventType,
      action: isRead ? 'OFFLINE_ACCESS_ORGAN_RISK' : 'OFFLINE_RUN_RISK_EVALUATION',
      summary: `Offline clinical AI risk profile access (${upperMethod} ${path}).`,
    };
  }
  if (path.includes('/beds')) {
    return {
      eventType,
      action: isRead ? 'OFFLINE_ACCESS_BED_CENSUS' : 'OFFLINE_MODIFY_BED_STATUS',
      summary: isRead
        ? `Offline ward bed census inspection (${path}).`
        : `Offline bed allocation status update (${path}).`,
    };
  }
  if (path.includes('/patients')) {
    return {
      eventType,
      action: isRead ? 'OFFLINE_ACCESS_PATIENT_CHART' : 'OFFLINE_UPDATE_PATIENT_RECORD',
      summary: isRead
        ? `Offline clinical chart access (${path}).`
        : `Offline clinical patient record modification (${upperMethod} ${path}).`,
    };
  }

  return {
    eventType,
    action: isRead ? 'OFFLINE_CLINICAL_DATA_ACCESS' : 'OFFLINE_CLINICAL_DATA_MODIFICATION',
    summary: `Offline clinical ${isRead ? 'read access' : 'data modification'} on ${upperMethod} ${path}.`,
  };
}

interface OfflineAuditStoreState {
  logs: OfflineAuditLogEntry[];
  unsyncedCount: number;
  syncingAudit: boolean;
  lastAuditSyncAt: string | null;
  loadOfflineAuditLogs: () => Promise<OfflineAuditLogEntry[]>;
  recordOfflineAuditEvent: (input: RecordOfflineAuditInput) => Promise<OfflineAuditLogEntry>;
  syncOfflineAuditLogsToServer: () => Promise<number>;
  recordSampleOfflineAuditEvents: () => Promise<void>;
}

export const useOfflineAuditStore = create<OfflineAuditStoreState>((set, get) => ({
  logs: readFallbackLogs(),
  unsyncedCount: readFallbackLogs().filter((l) => !l.synced).length,
  syncingAudit: false,
  lastAuditSyncAt: null,

  loadOfflineAuditLogs: async () => {
    const entries = await getAllAuditEntriesFromIndexedDB();
    set({
      logs: entries,
      unsyncedCount: entries.filter((e) => !e.synced).length,
    });
    return entries;
  },

  recordOfflineAuditEvent: async (input: RecordOfflineAuditInput) => {
    const timestamp = new Date().toISOString();
    const actorUserId = input.actorUserId ?? 7;
    const actorRole = input.actorRole ?? 'doctor';
    const targetPatientId = input.targetPatientId ?? null;

    const checksumPayload = `${timestamp}|${input.eventType}|${input.action}|${input.resourcePath}|${actorUserId}|${targetPatientId ?? ''}|${input.details}`;
    const integrityChecksum = computeClinicalIntegrityHash(checksumPayload);

    const entry: OfflineAuditLogEntry = {
      id: `idb-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      eventType: input.eventType,
      action: input.action,
      resourcePath: input.resourcePath,
      httpMethod: input.httpMethod.toUpperCase(),
      actorUserId,
      actorRole,
      targetPatientId,
      details: input.details,
      integrityChecksum,
      synced: false,
      syncedAt: null,
    };

    await putAuditEntryToIndexedDB(entry);
    const updated = await getAllAuditEntriesFromIndexedDB();
    set({
      logs: updated,
      unsyncedCount: updated.filter((e) => !e.synced).length,
    });
    return entry;
  },

  syncOfflineAuditLogsToServer: async () => {
    if (get().syncingAudit) return 0;
    const allLogs = await getAllAuditEntriesFromIndexedDB();
    const unsynced = allLogs.filter((e) => !e.synced);
    if (unsynced.length === 0) return 0;

    set({ syncingAudit: true });
    try {
      // Verify cryptographic integrity checksum before syncing each offline audit log
      const verifiedLogs = unsynced.filter((entry) => {
        const expected = computeClinicalIntegrityHash(
          `${entry.timestamp}|${entry.eventType}|${entry.action}|${entry.resourcePath}|${entry.actorUserId}|${entry.targetPatientId ?? ''}|${entry.details}`
        );
        return expected === entry.integrityChecksum;
      });

      const response = await fetch('/admin/audit-logs/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: verifiedLogs }),
      });

      if (!response.ok) {
        set({ syncingAudit: false });
        return 0;
      }

      const syncedAt = new Date().toISOString();
      for (const entry of verifiedLogs) {
        await putAuditEntryToIndexedDB({
          ...entry,
          synced: true,
          syncedAt,
        });
      }

      const refreshed = await getAllAuditEntriesFromIndexedDB();
      set({
        logs: refreshed,
        unsyncedCount: refreshed.filter((e) => !e.synced).length,
        syncingAudit: false,
        lastAuditSyncAt: syncedAt,
      });

      if (verifiedLogs.length > 0) {
        toast.success(
          `IndexedDB Audit Sync: ${verifiedLogs.length} offline audit log(s) verified & synced to server.`
        );
      }
      return verifiedLogs.length;
    } catch {
      set({ syncingAudit: false });
      return 0;
    }
  },

  recordSampleOfflineAuditEvents: async () => {
    await get().recordOfflineAuditEvent({
      eventType: 'DATA_ACCESS',
      action: 'OFFLINE_ACCESS_PATIENT_CHART',
      resourcePath: '/v1/hospital/patients/42/emr-notes',
      httpMethod: 'GET',
      actorUserId: 7,
      actorRole: 'doctor',
      targetPatientId: 42,
      details:
        'Offline clinical chart & EMR progress notes accessed for Patient #42 during ward rounds.',
    });

    await get().recordOfflineAuditEvent({
      eventType: 'DATA_MODIFICATION',
      action: 'OFFLINE_MODIFY_CLINICAL_RECORD',
      resourcePath: '/v1/hospital/patients/43/emr-notes',
      httpMethod: 'POST',
      actorUserId: 7,
      actorRole: 'doctor',
      targetPatientId: 43,
      details:
        'Offline bedside clinical observation & STAT troponin order modification recorded for Patient #43.',
    });

    toast.info(
      'Recorded 2 offline audit events (Data Access + Data Modification) in IndexedDB.'
    );
  },
}));
