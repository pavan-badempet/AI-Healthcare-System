/**
 * AI Healthcare System — Core API Client & Offline-Resilient Transport
 */
import { ApiConnectionError } from './apiErrors';
import {
  useOfflineSyncStore,
  saveCachedClinicalResponse,
  getCachedClinicalResponse,
} from './offlineSync';
import {
  useOfflineAuditStore,
  classifyOfflineClinicalAction,
  extractPatientIdFromPath,
} from './offlineAuditLogger';

export const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_API_URL) ||
  '';

type TokenGetter = () => string | null;
let customTokenGetter: TokenGetter | null = null;

export function setTokenGetter(getter: TokenGetter | null): void {
  customTokenGetter = getter;
}

export function getToken(): string | null {
  if (customTokenGetter) {
    return customTokenGetter();
  }
  if (typeof window !== 'undefined') {
    return localStorage.getItem('healthcare-auth');
  }
  return null;
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getWebSocketUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const base = API_BASE.replace(/^http/, 'ws');
  return `${base}${cleanPath}`;
}

export function redirectToLogin(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('healthcare-auth');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${cleanPath}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers as Record<string, string>),
  };

  const syncState = useOfflineSyncStore.getState();
  const effectivelyOffline = !syncState.isOnline || syncState.simulateOffline;

  // 1. Offline / Simulated Offline handling before network attempt
  if (effectivelyOffline) {
    if (method === 'GET') {
      const classified = classifyOfflineClinicalAction(method, cleanPath);
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_ACCESS',
        action: classified.action,
        resourcePath: cleanPath,
        httpMethod: method,
        targetPatientId: extractPatientIdFromPath(cleanPath),
        details: classified.summary,
      });

      const cached = getCachedClinicalResponse<T>(cleanPath);
      if (cached !== null) {
        return cached;
      }
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const bodyStr = typeof options.body === 'string' ? options.body : null;
      const classified = classifyOfflineClinicalAction(method, cleanPath);
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_MODIFICATION',
        action: classified.action,
        resourcePath: cleanPath,
        httpMethod: method,
        targetPatientId: extractPatientIdFromPath(cleanPath, bodyStr),
        details: classified.summary,
      });

      const queued = syncState.enqueueMutation(
        cleanPath,
        method,
        bodyStr,
        headers,
        `Clinical Record Update (${method} ${cleanPath})`
      );
      return {
        id: Date.now(),
        queued_offline: true,
        sync_id: queued.id,
        integrity_checksum: queued.integrityChecksum,
        status: 'queued_background_sync',
      } as unknown as T;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    // 2. Intermittent network failure fallback: serve cached GET or enqueue mutation + log to IndexedDB
    if (method === 'GET') {
      const classified = classifyOfflineClinicalAction(method, cleanPath);
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_ACCESS',
        action: classified.action,
        resourcePath: cleanPath,
        httpMethod: method,
        targetPatientId: extractPatientIdFromPath(cleanPath),
        details: classified.summary,
      });

      const cached = getCachedClinicalResponse<T>(cleanPath);
      if (cached !== null) {
        return cached;
      }
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const bodyStr = typeof options.body === 'string' ? options.body : null;
      const classified = classifyOfflineClinicalAction(method, cleanPath);
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_MODIFICATION',
        action: classified.action,
        resourcePath: cleanPath,
        httpMethod: method,
        targetPatientId: extractPatientIdFromPath(cleanPath, bodyStr),
        details: classified.summary,
      });

      const queued = syncState.enqueueMutation(
        cleanPath,
        method,
        bodyStr,
        headers,
        `Clinical Record Update (${method} ${cleanPath})`
      );
      return {
        id: Date.now(),
        queued_offline: true,
        sync_id: queued.id,
        integrity_checksum: queued.integrityChecksum,
        status: 'queued_background_sync',
      } as unknown as T;
    }
    throw new ApiConnectionError(cleanPath, err?.message || 'Network down');
  }

  if (response.status === 401) {
    redirectToLogin();
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'Could not validate credentials');
  }

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errJson = await response.json();
      if (typeof errJson.detail === 'string') {
        errorMessage = errJson.detail;
      } else if (Array.isArray(errJson.detail)) {
        errorMessage = errJson.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (typeof errJson.detail === 'object' && errJson.detail !== null) {
        errorMessage = JSON.stringify(errJson.detail);
      } else if (errJson.message) {
        errorMessage = errJson.message;
      }
    } catch {
      // Non-JSON response
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = (await response.json()) as T;

  // Cache successful GET clinical record responses with integrity checksum
  if (method === 'GET' && cleanPath.startsWith('/v1/')) {
    saveCachedClinicalResponse(cleanPath, data);
  }

  return data;
}
