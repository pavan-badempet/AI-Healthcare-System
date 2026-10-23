import React, { useEffect } from 'react';
import { EyeOff, Eye, ShieldAlert, Lock } from 'lucide-react';
import { usePrivacyStore } from '@/lib/privacy';

interface PrivacyModeToggleProps {
  compact?: boolean;
}

/**
 * Interactive toggle button to enable/disable Privacy Mode (PII Masking for Training & Research).
 */
export function PrivacyModeToggle({ compact = false }: PrivacyModeToggleProps) {
  const { isPrivacyMode, togglePrivacyMode } = usePrivacyStore();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isPrivacyMode}
      aria-label="Toggle Privacy Mode (Mask Patient PII)"
      onClick={togglePrivacyMode}
      title="Toggle Privacy Mode — Automatically masks patient PII for staff training and clinical research (Alt+P)"
      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
        isPrivacyMode
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
          : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-slate-700'
      }`}
    >
      {isPrivacyMode ? (
        <>
          <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          <span>{compact ? 'Privacy: ON' : 'Privacy Mode: ON'}</span>
        </>
      ) : (
        <>
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span>{compact ? 'Privacy' : 'Privacy Mode'}</span>
        </>
      )}
    </button>
  );
}

/**
 * Top notification bar shown when Privacy Mode is active, plus global Alt+P shortcut listener.
 */
export default function PrivacyModeBanner() {
  const { isPrivacyMode, togglePrivacyMode, setPrivacyMode } = usePrivacyStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        togglePrivacyMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePrivacyMode]);

  if (!isPrivacyMode) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-amber-950/60 border-b border-amber-500/30 px-4 sm:px-6 py-2 text-xs text-amber-200 backdrop-blur-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            <strong className="text-amber-300 font-bold">
              Privacy Mode Active (Training &amp; Research):
            </strong>{' '}
            Patient names, MRNs, dates of birth, and contact details are automatically masked per HIPAA Safe Harbor guidelines.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPrivacyMode(false)}
          className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-[11px] transition-colors cursor-pointer shrink-0"
        >
          Show Real Identifiers
        </button>
      </div>
    </div>
  );
}
