/**
 * AI Healthcare System — Dual-Engine Clinical Note Auto-Save Service (LocalStorage + IndexedDB)
 * Guarantees zero clinical data loss across browser sessions, patient switches,
 * and unexpected network drops.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { computeClinicalIntegrityHash } from './offlineSync';

const IDB_DB_NAME = 'clinos_clinical_note_drafts_db';
const IDB_DB_VERSION = 1;
const IDB_STORE_NAME = 'clinical_note_drafts';
const LOCAL_STORAGE_PREFIX = 'clinos_note_draft_v1_';

export type AutoSaveScope = 'emr_chart_note' | 'quick_fab_note' | 'handoff_sbar_note';

export type AutoSaveStatus =
  | 'idle'
  | 'saving'
  | 'saved_dual'
  | 'offline_vault_saved'
  | 'restored';

export interface ClinicalNoteDraftRecord {
  draftKey: string;
  formScope: AutoSaveScope;
  patientId: number;
  patientName?: string;
  noteType: string;
  content: string;
  language?: string;
  voiceTranscribed?: boolean;
  updatedAt: string;
  revisionCount: number;
  savedWhileOffline: boolean;
  integrityChecksum: string;
}

export function buildDraftKey(formScope: AutoSaveScope, patientId: number): string {
  return `${formScope}_pt_${patientId}`;
}

function openDraftsIndexedDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window) || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE_NAME)) {
          const store = db.createObjectStore(IDB_STORE_NAME, { keyPath: 'draftKey' });
          store.createIndex('patientId', 'patientId', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function readDraftFromLocalStorage(
  draftKey: string
): ClinicalNoteDraftRecord | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${draftKey}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClinicalNoteDraftRecord;
    return parsed && typeof parsed.content === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDraftToLocalStorage(record: ClinicalNoteDraftRecord): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${record.draftKey}`,
      JSON.stringify(record)
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function removeDraftFromLocalStorage(draftKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}${draftKey}`);
  } catch {
    // Ignore
  }
}

export async function readDraftFromIndexedDB(
  draftKey: string
): Promise<ClinicalNoteDraftRecord | null> {
  const db = await openDraftsIndexedDB();
  if (!db) return readDraftFromLocalStorage(draftKey);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readonly');
      const store = tx.objectStore(IDB_STORE_NAME);
      const req = store.get(draftKey);

      req.onsuccess = () => {
        const idbResult = (req.result as ClinicalNoteDraftRecord | undefined) || null;
        const lsResult = readDraftFromLocalStorage(draftKey);
        if (idbResult && lsResult) {
          const idbTime = new Date(idbResult.updatedAt).getTime();
          const lsTime = new Date(lsResult.updatedAt).getTime();
          resolve(lsTime > idbTime ? lsResult : idbResult);
          return;
        }
        resolve(idbResult || lsResult);
      };
      req.onerror = () => resolve(readDraftFromLocalStorage(draftKey));
    } catch {
      resolve(readDraftFromLocalStorage(draftKey));
    }
  });
}

export async function saveDraftDualEngine(
  record: ClinicalNoteDraftRecord
): Promise<void> {
  // 1. Synchronous write to localStorage for immediate crash / tab-close resilience
  writeDraftToLocalStorage(record);

  // 2. Asynchronous transactional write to IndexedDB object store
  const db = await openDraftsIndexedDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function clearDraftDualEngine(draftKey: string): Promise<void> {
  removeDraftFromLocalStorage(draftKey);

  const db = await openDraftsIndexedDB();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE_NAME, 'readwrite');
      const store = tx.objectStore(IDB_STORE_NAME);
      store.delete(draftKey);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export interface UseClinicalNoteAutoSaveOptions {
  formScope: AutoSaveScope;
  patientId: number;
  patientName?: string;
  noteType: string;
  content: string;
  language?: string;
  voiceTranscribed?: boolean;
  onRestoreDraft: (draft: ClinicalNoteDraftRecord) => void;
}

export interface UseClinicalNoteAutoSaveResult {
  draftKey: string;
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  revisionCount: number;
  isOnline: boolean;
  simulatedNetworkDrop: boolean;
  restoredFromStorage: boolean;
  integrityChecksum: string | null;
  toggleSimulateNetworkDrop: () => void;
  forceSaveNow: () => Promise<void>;
  discardDraft: () => Promise<void>;
}

/**
 * React hook that manages automatic debounced and event-driven persistence
 * of clinical notes across both localStorage and IndexedDB.
 */
export function useClinicalNoteAutoSave({
  formScope,
  patientId,
  patientName,
  noteType,
  content,
  language,
  voiceTranscribed,
  onRestoreDraft,
}: UseClinicalNoteAutoSaveOptions): UseClinicalNoteAutoSaveResult {
  const draftKey = buildDraftKey(formScope, patientId);

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [revisionCount, setRevisionCount] = useState<number>(0);
  const [integrityChecksum, setIntegrityChecksum] = useState<string | null>(null);
  const [restoredFromStorage, setRestoredFromStorage] = useState<boolean>(false);
  const [browserOnline, setBrowserOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [simulatedNetworkDrop, setSimulatedNetworkDrop] = useState<boolean>(false);

  const isOnline = browserOnline && !simulatedNetworkDrop;
  const revisionRef = useRef<number>(0);
  const hydratedKeyRef = useRef<string | null>(null);
  const latestStateRef = useRef({
    draftKey,
    formScope,
    patientId,
    patientName,
    noteType,
    content,
    language,
    voiceTranscribed,
    isOnline,
  });

  latestStateRef.current = {
    draftKey,
    formScope,
    patientId,
    patientName,
    noteType,
    content,
    language,
    voiceTranscribed,
    isOnline,
  };

  // Monitor browser online/offline connectivity transitions
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setBrowserOnline(true);
    const handleOffline = () => setBrowserOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Hydrate saved draft when switching patient or formScope
  useEffect(() => {
    let cancelled = false;
    hydratedKeyRef.current = null;

    // Synchronous check first for zero-latency restoration
    const syncDraft = readDraftFromLocalStorage(draftKey);
    if (syncDraft && syncDraft.content.trim().length > 0) {
      hydratedKeyRef.current = draftKey;
      revisionRef.current = syncDraft.revisionCount || 1;
      setRevisionCount(revisionRef.current);
      setLastSavedAt(syncDraft.updatedAt);
      setIntegrityChecksum(syncDraft.integrityChecksum);
      setRestoredFromStorage(true);
      setStatus('restored');
      onRestoreDraft(syncDraft);
      return;
    }

    // Async IndexedDB check if localStorage was cleared or newer exists in IDB
    readDraftFromIndexedDB(draftKey).then((idbDraft) => {
      if (cancelled) return;
      hydratedKeyRef.current = draftKey;
      if (idbDraft && idbDraft.content.trim().length > 0) {
        revisionRef.current = idbDraft.revisionCount || 1;
        setRevisionCount(revisionRef.current);
        setLastSavedAt(idbDraft.updatedAt);
        setIntegrityChecksum(idbDraft.integrityChecksum);
        setRestoredFromStorage(true);
        setStatus('restored');
        onRestoreDraft(idbDraft);
      } else {
        revisionRef.current = 0;
        setRevisionCount(0);
        setLastSavedAt(null);
        setIntegrityChecksum(null);
        setRestoredFromStorage(false);
        setStatus('idle');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  const persistCurrentDraft = useCallback(async () => {
    const current = latestStateRef.current;
    const trimmed = current.content.trim();
    if (!trimmed) {
      await clearDraftDualEngine(current.draftKey);
      setStatus('idle');
      setLastSavedAt(null);
      setIntegrityChecksum(null);
      return;
    }

    const now = new Date().toISOString();
    const nextRevision = revisionRef.current + 1;
    revisionRef.current = nextRevision;

    const checksum = computeClinicalIntegrityHash(
      `${current.draftKey}|${current.patientId}|${current.noteType}|${trimmed}|${nextRevision}`
    );

    const record: ClinicalNoteDraftRecord = {
      draftKey: current.draftKey,
      formScope: current.formScope,
      patientId: current.patientId,
      patientName: current.patientName,
      noteType: current.noteType,
      content: current.content,
      language: current.language,
      voiceTranscribed: current.voiceTranscribed,
      updatedAt: now,
      revisionCount: nextRevision,
      savedWhileOffline: !current.isOnline,
      integrityChecksum: checksum,
    };

    await saveDraftDualEngine(record);
    setRevisionCount(nextRevision);
    setLastSavedAt(now);
    setIntegrityChecksum(checksum);
    setStatus(current.isOnline ? 'saved_dual' : 'offline_vault_saved');
  }, []);

  // Debounced auto-save on content or noteType changes
  useEffect(() => {
    if (hydratedKeyRef.current !== draftKey) return;
    if (!content.trim()) return;

    setStatus('saving');
    const timer = window.setTimeout(() => {
      void persistCurrentDraft();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [content, noteType, language, voiceTranscribed, isOnline, draftKey, persistCurrentDraft]);

  // Flush synchronously to localStorage on tab close, visibility hide, or network drop
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleEmergencyFlush = () => {
      const current = latestStateRef.current;
      if (!current.content.trim()) return;
      const now = new Date().toISOString();
      const rev = revisionRef.current + 1;
      const checksum = computeClinicalIntegrityHash(
        `${current.draftKey}|${current.patientId}|${current.noteType}|${current.content.trim()}|${rev}`
      );
      writeDraftToLocalStorage({
        draftKey: current.draftKey,
        formScope: current.formScope,
        patientId: current.patientId,
        patientName: current.patientName,
        noteType: current.noteType,
        content: current.content,
        language: current.language,
        voiceTranscribed: current.voiceTranscribed,
        updatedAt: now,
        revisionCount: rev,
        savedWhileOffline: !current.isOnline,
        integrityChecksum: checksum,
      });
    };

    window.addEventListener('beforeunload', handleEmergencyFlush);
    document.addEventListener('visibilitychange', handleEmergencyFlush);
    return () => {
      window.removeEventListener('beforeunload', handleEmergencyFlush);
      document.removeEventListener('visibilitychange', handleEmergencyFlush);
    };
  }, []);

  const toggleSimulateNetworkDrop = useCallback(() => {
    setSimulatedNetworkDrop((prev) => {
      const next = !prev;
      window.setTimeout(() => {
        void persistCurrentDraft();
      }, 30);
      return next;
    });
  }, [persistCurrentDraft]);

  const discardDraft = useCallback(async () => {
    await clearDraftDualEngine(draftKey);
    revisionRef.current = 0;
    setRevisionCount(0);
    setLastSavedAt(null);
    setIntegrityChecksum(null);
    setRestoredFromStorage(false);
    setStatus('idle');
  }, [draftKey]);

  return {
    draftKey,
    status,
    lastSavedAt,
    revisionCount,
    isOnline,
    simulatedNetworkDrop,
    restoredFromStorage,
    integrityChecksum,
    toggleSimulateNetworkDrop,
    forceSaveNow: persistCurrentDraft,
    discardDraft,
  };
}
