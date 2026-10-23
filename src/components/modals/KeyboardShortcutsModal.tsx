/**
 * KeyboardShortcutsModal.tsx
 *
 * Interactive Keyboard Shortcuts Cheat Sheet Modal ('?'), live 'g + key'
 * chord HUD indicator, and compact clinical action shortcut bar for the
 * Patients Registry and Patient Chart views.
 */

import React, { useState, useMemo } from 'react';
import { Keyboard, X, Search, Compass, Users, FileText, ShieldCheck, CornerDownLeft } from 'lucide-react';
import {
  CLINICAL_SHORTCUTS,
  NAVIGATION_CHORD_MAP,
  type ShortcutDefinition,
} from '@/lib/keyboardShortcuts';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const CATEGORY_META: Record<
  ShortcutDefinition['category'],
  { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }
> = {
  navigation: {
    title: 'Global Dashboard Navigation',
    subtitle: 'Two-key "g" chords or Alt+1..7 to jump between clinical modules',
    icon: Compass,
  },
  patients_list: {
    title: 'Patients Registry List Actions',
    subtitle: 'High-speed row navigation, quick-view, note entry, and load balancing',
    icon: Users,
  },
  patient_chart: {
    title: 'Patient Chart & EMR Actions',
    subtitle: 'Instant tab switching, voice dictation, Smart Rx, DICOM & FHIR export',
    icon: FileText,
  },
  system: {
    title: 'System, Search & Privacy Controls',
    subtitle: 'Command palette, HIPAA PII masking, and modal controls',
    icon: ShieldCheck,
  },
};

/**
 * Modal displaying all keyboard shortcuts grouped by clinical workflow context,
 * with live search filtering and clickable navigation shortcuts.
 */
export default function KeyboardShortcutsModal({
  open,
  onClose,
  onNavigate,
}: KeyboardShortcutsModalProps) {
  const [filterText, setFilterText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | ShortcutDefinition['category']
  >('all');

  const filteredShortcuts = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return CLINICAL_SHORTCUTS.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keys.join(' ').toLowerCase().includes(q) ||
        (item.alternateKeys?.join(' ').toLowerCase().includes(q) ?? false)
      );
    });
  }, [filterText, selectedCategory]);

  if (!open) return null;

  const categoriesToRender = (
    ['navigation', 'patients_list', 'patient_chart', 'system'] as const
  ).filter((cat) => selectedCategory === 'all' || selectedCategory === cat);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Clinical Keyboard Shortcuts Reference"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between gap-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  High-Speed Clinical Keyboard Shortcuts
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold uppercase">
                  Hands-Free EMR Workflow
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Navigate modules, triage patient records, author SOAP notes, and switch chart views without leaving the keyboard.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts modal"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter & Category Tabs Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800/70 bg-slate-950/90 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'all', label: 'All Shortcuts' },
              { id: 'navigation', label: 'Navigation' },
              { id: 'patients_list', label: 'Patients List' },
              { id: 'patient_chart', label: 'Patient Chart' },
              { id: 'system', label: 'System & Privacy' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter shortcuts (e.g. note, dicom, g p)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Shortcut Groups Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {categoriesToRender.map((categoryKey) => {
            const items = filteredShortcuts.filter((s) => s.category === categoryKey);
            if (items.length === 0) return null;
            const meta = CATEGORY_META[categoryKey];
            const Icon = meta.icon;

            return (
              <section key={categoryKey} className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      {meta.title}
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    {meta.subtitle}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {items.map((shortcut) => {
                    const isClickable = Boolean(shortcut.routeHint && onNavigate);
                    return (
                      <div
                        key={shortcut.id}
                        onClick={() => {
                          if (shortcut.routeHint && onNavigate) {
                            onNavigate(shortcut.routeHint);
                            onClose();
                          }
                        }}
                        className={`p-3 rounded-xl bg-slate-900/60 border border-slate-800/90 flex items-start justify-between gap-3 transition-colors ${
                          isClickable
                            ? 'hover:border-indigo-500/50 hover:bg-slate-900 cursor-pointer'
                            : ''
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{shortcut.label}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {shortcut.description}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((k, idx) => (
                              <React.Fragment key={k + idx}>
                                <kbd className="px-2 py-1 text-[11px] font-mono font-bold text-indigo-200 bg-slate-950 border border-slate-700 rounded-md shadow-inner">
                                  {k}
                                </kbd>
                                {idx < shortcut.keys.length - 1 && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    then
                                  </span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                          {shortcut.alternateKeys && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                              <span>or</span>
                              {shortcut.alternateKeys.map((ak, i) => (
                                <kbd
                                  key={ak + i}
                                  className="px-1.5 py-0.5 text-[10px] font-mono text-slate-300 bg-slate-900 border border-slate-800 rounded"
                                >
                                  {ak}
                                </kbd>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-900/80 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Tip: Single-key shortcuts automatically pause while typing in search or clinical note fields.</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200">
              ?
            </kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-slate-200">
              Esc
            </kbd>
            <span>to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating bottom-left HUD pill shown when the clinician presses `g` to arm
 * a two-key global navigation chord (`g` -> `d`, `p`, `b`, `t`, `e`, `c`, `a`).
 */
export function ChordIndicatorHud({ activeChord }: { activeChord: string | null }) {
  if (!activeChord) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-[105] bg-slate-950/95 border border-indigo-500/50 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs text-slate-100"
    >
      <div className="flex items-center gap-1.5">
        <kbd className="px-2 py-1 rounded-md bg-indigo-600 text-white font-mono font-bold text-xs shadow">
          {activeChord}
        </kbd>
        <span className="text-indigo-300 font-semibold">Go to module:</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {Object.entries(NAVIGATION_CHORD_MAP).map(([key, target]) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[11px]"
          >
            <kbd className="font-mono font-bold text-indigo-300">{key}</kbd>
            <span className="text-slate-300">{target.label.replace('Clinical ', '')}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact interactive keyboard workflow bar displayed on the Patients Registry page.
 * Shows the currently focused row and gives both keyboard hints and 1-click triggers.
 */
export function PatientRegistryShortcutBar({
  selectedPatientName,
  selectedPatientId,
  onOpenChart,
  onQuickView,
  onQuickNote,
  onNewPatient,
  onRebalance,
  onOpenHelp,
}: {
  selectedPatientName?: string;
  selectedPatientId?: number;
  onOpenChart: () => void;
  onQuickView: () => void;
  onQuickNote: () => void;
  onNewPatient: () => void;
  onRebalance: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <div
      role="toolbar"
      aria-label="Patients registry keyboard workflow actions"
      className="bg-slate-950/90 border border-slate-800/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      <div className="flex items-center gap-2 text-slate-300">
        <Keyboard aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span className="font-semibold text-white">Rapid Clinical Keys:</span>
        {selectedPatientId ? (
          <span
            role="status"
            aria-live="polite"
            className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[11px]"
          >
            Target: {selectedPatientName} (#{selectedPatientId})
          </span>
        ) : (
          <span className="text-slate-400 text-[11px]">No patient row selected</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-indigo-300">j</kbd>
          <span>/</span>
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-indigo-300">k</kbd>
          <span>Row ↑↓</span>
        </span>

        <button
          type="button"
          onClick={onOpenChart}
          disabled={!selectedPatientId}
          aria-label={`Open full clinical chart for ${selectedPatientName || 'selected patient'} (Shortcut: Enter)`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-[11px] text-slate-200 transition-colors cursor-pointer"
        >
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-indigo-300 flex items-center">
            <CornerDownLeft aria-hidden="true" className="w-2.5 h-2.5" />
          </kbd>
          <span>Open Chart</span>
        </button>

        <button
          type="button"
          onClick={onQuickView}
          disabled={!selectedPatientId}
          aria-label={`Toggle quick view drawer for ${selectedPatientName || 'selected patient'} (Shortcut: q)`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-[11px] text-slate-200 transition-colors cursor-pointer"
        >
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-indigo-300">q</kbd>
          <span>Quick View</span>
        </button>

        <button
          type="button"
          onClick={onQuickNote}
          disabled={!selectedPatientId}
          aria-label={`Add clinical note for ${selectedPatientName || 'selected patient'} (Shortcut: n)`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 text-[11px] text-slate-200 transition-colors cursor-pointer"
        >
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-emerald-300">n</kbd>
          <span>+ Note</span>
        </button>

        <button
          type="button"
          onClick={onNewPatient}
          aria-label="Register new patient record (Shortcut: c)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 transition-colors cursor-pointer"
        >
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-indigo-300">c</kbd>
          <span>+ Patient</span>
        </button>

        <button
          type="button"
          onClick={onRebalance}
          aria-label="Auto-rebalance on-shift staff caseload (Shortcut: r)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-200 transition-colors cursor-pointer"
        >
          <kbd className="px-1 bg-slate-950 border border-slate-700 rounded font-mono text-amber-300">r</kbd>
          <span>Rebalance</span>
        </button>

        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="Open all keyboard shortcuts reference guide (Shortcut: ?)"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-[11px] text-indigo-300 font-semibold transition-colors cursor-pointer"
        >
          <kbd className="px-1 bg-slate-950 border border-indigo-500/40 rounded font-mono text-indigo-200">?</kbd>
          <span>All Keys</span>
        </button>
      </div>
    </div>
  );
}
