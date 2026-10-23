/**
 * PWAInstallButton & OfflineSyncControl — In-app PWA install prompt and
 * Workbox Offline / Background Sync status indicator & interactive test control.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  CheckCircle2,
  CloudUpload,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '@/lib/usePWAInstall';
import { useOfflineSyncStore } from '@/lib/offlineSync';
import { useOfflineAuditStore } from '@/lib/offlineAuditLogger';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer"
        title="Install ClinOS App for Offline Access"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden xl:inline">Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-semibold cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white">Install on iPhone / iPad</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                1. Tap the <strong>Share</strong> button in the Safari toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 py-2 text-xs font-bold text-white cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineSyncControl() {
  const {
    isOnline,
    simulateOffline,
    syncing,
    cachedEndpointsCount,
    pendingQueue,
    toggleSimulateOffline,
    flushBackgroundSyncQueue,
    queueSampleOfflineRecord,
  } = useOfflineSyncStore();
  const {
    unsyncedCount: unsyncedAuditCount,
    loadOfflineAuditLogs,
    syncOfflineAuditLogsToServer,
  } = useOfflineAuditStore();

  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadOfflineAuditLogs();
  }, [loadOfflineAuditLogs]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        open &&
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const effectivelyOffline = !isOnline || simulateOffline;

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={effectivelyOffline ? 'Offline mode active' : 'Online and synced'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
          effectivelyOffline
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            : pendingQueue.length > 0
            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
            : 'bg-[var(--bg-card)] border-[var(--border)] text-emerald-400 hover:border-emerald-500/40'
        }`}
      >
        {effectivelyOffline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        ) : syncing ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
        ) : (
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
        )}
        <span className="hidden xl:inline">
          {effectivelyOffline
            ? 'Offline'
            : pendingQueue.length > 0
            ? `Sync (${pendingQueue.length})`
            : 'Synced'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[44px] w-80 z-50 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Workbox Offline & Background Sync
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {effectivelyOffline
                  ? 'Serving verified cached records; new updates are queued.'
                  : 'All clinical records cached & synchronized.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">Cached</span>
              <span className="text-xs font-bold text-white">{cachedEndpointsCount} Ready</span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">Sync Queue</span>
              <span className="text-xs font-bold text-indigo-400">
                {pendingQueue.length} Pending
              </span>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-2">
              <span className="text-[10px] text-slate-400 block">IDB Audit</span>
              <span className="text-xs font-bold text-amber-400">
                {unsyncedAuditCount} Logged
              </span>
            </div>
          </div>

          {pendingQueue.length > 0 && (
            <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
              {pendingQueue.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]"
                >
                  <div className="font-semibold text-white truncate">{item.description}</div>
                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                    Checksum: {item.integrityChecksum}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={toggleSimulateOffline}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                simulateOffline
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300'
              }`}
            >
              {simulateOffline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" /> Reconnect & Replay Background Sync
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> Simulate Offline Mode
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={queueSampleOfflineRecord}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5 text-indigo-400" />
                Queue Record
              </button>

              {(pendingQueue.length > 0 || unsyncedAuditCount > 0) && !effectivelyOffline && (
                <button
                  type="button"
                  disabled={syncing}
                  onClick={() => {
                    void flushBackgroundSyncQueue();
                    void syncOfflineAuditLogsToServer();
                  }}
                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function OfflineBanner() {
  const { isOnline, simulateOffline, pendingQueue, toggleSimulateOffline } =
    useOfflineSyncStore();

  const effectivelyOffline = !isOnline || simulateOffline;
  if (!effectivelyOffline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-2xl bg-amber-500/95 border border-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-xl">
      <span className="h-2.5 w-2.5 rounded-full bg-slate-950 animate-pulse" />
      <span>
        Offline Mode — Serving cached clinical records ({pendingQueue.length} update
        {pendingQueue.length === 1 ? '' : 's'} queued for Background Sync).
      </span>
      {simulateOffline && (
        <button
          type="button"
          onClick={toggleSimulateOffline}
          className="px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 text-[11px] font-bold hover:bg-slate-900 cursor-pointer"
        >
          Go Online & Sync
        </button>
      )}
    </div>
  );
}
