import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Siren,
  AlertTriangle,
  Activity,
  HeartPulse,
  ShieldAlert,
  CheckCircle2,
  ArrowUpRight,
  X,
  Zap,
  Droplets,
  Stethoscope,
  Clock,
  Lock,
} from 'lucide-react';
import {
  useGlobalEmergencyStore,
  type CriticalTraumaCaseRecord,
} from '@/lib/globalEmergencyService';
import { useAuthStore } from '@/lib/auth';
import { usePrivacyStore, maskPatientName, maskMrn } from '@/lib/privacy';

/**
 * Header button that triggers the system-wide Global Emergency alert
 * and immediately pulls up the most critical trauma patient records.
 */
export function GlobalEmergencyTriggerButton({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { user } = useAuthStore();
  const {
    isEmergencyActive,
    criticalCases,
    triggerGlobalEmergency,
    openEmergencyModal,
  } = useGlobalEmergencyStore();

  const handleClick = () => {
    if (isEmergencyActive) {
      openEmergencyModal();
    } else {
      triggerGlobalEmergency(
        user?.full_name || 'Dr. Sarah Chen, MD',
        user?.role || 'doctor'
      );
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        isEmergencyActive
          ? `Global Emergency Active: View ${criticalCases.length} critical trauma patient records`
          : 'Trigger Global Emergency alert and open critical trauma patient records (Alt+E)'
      }
      title="Global Emergency — Trigger system-wide trauma alert & pull critical records (Alt+E)"
      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
        isEmergencyActive
          ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-600/30 animate-pulse'
          : 'bg-rose-500/15 hover:bg-rose-600 hover:text-white border-rose-500/40 text-rose-300'
      }`}
    >
      <Siren aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
      <span className={compact ? 'hidden sm:inline' : ''}>
        {isEmergencyActive ? 'Trauma Alert Active' : 'Global Emergency'}
      </span>
    </button>
  );
}

/**
 * System-wide high-priority alert bar displayed across all routes while a Global Emergency is active.
 */
export function GlobalEmergencyBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isPrivacyMode } = usePrivacyStore();
  const {
    isEmergencyActive,
    emergencyCode,
    activatedBy,
    criticalCases,
    openEmergencyModal,
    selectCriticalCase,
    resolveGlobalEmergency,
  } = useGlobalEmergencyStore();

  if (!isEmergencyActive) return null;

  const unacknowledgedCount = criticalCases.filter((c) => !c.acknowledged).length;

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-label="System-Wide Global Emergency Trauma Alert Banner"
      className="w-full bg-rose-950/95 border-b border-rose-500/60 text-rose-100 px-4 sm:px-6 py-2.5 z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-white">
            <Siren aria-hidden="true" className="w-4 h-4 text-rose-400 animate-bounce" />
            <span>{emergencyCode}</span>
          </span>
          <span aria-hidden="true" className="text-rose-400/60">·</span>
          <span className="text-rose-200">
            Activated by <strong className="text-white">{activatedBy}</strong>
          </span>
          <span aria-hidden="true" className="text-rose-400/60">·</span>
          <span className="font-mono text-rose-200">
            {criticalCases.length} Critical Trauma Records Pulled ({unacknowledgedCount} Pending Sign-Off)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick-Jump Critical Patient Buttons */}
          {criticalCases.map((c) => {
            const ptName = maskPatientName(c.patientName, c.patientId, isPrivacyMode);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  selectCriticalCase(c.id);
                  openEmergencyModal();
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 border border-rose-500/40 text-white text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <HeartPulse aria-hidden="true" className="w-3 h-3 text-rose-300" />
                <span>{ptName}</span>
                <span className="font-mono text-rose-300">
                  ({c.vitals.heartRate} bpm · {c.vitals.bloodPressure})
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={openEmergencyModal}
            className="px-3 py-1 rounded-lg bg-white text-rose-950 hover:bg-rose-100 text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Open Trauma Command</span>
            <ArrowUpRight aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              navigate('/patients/43');
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-800/80 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Primary Resus Chart
          </button>

          <button
            type="button"
            onClick={() =>
              resolveGlobalEmergency(user?.full_name || 'Dr. Sarah Chen, MD')
            }
            className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-rose-500/40 text-rose-200 text-xs font-semibold cursor-pointer transition-colors"
          >
            Stand Down Alert
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full Critical Trauma Records Command Modal that automatically opens when
 * Global Emergency is triggered, surfacing the highest-acuity trauma patient records.
 */
export default function GlobalEmergencyModal() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isPrivacyMode } = usePrivacyStore();
  const {
    isEmergencyActive,
    modalOpen,
    emergencyCode,
    activatedAt,
    activatedBy,
    selectedCaseId,
    criticalCases,
    closeEmergencyModal,
    selectCriticalCase,
    acknowledgeTraumaCase,
    dispatchRapidTraumaOrder,
    resolveGlobalEmergency,
  } = useGlobalEmergencyStore();

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeEmergencyModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalOpen, closeEmergencyModal]);

  if (!modalOpen) return null;

  const activeCase: CriticalTraumaCaseRecord =
    criticalCases.find((c) => c.id === selectedCaseId) ?? criticalCases[0];

  const displayActiveName = maskPatientName(
    activeCase.patientName,
    activeCase.patientId,
    isPrivacyMode
  );
  const displayActiveMrn = maskMrn(
    activeCase.mrn,
    activeCase.patientId,
    isPrivacyMode
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-emergency-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div className="w-full max-w-6xl bg-slate-950 border-2 border-rose-500/60 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* High-Priority Crimson Command Header */}
        <div className="bg-gradient-to-r from-rose-950 via-rose-900/80 to-slate-950 border-b border-rose-500/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-rose-300 font-semibold">
              <Siren aria-hidden="true" className="w-4 h-4 text-rose-400" />
              <span>{emergencyCode}</span>
              <span aria-hidden="true" className="text-rose-500">·</span>
              <span>Triggered by {activatedBy}</span>
              {activatedAt && (
                <>
                  <span aria-hidden="true" className="text-rose-500">·</span>
                  <span className="font-mono inline-flex items-center gap-1">
                    <Clock aria-hidden="true" className="w-3 h-3" />
                    {new Date(activatedAt).toLocaleTimeString()}
                  </span>
                </>
              )}
            </div>
            <h2
              id="global-emergency-modal-title"
              className="text-xl font-extrabold text-white tracking-tight"
            >
              Active Trauma &amp; Critical Resuscitation Records Command
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isEmergencyActive && (
              <button
                type="button"
                onClick={() =>
                  resolveGlobalEmergency(user?.full_name || 'Dr. Sarah Chen, MD')
                }
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-rose-500/40 text-rose-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Stand Down Global Emergency
              </button>
            )}
            <button
              type="button"
              onClick={closeEmergencyModal}
              aria-label="Minimize Global Emergency Command Modal (Alert stays active in banner)"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Split View: Left Trauma Cohort Selector | Right Full Critical Record */}
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Ranked Critical Trauma Cases */}
          <div
            role="listbox"
            aria-label="Critical trauma patient records ranked by acuity"
            className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40 p-4 space-y-3"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-bold uppercase tracking-wider text-rose-300">
                Auto-Pulled Trauma Cohort ({criticalCases.length})
              </span>
              <span className="font-mono">Sorted by NEWS2</span>
            </div>

            {criticalCases.map((traumaCase) => {
              const isSelected = traumaCase.id === activeCase.id;
              const ptName = maskPatientName(
                traumaCase.patientName,
                traumaCase.patientId,
                isPrivacyMode
              );
              const ptMrn = maskMrn(
                traumaCase.mrn,
                traumaCase.patientId,
                isPrivacyMode
              );

              return (
                <button
                  key={traumaCase.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectCriticalCase(traumaCase.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-rose-950/45 border-rose-500 text-white shadow-md'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-semibold text-rose-400">
                        {traumaCase.traumaLevel}
                      </div>
                      <div className="text-sm font-bold text-white flex items-center gap-1.5 mt-0.5">
                        {isPrivacyMode && (
                          <Lock aria-hidden="true" className="w-3 h-3 text-amber-400" />
                        )}
                        <span>{ptName}</span>
                        <span className="text-xs font-normal text-slate-400">
                          ({traumaCase.ageSex})
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-300">
                      NEWS2: {traumaCase.news2Score}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="font-mono text-indigo-300">{ptMrn}</span>
                    <span aria-hidden="true">·</span>
                    <span>{traumaCase.bayLocation}</span>
                  </div>

                  {/* Compact Live Vitals Strip */}
                  <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                    <div className="bg-slate-900/90 rounded px-2 py-1">
                      <span className="text-slate-400 block text-[9px]">HR</span>
                      <span className="text-rose-300 font-bold">
                        {traumaCase.vitals.heartRate} bpm
                      </span>
                    </div>
                    <div className="bg-slate-900/90 rounded px-2 py-1">
                      <span className="text-slate-400 block text-[9px]">BP (MAP)</span>
                      <span className="text-amber-300 font-bold">
                        {traumaCase.vitals.bloodPressure} ({traumaCase.vitals.map})
                      </span>
                    </div>
                    <div className="bg-slate-900/90 rounded px-2 py-1">
                      <span className="text-slate-400 block text-[9px]">SpO2</span>
                      <span className="text-sky-300 font-bold">
                        {traumaCase.vitals.spO2}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Trauma Record Detail & Rapid STAT Order Execution */}
          <div className="lg:col-span-8 p-6 space-y-5">
            {/* Patient Identifier & Immediate Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono text-rose-400 font-bold">
                    {activeCase.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-white font-semibold">
                    {activeCase.bayLocation}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Lead: {activeCase.attendingLead}</span>
                </div>

                <h3 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  <span>{displayActiveName}</span>
                  <span className="text-sm font-mono font-normal text-indigo-300">
                    {displayActiveMrn}
                  </span>
                </h3>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-0.5">
                  <span className="inline-flex items-center gap-1 text-rose-300 font-semibold">
                    <Droplets aria-hidden="true" className="w-3.5 h-3.5" />
                    Blood: {activeCase.bloodType}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-amber-300 font-medium">
                    Allergies: {activeCase.allergies}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono text-slate-300">
                    Shock Index: {activeCase.shockIndex.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {!activeCase.acknowledged ? (
                  <button
                    type="button"
                    onClick={() =>
                      acknowledgeTraumaCase(
                        activeCase.id,
                        user?.full_name || 'Dr. Sarah Chen, MD'
                      )
                    }
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Acknowledge Trauma Record</span>
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                    <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>Acknowledged by {activeCase.acknowledgedBy}</span>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    closeEmergencyModal();
                    navigate(`/patients/${activeCase.patientId}`);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span>Open Full Patient Chart</span>
                  <ArrowUpRight aria-hidden="true" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Real-Time Resuscitation Vitals Telemetry Strip */}
            <div
              role="group"
              aria-label="Real-time trauma resuscitation vital signs"
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5"
            >
              <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Heart Rate
                </span>
                <span className="text-lg font-extrabold text-rose-400 font-mono">
                  {activeCase.vitals.heartRate} bpm
                </span>
              </div>
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  BP / MAP
                </span>
                <span className="text-lg font-extrabold text-amber-300 font-mono">
                  {activeCase.vitals.bloodPressure}{' '}
                  <span className="text-xs font-normal">({activeCase.vitals.map})</span>
                </span>
              </div>
              <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  SpO2 Saturation
                </span>
                <span className="text-lg font-extrabold text-sky-300 font-mono">
                  {activeCase.vitals.spO2}%
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Resp Rate
                </span>
                <span className="text-lg font-extrabold text-white font-mono">
                  {activeCase.vitals.respiratoryRate}/min
                </span>
              </div>
              <div className="bg-slate-900/90 border border-rose-500/30 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Arterial Lactate
                </span>
                <span className="text-lg font-extrabold text-rose-300 font-mono">
                  {activeCase.vitals.lactateMmol} mmol/L
                </span>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  GCS Neuro
                </span>
                <span className="text-sm font-extrabold text-white font-mono mt-1 block">
                  {activeCase.vitals.gcsScore}
                </span>
              </div>
            </div>

            {/* Mechanism, Primary Survey & Active Airway/Access */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="font-bold text-rose-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Mechanism &amp; Acute Presentation</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {activeCase.mechanismAndChiefComplaint}
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                <div className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Stethoscope aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Primary Survey &amp; eFAST Findings</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {activeCase.primaryAssessment}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="text-slate-400 font-semibold">
                Active Airway &amp; Vascular Access:
              </span>
              <span className="text-slate-200 font-mono">
                {activeCase.activeLinesAndAirway}
              </span>
            </div>

            {/* 1-Click STAT Trauma & Resuscitation Order Bundles */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Zap aria-hidden="true" className="w-4 h-4 text-amber-400" />
                  <span>1-Click STAT Trauma &amp; Resuscitation Order Bundles</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  Orders log directly to patient chart &amp; HIPAA audit trail
                </span>
              </div>

              <div className="space-y-2">
                {activeCase.statOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-semibold">
                        <Activity aria-hidden="true" className="w-3 h-3" />
                        <span>{ord.category}</span>
                      </div>
                      <div className="font-semibold text-white">{ord.label}</div>
                      {ord.dispatched && (
                        <div className="text-[11px] font-mono text-emerald-400">
                          Dispatched by {ord.dispatchedBy} at{' '}
                          {ord.dispatchedAt
                            ? new Date(ord.dispatchedAt).toLocaleTimeString()
                            : 'now'}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={ord.dispatched}
                      onClick={() =>
                        dispatchRapidTraumaOrder(
                          activeCase.id,
                          ord.id,
                          user?.full_name || 'Dr. Sarah Chen, MD'
                        )
                      }
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                        ord.dispatched
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-sm'
                      }`}
                    >
                      {ord.dispatched ? 'STAT Order Dispatched' : 'Dispatch STAT Order'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Disclaimer */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldAlert aria-hidden="true" className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Medical Disclaimer: Automated trauma triage and STAT order bundles assist emergency clinical workflows; verify all medication dosages, crossmatch compatibility, and interventions with the bedside attending physician.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
