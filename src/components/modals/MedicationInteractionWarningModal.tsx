import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  X,
  ArrowRight,
  FileWarning,
  Stethoscope,
} from 'lucide-react';
import type {
  PrescriptionCrossReferenceResult,
  SafeAlternativeRecommendation,
} from '@/lib/medicationInteractionService';

interface MedicationInteractionWarningModalProps {
  isOpen: boolean;
  crossRefResult: PrescriptionCrossReferenceResult | null;
  onClose: () => void;
  onSelectSafeAlternative: (alternative: SafeAlternativeRecommendation) => void;
  onConfirmOverride: (overrideReason: string, attendingAttestation: string) => void;
}

const STANDARD_OVERRIDE_REASONS = [
  'Benefit outweighs risk — STAT 72h serum K+/Creatinine & ECG monitoring ordered',
  'Documented allergy verified as mild historical intolerance without IgE anaphylaxis',
  'Short-course inpatient administration under continuous telemetry observation',
  'Specialist cardiology / infectious disease consult directed therapy',
];

/**
 * Real-Time Adverse Drug Interaction & Allergy Warning Modal
 *
 * Displayed automatically when a clinician evaluates or attempts to prescribe
 * a medication that conflicts with active medications, documented allergies,
 * or CPIC pharmacogenomic markers.
 */
export default function MedicationInteractionWarningModal({
  isOpen,
  crossRefResult,
  onClose,
  onSelectSafeAlternative,
  onConfirmOverride,
}: MedicationInteractionWarningModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(STANDARD_OVERRIDE_REASONS[0]);
  const [customNote, setCustomNote] = useState<string>('');
  const [attested, setAttested] = useState<boolean>(false);
  const [showOverridePanel, setShowOverridePanel] = useState<boolean>(false);

  if (!isOpen || !crossRefResult || !crossRefResult.hasAdverseInteractions) {
    return null;
  }

  const isContraindicated = crossRefResult.highestSeverity === 'contraindicated';

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attested) return;
    const reasonText = customNote.trim()
      ? `${selectedReason} — Note: ${customNote.trim()}`
      : selectedReason;
    onConfirmOverride(
      reasonText,
      'Attending Physician Digital Attestation Verified (CDS High-Alert Override)'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rx-interaction-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-rose-500/40 shadow-2xl shadow-rose-950/50 text-slate-100">
        {/* Top High-Priority Alert Banner */}
        <div
          className={`px-6 py-5 border-b flex items-start justify-between gap-4 ${
            isContraindicated
              ? 'bg-rose-950/60 border-rose-500/40'
              : 'bg-amber-950/50 border-amber-500/40'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 ${
                isContraindicated
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              }`}
            >
              {isContraindicated ? (
                <AlertOctagon className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-rose-300">
                Real-Time Clinical Pharmacology Safety Intercept ·{' '}
                {crossRefResult.alerts.length} Conflict
                {crossRefResult.alerts.length > 1 ? 's' : ''} Detected
              </div>
              <h2
                id="rx-interaction-modal-title"
                className="text-lg sm:text-xl font-extrabold text-white mt-0.5"
              >
                {isContraindicated
                  ? 'Critical Contraindication: Adverse Drug / Allergy Conflict'
                  : 'Major Adverse Drug Interaction Warning'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Candidate Order:{' '}
                <strong className="text-white">{crossRefResult.candidateName}</strong> ·{' '}
                <span className="font-mono text-indigo-300">
                  {crossRefResult.candidateDosage}
                </span>{' '}
                · <span className="font-mono text-slate-400">{crossRefResult.candidateRxNorm}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close interaction warning modal"
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Screening Scope Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5">
            <span>
              Cross-referenced against{' '}
              <strong className="text-slate-200">
                {crossRefResult.screenedAgainstMedicationsCount} active medications
              </strong>{' '}
              ·{' '}
              <strong className="text-slate-200">
                {crossRefResult.screenedAgainstAllergiesCount} documented allergies
              </strong>{' '}
              · CPIC genotype profile
            </span>
            <span className="font-mono text-[11px] text-rose-300 uppercase font-bold">
              Severity: {crossRefResult.highestSeverity.toUpperCase()}
            </span>
          </div>

          {/* Individual Alert Cards */}
          <div className="space-y-4">
            {crossRefResult.alerts.map((alert) => {
              const isAlertCritical = alert.severity === 'contraindicated';
              const categoryLabel =
                alert.category === 'drug-allergy'
                  ? 'Drug–Allergy Contraindication'
                  : alert.category === 'drug-drug'
                  ? 'Drug–Drug Interaction'
                  : alert.category === 'duplicate-therapy'
                  ? 'Duplicate Therapy Alert'
                  : 'CPIC Pharmacogenomic / Renal Contraindication';

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 space-y-3 ${
                    isAlertCritical
                      ? 'bg-rose-950/25 border-rose-500/40'
                      : 'bg-amber-950/20 border-amber-500/40'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="text-xs font-mono font-bold uppercase tracking-wide text-rose-300">
                      {categoryLabel} · {alert.severity.toUpperCase()}
                    </div>
                    <div className="text-xs font-semibold text-amber-200">
                      Conflicting Factor: <span className="text-white">{alert.conflictingAgent}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {alert.clinicalSummary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
                      <div className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1">
                        Pathophysiological Mechanism
                      </div>
                      <p className="text-slate-300 leading-relaxed">{alert.mechanismOfAction}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90">
                      <div className="text-[11px] font-mono uppercase text-indigo-300 font-bold mb-1">
                        Clinical Management Protocol
                      </div>
                      <p className="text-slate-300 leading-relaxed">{alert.managementProtocol}</p>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400">
                    Reference: {alert.evidenceReference}
                  </div>

                  {/* Verified Safe Therapeutic Alternatives */}
                  {alert.safeAlternatives.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Recommended Conflict-Free Therapeutic Alternatives (1-Click Substitute)
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {alert.safeAlternatives.map((alt) => (
                          <div
                            key={`${alert.id}-${alt.medicationName}`}
                            className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="text-xs font-bold text-white">
                                {alt.medicationName} ·{' '}
                                <span className="text-emerald-300">{alt.dosage}</span> ·{' '}
                                <span className="font-mono text-[11px] text-slate-400">
                                  {alt.rxNorm}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mt-0.5">{alt.rationale}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectSafeAlternative(alt)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                            >
                              <span>Switch &amp; Prescribe Safe Alternative</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clinician Audited Override Section */}
          <div className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <FileWarning className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Attending Physician Clinical Override &amp; Audit Documentation</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOverridePanel((prev) => !prev)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                {showOverridePanel ? 'Hide Override Form' : 'Document Clinical Override'}
              </button>
            </div>

            {showOverridePanel && (
              <form onSubmit={handleOverrideSubmit} className="mt-4 space-y-3 pt-3 border-t border-slate-800">
                <div>
                  <label
                    htmlFor="rx-override-reason-select"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Select Clinical Justification for Overriding Contraindication
                  </label>
                  <select
                    id="rx-override-reason-select"
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {STANDARD_OVERRIDE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rx-override-custom-note"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Additional Monitoring &amp; Risk Mitigation Plan (Optional)
                  </label>
                  <input
                    id="rx-override-custom-note"
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="e.g., Baseline K+ 4.1 mEq/L verified; repeat BMP scheduled in 48 hours..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attested}
                    onChange={(e) => setAttested(e.target.checked)}
                    className="mt-0.5 rounded border-amber-500 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    I attest as the prescribing clinician that I have reviewed the active medication
                    regimen and allergy conflicts, counselled the patient/care team, and established
                    appropriate biomarker monitoring.
                  </span>
                </label>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!attested}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors ${
                      attested
                        ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Log Audited Override &amp; Submit Prescription</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Mandatory Medical Disclaimer */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-400">
            <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{crossRefResult.clinicalDisclaimer}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between gap-3 rounded-b-3xl">
          <span className="text-[11px] text-slate-400">
            Order blocked pending safe substitution or clinician attestation
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Cancel &amp; Hold Prescription Order
          </button>
        </div>
      </div>
    </div>
  );
}
