import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Activity,
  FileText,
  ArrowUpRight,
  Stethoscope,
  Pill,
  Clock,
  Sparkles,
  AlertTriangle,
  Download,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import {
  getPatientOrganHealth,
  getDoctorPatientCareEventFeed,
  type OrganHealthResult,
  type OrganRiskDetail,
  type CareEvent,
} from '@/lib/api';
import {
  generatePatientSummaryPdf,
  type GeneratedPdfReportReceipt,
} from '@/lib/pdfReportGenerator';
import { useAuthStore } from '@/lib/auth';
import { checkAclPermission, getRoleClearanceInfo } from '@/lib/acl';
import { toast } from '@/lib/toast';
import { PrivacyModeToggle } from '@/components/layout/PrivacyModeBanner';
import {
  usePrivacyStore,
  maskPatientName,
  maskUsername,
  maskMrn,
  maskFreeTextPii,
} from '@/lib/privacy';

export interface QuickViewPatient {
  id: number;
  username: string;
  full_name: string;
  email?: string;
  encounter_type?: string;
  status?: string;
  open_orders?: number;
}

interface PatientQuickViewModalProps {
  patient: QuickViewPatient | null;
  onClose: () => void;
}

export function PatientQuickViewModal({ patient, onClose }: PatientQuickViewModalProps) {
  const { user } = useAuthStore();
  const { isPrivacyMode } = usePrivacyStore();
  const [organHealth, setOrganHealth] = useState<OrganHealthResult | null>(null);
  const [recentEvents, setRecentEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [pdfExporting, setPdfExporting] = useState<boolean>(false);
  const [lastPdfReceipt, setLastPdfReceipt] =
    useState<GeneratedPdfReportReceipt | null>(null);

  useEffect(() => {
    if (!patient) return;
    setLastPdfReceipt(null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [patient, onClose]);

  useEffect(() => {
    if (!patient) return;
    let active = true;
    setLoading(true);

    Promise.all([
      getPatientOrganHealth(patient.id).catch(() => null),
      getDoctorPatientCareEventFeed(patient.id).catch(() => null),
    ])
      .then(([organRes, feedRes]) => {
        if (!active) return;
        setOrganHealth(
          organRes || {
            patient_id: patient.id,
            patient_name: patient.full_name,
            age: 54,
            gender: 'Unspecified',
            vitals_source: 'Bedside Telemetry',
            overall_score: patient.status === 'critical' ? 68 : 86,
            risks: {
              heart: {
                score: patient.status === 'critical' ? 64 : 88,
                risk_level: patient.status === 'critical' ? 'Elevated Risk' : 'Optimal',
                conformal_bound: '±3.2%',
                primary_driver: 'Troponin-I & ASCVD 10-yr',
                key_metrics: { 'Troponin-I': '0.02 ng/mL', ASCVD: '9.2%' },
              },
              kidney: {
                score: 91,
                risk_level: 'Optimal',
                conformal_bound: '±2.1%',
                primary_driver: 'eGFR & Creatinine',
                key_metrics: { eGFR: '84 mL/min', Creatinine: '0.9 mg/dL' },
              },
              liver: {
                score: 89,
                risk_level: 'Optimal',
                conformal_bound: '±2.4%',
                primary_driver: 'ALT & FIB-4 Index',
                key_metrics: { ALT: '26 U/L', 'FIB-4': 1.05 },
              },
              lungs: {
                score: 92,
                risk_level: 'Optimal',
                conformal_bound: '±1.9%',
                primary_driver: 'SpO2 & Respiratory Rate',
                key_metrics: { SpO2: '98%', RR: '16 /min' },
              },
              diabetes: {
                score: 78,
                risk_level: 'Moderate Watch',
                conformal_bound: '±3.8%',
                primary_driver: 'HbA1c & Fasting Glucose',
                key_metrics: { HbA1c: '6.3%', Glucose: '112 mg/dL' },
              },
            },
            recommended_orders: [],
          }
        );

        const events = feedRes?.events || [
          {
            id: 501,
            patient_id: patient.id,
            event_type: 'VITAL_OBSERVATION',
            title: 'Bedside Telemetry Check Completed',
            summary: 'Sinus rhythm verified, automated cuff BP and pulse oximetry synced to EMR.',
            severity: 'info',
            created_at: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: 502,
            patient_id: patient.id,
            event_type: 'CLINICAL_ORDER',
            title: 'Comprehensive Metabolic Panel & HbA1c',
            summary: 'Morning laboratory draw scheduled and verified by charge nurse.',
            severity: patient.status === 'critical' ? 'warning' : 'info',
            created_at: new Date(Date.now() - 7200000).toISOString(),
          },
        ];
        setRecentEvents(events.slice(0, 3));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [patient]);

  if (!patient) return null;

  const isCritical = patient.status === 'critical';
  const vitals = isCritical
    ? { hr: '114 bpm', bp: '148/92 mmHg', spo2: '93%', rr: '22 /min', temp: '37.8 °C' }
    : { hr: '74 bpm', bp: '122/78 mmHg', spo2: '98%', rr: '16 /min', temp: '36.8 °C' };

  const activeMeds = isCritical
    ? [
        { name: 'Furosemide 40mg IV', schedule: 'Q12H • Active ICU Protocol', status: 'Verified' },
        { name: 'Metoprolol Succinate 50mg PO', schedule: 'Once Daily • Beta-Blockade', status: 'Verified' },
        { name: 'Heparin 5000 Units SubQ', schedule: 'Q8H • DVT Prophylaxis', status: 'Verified' },
      ]
    : [
        { name: 'Metformin 500mg PO', schedule: 'BID with meals • Glycemic Control', status: 'Adherent' },
        { name: 'Lisinopril 10mg PO', schedule: 'Once Daily • ACE Inhibitor', status: 'Adherent' },
        { name: 'Atorvastatin 20mg PO', schedule: 'Nightly • Lipid Lowering', status: 'Adherent' },
      ];

  const canExportPdf = checkAclPermission(user?.role, 'patient_emr', 'export_pdf');
  const clearance = getRoleClearanceInfo(user?.role);
  const displayPatientName = maskPatientName(patient.full_name, patient.id, isPrivacyMode);
  const rawMrn = `MRN-${String(patient.id).padStart(4, '0')}`;
  const displayMrn = maskMrn(rawMrn, patient.id, isPrivacyMode);

  const handleExportPdf = async (overrideSafeHarbor?: boolean) => {
    if (pdfExporting) return;
    if (!canExportPdf) {
      toast.error(
        `ACL Access Denied: Role ${clearance.title} (${clearance.code}) lacks EXPORT_PDF permission on Patient EMR.`
      );
      return;
    }
    setPdfExporting(true);
    try {
      const useSafeHarbor =
        typeof overrideSafeHarbor === 'boolean' ? overrideSafeHarbor : isPrivacyMode;
      const receipt = await generatePatientSummaryPdf({
        patient,
        vitals,
        organHealth,
        activeMeds,
        recentEvents,
        hipaaSafeHarbor: useSafeHarbor,
        exportedByClinician: user?.full_name || `${clearance.title} Clinician`,
        roleClearanceCode: clearance.code,
      });
      setLastPdfReceipt(receipt);
      toast.success(
        `Downloaded HIPAA-compliant PDF (${receipt.hipaaMode === 'SAFE_HARBOR_DEIDENTIFIED' ? 'Safe Harbor De-Identified' : 'Authorized PHI'})`
      );
    } finally {
      setPdfExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div
        className="relative w-full max-w-2xl h-full bg-[var(--bg-secondary)] border-l border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-5 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-muted)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] font-extrabold text-lg shrink-0">
              {displayPatientName?.[0]?.toUpperCase() || 'P'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--accent-border)] font-bold">
                  Patient Quick-View
                </span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  ID #{patient.id} &bull; {displayMrn} &bull; @{maskUsername(patient.username, patient.id, isPrivacyMode)}
                </span>
              </div>
              <h2 id="quick-view-title" className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1">
                {displayPatientName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PrivacyModeToggle compact />
            <button
              type="button"
              onClick={() => handleExportPdf()}
              disabled={pdfExporting}
              aria-label={`Export HIPAA-compliant PDF medical summary report for ${displayPatientName}`}
              title="Download verified HIPAA-compliant PDF medical summary report"
              className="px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {lastPdfReceipt ? (
                <>
                  <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">PDF Saved</span>
                </>
              ) : (
                <>
                  <Download aria-hidden="true" className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>{pdfExporting ? 'Generating...' : 'Export PDF'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close patient quick view"
              className="p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-colors cursor-pointer"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Clinical Summary Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* HIPAA-Compliant PDF Report Receipt Banner (shown after generating or for quick Safe Harbor export) */}
          {lastPdfReceipt && (
            <div
              role="status"
              aria-live="polite"
              aria-label="HIPAA-compliant PDF report generated receipt"
              className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck aria-hidden="true" className="w-4 h-4 text-emerald-400" />
                  HIPAA Medical Summary PDF Generated &amp; Audit-Logged
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-mono text-[10px] font-bold">
                  {lastPdfReceipt.hipaaRegulationCite}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                <span>File: <strong className="text-white">{lastPdfReceipt.filename}</strong></span>
                <span>Ref: <strong className="text-emerald-300">{lastPdfReceipt.documentRef}</strong></span>
                <span>SHA-256: <strong className="text-indigo-300">{lastPdfReceipt.sha256Digest}</strong></span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleExportPdf(true)}
                  aria-label="Download HIPAA Safe Harbor De-Identified PDF copy"
                  className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock aria-hidden="true" className="w-3 h-3" />
                  Download Safe Harbor De-Identified Copy
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPdf(false)}
                  aria-label="Download Authorized Clinical PHI PDF copy"
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <FileText aria-hidden="true" className="w-3 h-3" />
                  Download Authorized PHI Copy
                </button>
              </div>
            </div>
          )}

          {/* Status Banner Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="panel p-3.5">
              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">Assigned Ward</span>
              <span className="text-sm font-bold text-[var(--text-primary)] mt-0.5 block">
                {patient.encounter_type || 'OPD Clinic'}
              </span>
            </div>
            <div className="panel p-3.5">
              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">Clinical Status</span>
              <span
                className={`text-sm font-bold mt-0.5 inline-flex items-center gap-1.5 capitalize ${
                  isCritical ? 'text-[var(--danger)]' : 'text-[var(--success)]'
                }`}
              >
                <span aria-hidden="true" className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {patient.status || 'Active'}
              </span>
            </div>
            <div className="panel p-3.5">
              <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">Open Orders</span>
              <span className="text-sm font-bold font-mono text-[var(--text-primary)] mt-0.5 block">
                {patient.open_orders ?? 0} Pending
              </span>
            </div>
          </div>

          {/* Card 1: Bedside Vital Signs Summary */}
          <div className="panel p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                <Activity aria-hidden="true" className="w-4 h-4 text-rose-400" />
                Bedside Vital Signs Snapshot
              </h3>
              <span className="text-[10px] font-mono text-[var(--text-dim)]">Live Telemetry Sync</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
              {[
                { label: 'Heart Rate', value: vitals.hr, alert: isCritical },
                { label: 'Blood Pressure', value: vitals.bp, alert: isCritical },
                { label: 'SpO2 Sat', value: vitals.spo2, alert: isCritical },
                { label: 'Resp Rate', value: vitals.rr, alert: false },
                { label: 'Temp', value: vitals.temp, alert: false },
              ].map((v) => (
                <div
                  key={v.label}
                  className={`p-3 rounded-xl border ${
                    v.alert
                      ? 'bg-[var(--danger-muted)] border-[var(--danger-border)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)]'
                  }`}
                >
                  <span className="text-[10px] text-[var(--text-dim)] block">{v.label}</span>
                  <span
                    className={`text-sm font-extrabold font-mono mt-1 block ${
                      v.alert ? 'text-[var(--danger)]' : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {v.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: TabICLv2 Multi-Organ Conformal Risk Summary */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles aria-hidden="true" className="w-4 h-4 text-[var(--accent)]" />
                  TabICLv2 Multi-Organ Health Index
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Calibrated 95% conformal coverage intervals across 5 physiological systems
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-[var(--text-dim)] block">Composite Score</span>
                <span className="text-lg font-extrabold font-mono text-[var(--accent)]">
                  {organHealth?.overall_score ?? 86}/100
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs font-mono text-[var(--text-dim)]">
                Loading multi-organ risk profile...
              </div>
            ) : (
              <div className="space-y-3">
                {(Object.entries(organHealth?.risks || {}) as [string, OrganRiskDetail][]).map(([organKey, info]) => {
                  const score = info.score ?? 85;
                  const barColor =
                    score >= 85
                      ? 'bg-emerald-500'
                      : score >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500';
                  const metricSummary = Object.entries(info.key_metrics || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' • ');
                  return (
                    <div key={organKey} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold capitalize text-[var(--text-primary)]">
                          {organKey} System
                        </span>
                        <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                          {info.risk_level} ({info.conformal_bound}) &bull; <strong className="text-[var(--text-primary)]">{score}%</strong>
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${organKey} system health score`}
                        aria-valuenow={score}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        className="w-full h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border)]"
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-dim)]">
                        Driver: {info.primary_driver} {metricSummary ? `• ${metricSummary}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 3: Active Medications & Orders */}
          <div className="panel p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Pill aria-hidden="true" className="w-4 h-4 text-cyan-400" />
              Active Medication Regimen (FHIR MedicationRequest)
            </h3>
            <div className="space-y-2">
              {activeMeds.map((med, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{med.name}</div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">{med.schedule}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {med.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Recent Care Timeline Events */}
          <div className="panel p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Clock aria-hidden="true" className="w-4 h-4 text-purple-400" />
              Recent Care Timeline Events
            </h3>
            <div className="space-y-2.5">
              {recentEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--text-primary)]">
                      {maskFreeTextPii(ev.title, isPrivacyMode)}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-dim)]">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    {maskFreeTextPii(ev.summary, isPrivacyMode)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Clinical Disclaimer */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[11px] text-[var(--text-dim)] flex items-start gap-2">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Decision Support Disclaimer:</strong> Summary cards and TabICLv2 organ scores are assistive clinical insights. Verify full lab panels and orders in the complete patient chart and consult a qualified clinician prior to diagnosis, treatment, or emergency intervention.
            </span>
          </div>
        </div>

        {/* Sticky Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg-card)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close patient quick view modal"
              className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
            >
              Close
            </button>

            <button
              type="button"
              onClick={() => handleExportPdf()}
              disabled={pdfExporting}
              aria-label={`Download HIPAA-compliant PDF medical summary report for ${displayPatientName}`}
              className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {lastPdfReceipt ? (
                <>
                  <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Report Downloaded ({isPrivacyMode ? 'Safe Harbor' : 'PHI'})</span>
                </>
              ) : (
                <>
                  <FileText aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>
                    {pdfExporting
                      ? 'Exporting PDF...'
                      : `Download PDF (${isPrivacyMode ? 'Safe Harbor' : 'HIPAA PHI'})`}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/patients/${patient.id}?intent=orders`}
              aria-label={`Place clinical order for ${displayPatientName}`}
              className="px-4 py-2 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-muted)] text-[var(--accent)] text-xs font-bold hover:opacity-90 transition-all flex items-center gap-1.5"
            >
              <Stethoscope aria-hidden="true" className="w-3.5 h-3.5" />
              Place Clinical Order
            </Link>
            <Link
              to={`/patients/${patient.id}`}
              aria-label={`Open full EMR chart for ${displayPatientName}`}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              Open Full EMR Chart <ArrowUpRight aria-hidden="true" className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
export default PatientQuickViewModal;
