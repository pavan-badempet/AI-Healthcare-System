import React from 'react';
import {
  Database,
  CheckCircle2,
  WifiOff,
  Wifi,
  RotateCcw,
  Trash2,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { AutoSaveStatus } from '@/lib/clinicalNoteAutoSave';

interface ClinicalNoteAutoSaveBannerProps {
  status: AutoSaveStatus;
  lastSavedAt: string | null;
  revisionCount: number;
  isOnline: boolean;
  simulatedNetworkDrop: boolean;
  restoredFromStorage: boolean;
  integrityChecksum: string | null;
  hasContent: boolean;
  onToggleSimulateNetworkDrop: () => void;
  onForceSaveNow: () => void;
  onDiscardDraft: () => void;
}

function formatSavedTime(iso: string | null): string {
  if (!iso) return 'No active draft';
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function ClinicalNoteAutoSaveBanner({
  status,
  lastSavedAt,
  revisionCount,
  isOnline,
  simulatedNetworkDrop,
  restoredFromStorage,
  integrityChecksum,
  hasContent,
  onToggleSimulateNetworkDrop,
  onForceSaveNow,
  onDiscardDraft,
}: ClinicalNoteAutoSaveBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Clinical Note Auto-Save Persistence Status"
      className={`rounded-xl border px-3.5 py-2.5 text-xs transition-colors space-y-2 ${
        !isOnline
          ? 'bg-amber-950/35 border-amber-500/40 text-amber-100'
          : restoredFromStorage && status === 'restored'
          ? 'bg-indigo-950/35 border-indigo-500/40 text-indigo-100'
          : 'bg-slate-950/85 border-slate-800/90 text-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Dual-Engine Persistence Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {status === 'saving' ? (
            <span className="inline-flex items-center gap-1.5 text-indigo-300 font-semibold">
              <Loader2 aria-hidden="true" className="w-3.5 h-3.5 animate-spin" />
              <span>Auto-saving to LocalStorage &amp; IndexedDB...</span>
            </span>
          ) : !isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-amber-300 font-semibold">
              <WifiOff aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Network Drop Detected · Draft Protected in IndexedDB &amp; LocalStorage
              </span>
            </span>
          ) : status === 'restored' ? (
            <span className="inline-flex items-center gap-1.5 text-indigo-300 font-semibold">
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
              <span>Restored unsaved clinical draft from local vault</span>
            </span>
          ) : status === 'saved_dual' || status === 'offline_vault_saved' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-300 font-semibold">
              <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
              <span>Auto-Saved (LocalStorage + IndexedDB)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
              <Database aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dual Auto-Save Ready (LocalStorage + IndexedDB)</span>
            </span>
          )}

          {lastSavedAt && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-[11px] font-mono text-slate-400">
                Saved {formatSavedTime(lastSavedAt)} (Rev #{revisionCount})
              </span>
            </>
          )}

          {integrityChecksum && (
            <>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span
                className="text-[10px] font-mono text-emerald-400/90 inline-flex items-center gap-1"
                title="Draft Cryptographic Integrity Hash"
              >
                <ShieldCheck aria-hidden="true" className="w-3 h-3" />
                CHK:{integrityChecksum.slice(0, 8)}
              </span>
            </>
          )}
        </div>

        {/* Right: Controls for Snapshot, Network Drop Resilience Test, and Discard */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleSimulateNetworkDrop}
            aria-pressed={simulatedNetworkDrop}
            title="Test auto-save resilience during an unexpected network drop"
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border ${
              simulatedNetworkDrop
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {simulatedNetworkDrop ? (
              <>
                <Wifi aria-hidden="true" className="w-3 h-3 text-emerald-400" />
                <span>Restore Network</span>
              </>
            ) : (
              <>
                <WifiOff aria-hidden="true" className="w-3 h-3 text-amber-400" />
                <span>Simulate Network Drop</span>
              </>
            )}
          </button>

          {hasContent && (
            <>
              <button
                type="button"
                onClick={onForceSaveNow}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Flush Snapshot
              </button>

              <button
                type="button"
                onClick={onDiscardDraft}
                aria-label="Discard auto-saved clinical note draft"
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 aria-hidden="true" className="w-3 h-3" />
                <span>Discard Draft</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
