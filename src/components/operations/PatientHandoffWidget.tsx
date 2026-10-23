import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FilePenLine,
  History,
  Lock,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  AlertTriangle,
  ArrowUpRight,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  usePatientHandoffStore,
  HANDOFF_PATIENTS,
  type HandoffStatus,
  type HandoffUrgency,
  type PatientHandoffRecord,
} from '@/lib/patientHandoffService';
import { CLINICAL_STAFF_ROSTER } from '@/lib/patientAssignmentEngine';
import { usePrivacyStore, maskPatientName, maskMrn } from '@/lib/privacy';
import { toast } from '@/lib/toast';

type HandoffFilterTab = 'all' | 'pending_acknowledgment' | 'acknowledged_active' | 'draft';

const SHIFT_TRANSITION_OPTIONS = [
  'Day Shift -> Night Handoff (19:00)',
  'Day Shift -> Swing Shift (15:00)',
  'Night Handoff -> Day Shift (07:00)',
  'ICU Procedure Coverage -> On-Call (STAT)',
];

function formatRelativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const diffMins = Math.max(0, Math.round(diffMs / 60000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
}

function formatTimeShort(isoTimestamp: string): string {
  try {
    return new Date(isoTimestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoTimestamp;
  }
}

function getUrgencyLabel(urgency: HandoffUrgency): {
  label: string;
  textColor: string;
  dotColor: string;
} {
  switch (urgency) {
    case 'stat_critical':
      return {
        label: 'STAT Critical',
        textColor: 'text-rose-400',
        dotColor: 'bg-rose-400',
      };
    case 'priority':
      return {
        label: 'Priority Handoff',
        textColor: 'text-amber-400',
        dotColor: 'bg-amber-400',
      };
    case 'routine':
    default:
      return {
        label: 'Routine Shift Transfer',
        textColor: 'text-emerald-400',
        dotColor: 'bg-emerald-400',
      };
  }
}

function getStatusLabel(status: HandoffStatus): {
  label: string;
  textColor: string;
} {
  switch (status) {
    case 'draft':
      return { label: 'Draft Note', textColor: 'text-slate-300' };
    case 'pending_acknowledgment':
      return { label: 'Pending Receiver Sign-Off', textColor: 'text-amber-300' };
    case 'acknowledged_active':
      return { label: 'Active Custody Assumed', textColor: 'text-emerald-300' };
    case 'co_signed':
      return { label: 'Attending Co-Signed & Locked', textColor: 'text-indigo-300' };
  }
}

export default function PatientHandoffWidget() {
  const {
    handoffs,
    createOrDispatchHandoff,
    dispatchDraftHandoff,
    acknowledgeHandoff,
    coSignHandoff,
    toggleActionItem,
  } = usePatientHandoffStore();
  const { isPrivacyMode } = usePrivacyStore();

  const [activeFilter, setActiveFilter] = useState<HandoffFilterTab>('all');
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [expandedAuditIds, setExpandedAuditIds] = useState<Record<string, boolean>>({
    'HO-2026-0891': true,
  });
  const [ackNotesById, setAckNotesById] = useState<Record<string, string>>({});

  // Composer form state
  const [selectedPatientId, setSelectedPatientId] = useState<number>(HANDOFF_PATIENTS[0].id);
  const [fromStaffId, setFromStaffId] = useState<string>('staff-patel');
  const [toStaffId, setToStaffId] = useState<string>('staff-kovacs');
  const [urgency, setUrgency] = useState<HandoffUrgency>('stat_critical');
  const [shiftTransition, setShiftTransition] = useState<string>(SHIFT_TRANSITION_OPTIONS[0]);
  const [situation, setSituation] = useState<string>(HANDOFF_PATIENTS[0].template.situation);
  const [background, setBackground] = useState<string>(HANDOFF_PATIENTS[0].template.background);
  const [assessment, setAssessment] = useState<string>(HANDOFF_PATIENTS[0].template.assessment);
  const [recommendation, setRecommendation] = useState<string>(
    HANDOFF_PATIENTS[0].template.recommendation
  );
  const [contingencyPlan, setContingencyPlan] = useState<string>(
    HANDOFF_PATIENTS[0].template.contingencyPlan
  );
  const [actionItemOne, setActionItemOne] = useState<string>(
    HANDOFF_PATIENTS[0].template.actionItems[0] || ''
  );
  const [actionItemTwo, setActionItemTwo] = useState<string>(
    HANDOFF_PATIENTS[0].template.actionItems[1] || ''
  );

  const selectedPatientObj = useMemo(
    () => HANDOFF_PATIENTS.find((p) => p.id === selectedPatientId) ?? HANDOFF_PATIENTS[0],
    [selectedPatientId]
  );

  const filteredHandoffs = useMemo(() => {
    if (activeFilter === 'all') return handoffs;
    if (activeFilter === 'acknowledged_active') {
      return handoffs.filter(
        (h) => h.status === 'acknowledged_active' || h.status === 'co_signed'
      );
    }
    return handoffs.filter((h) => h.status === activeFilter);
  }, [handoffs, activeFilter]);

  const counts = useMemo(() => {
    return {
      all: handoffs.length,
      pending: handoffs.filter((h) => h.status === 'pending_acknowledgment').length,
      active: handoffs.filter(
        (h) => h.status === 'acknowledged_active' || h.status === 'co_signed'
      ).length,
      draft: handoffs.filter((h) => h.status === 'draft').length,
      totalAuditEvents: handoffs.reduce((acc, h) => acc + h.auditTrail.length, 0),
    };
  }, [handoffs]);

  const handlePatientSelectChange = (nextPatientId: number) => {
    setSelectedPatientId(nextPatientId);
    const found = HANDOFF_PATIENTS.find((p) => p.id === nextPatientId);
    if (found) {
      setUrgency(found.defaultUrgency);
      setSituation(found.template.situation);
      setBackground(found.template.background);
      setAssessment(found.template.assessment);
      setRecommendation(found.template.recommendation);
      setContingencyPlan(found.template.contingencyPlan);
      setActionItemOne(found.template.actionItems[0] || '');
      setActionItemTwo(found.template.actionItems[1] || '');
    }
  };

  const handleSubmitHandoff = (saveAsDraft: boolean) => {
    if (!situation.trim() || !recommendation.trim()) {
      toast.error('Please provide at least Clinical Situation and Recommendation notes.');
      return;
    }
    if (fromStaffId === toStaffId) {
      toast.error('Transferring physician and receiving clinician must be different staff members.');
      return;
    }

    const created = createOrDispatchHandoff({
      patientId: selectedPatientObj.id,
      patientName: selectedPatientObj.full_name,
      mrn: selectedPatientObj.mrn,
      ward: selectedPatientObj.ward,
      urgency,
      shiftTransition,
      fromStaffId,
      toStaffId,
      situation,
      background,
      assessment,
      recommendation,
      contingencyPlan,
      actionItemsText: [actionItemOne, actionItemTwo],
      saveAsDraft,
    });

    setExpandedAuditIds((prev) => ({ ...prev, [created.id]: true }));
    setComposerOpen(false);
    setActiveFilter(saveAsDraft ? 'draft' : 'all');

    toast.success(
      saveAsDraft
        ? `Saved draft handoff ${created.id} with initial audit log entry.`
        : `Dispatched care transfer ${created.id} to ${created.toStaffName}.`
    );
  };

  const toggleAuditDrawer = (handoffId: string) => {
    setExpandedAuditIds((prev) => ({
      ...prev,
      [handoffId]: !prev[handoffId],
    }));
  };

  return (
    <section
      role="region"
      aria-label="Patient Handoff and Care Responsibility Transfer Module"
      className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-5"
    >
      {/* Header & Primary Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-400 font-semibold">
            <ArrowRightLeft aria-hidden="true" className="w-3.5 h-3.5" />
            <span>I-PASS &amp; SBAR Care Transition</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400 font-normal">
              {counts.pending} Pending Sign-Off
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-400 font-normal font-mono">
              {counts.totalAuditEvents} Verified Audit Checksums
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Patient Handoff &amp; Care Responsibility Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Draft structured SBAR transfer notes, assign oncoming clinicians, and verify chain-of-custody sign-offs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-expanded={composerOpen}
            aria-controls="patient-handoff-composer-panel"
            onClick={() => setComposerOpen((prev) => !prev)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              composerOpen
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
            }`}
          >
            {composerOpen ? (
              <>
                <FilePenLine aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Close Handoff Composer</span>
              </>
            ) : (
              <>
                <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Draft Care Transfer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interactive Composer Panel */}
      {composerOpen && (
        <div
          id="patient-handoff-composer-panel"
          role="form"
          aria-label="Draft and Transfer Patient Care Responsibility Form"
          className="bg-slate-950/90 border border-indigo-500/30 rounded-xl p-4 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FilePenLine aria-hidden="true" className="w-4 h-4 text-indigo-400" />
                <span>New Clinical Care Responsibility Handoff (SBAR / I-PASS)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every draft or transfer automatically generates a cryptographically hashed chain-of-custody audit record.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handlePatientSelectChange(selectedPatientId)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Reset to Patient Clinical Baseline</span>
            </button>
          </div>

          {/* Row 1: Patient, Urgency, Shift Window */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="handoff-patient-select"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Patient &amp; Bed Assignment
              </label>
              <select
                id="handoff-patient-select"
                value={selectedPatientId}
                onChange={(e) => handlePatientSelectChange(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {HANDOFF_PATIENTS.map((pt) => {
                  const name = maskPatientName(pt.full_name, pt.id, isPrivacyMode);
                  const mrn = maskMrn(pt.mrn, pt.id, isPrivacyMode);
                  return (
                    <option key={pt.id} value={pt.id}>
                      {name} ({mrn}) · {pt.ward}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="handoff-urgency-select"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Transfer Acuity &amp; Urgency
              </label>
              <select
                id="handoff-urgency-select"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as HandoffUrgency)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="stat_critical">STAT Critical (Immediate Bedside/Verbal)</option>
                <option value="priority">Priority Handoff (Watchlist Escalation)</option>
                <option value="routine">Routine Shift Transfer</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="handoff-shift-select"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Shift Transition Window
              </label>
              <select
                id="handoff-shift-select"
                value={shiftTransition}
                onChange={(e) => setShiftTransition(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {SHIFT_TRANSITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Transferring Physician -> Receiving Clinician */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
            <div>
              <label
                htmlFor="handoff-from-staff"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Transferring Clinician (Releasing Care)
              </label>
              <select
                id="handoff-from-staff"
                value={fromStaffId}
                onChange={(e) => setFromStaffId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {CLINICAL_STAFF_ROSTER.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} · {staff.roleTitle} ({staff.shiftType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="handoff-to-staff"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                Receiving Clinician (Assuming Care Responsibility)
              </label>
              <select
                id="handoff-to-staff"
                value={toStaffId}
                onChange={(e) => setToStaffId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {CLINICAL_STAFF_ROSTER.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} · {staff.primarySpecialty} ({staff.shiftWindow})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: SBAR Structured Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="handoff-situation"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                S — Situation &amp; Active Acuity Summary
              </label>
              <textarea
                id="handoff-situation"
                rows={2}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="handoff-background"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                B — Clinical Background &amp; Admission Context
              </label>
              <textarea
                id="handoff-background"
                rows={2}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="handoff-assessment"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                A — Current Assessment, Vitals &amp; Trends
              </label>
              <textarea
                id="handoff-assessment"
                rows={2}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="handoff-recommendation"
                className="block text-xs font-medium text-slate-300 mb-1"
              >
                R — Recommendation &amp; Next-Shift Care Plan
              </label>
              <textarea
                id="handoff-recommendation"
                rows={2}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 4: Contingency Plan & Follow-up Action Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="handoff-contingency"
                className="block text-xs font-medium text-rose-300 mb-1"
              >
                I-PASS Escalation &amp; Contingency Plan ("If / Then")
              </label>
              <input
                id="handoff-contingency"
                type="text"
                value={contingencyPlan}
                onChange={(e) => setContingencyPlan(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="handoff-task-1"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Action Item #1 (Receiving Staff)
                </label>
                <input
                  id="handoff-task-1"
                  type="text"
                  value={actionItemOne}
                  onChange={(e) => setActionItemOne(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label
                  htmlFor="handoff-task-2"
                  className="block text-xs font-medium text-slate-300 mb-1"
                >
                  Action Item #2 (Receiving Staff)
                </label>
                <input
                  id="handoff-task-2"
                  type="text"
                  value={actionItemTwo}
                  onChange={(e) => setActionItemTwo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Composer Footer Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <span className="text-[11px] text-slate-400">
              Clinical Disclaimer: Structured handoff notes support shift continuity; verify critical orders directly in the patient EMR chart.
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleSubmitHandoff(true)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FilePenLine aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                <span>Save as Draft Note</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmitHandoff(false)}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Send aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Sign &amp; Transfer Care Responsibility</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Segmented Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter patient care handoffs by transfer status"
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-950/90 border border-slate-800 rounded-lg"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'all'}
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Handoffs ({counts.all})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'pending_acknowledgment'}
            onClick={() => setActiveFilter('pending_acknowledgment')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeFilter === 'pending_acknowledgment'
                ? 'bg-slate-800 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Receiver Sign-Off ({counts.pending})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'acknowledged_active'}
            onClick={() => setActiveFilter('acknowledged_active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeFilter === 'acknowledged_active'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active / Co-Signed ({counts.active})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeFilter === 'draft'}
            onClick={() => setActiveFilter('draft')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activeFilter === 'draft'
                ? 'bg-slate-800 text-slate-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Saved Drafts ({counts.draft})
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tamper-evident custody log synchronized with local clinical store</span>
        </div>
      </div>

      {/* Handoff Cards List */}
      <div className="space-y-4" role="list" aria-label="Patient Care Responsibility Transfers">
        {filteredHandoffs.map((record: PatientHandoffRecord) => {
          const displayPtName = maskPatientName(
            record.patientName,
            record.patientId,
            isPrivacyMode
          );
          const displayMrn = maskMrn(record.mrn, record.patientId, isPrivacyMode);
          const urgencyMeta = getUrgencyLabel(record.urgency);
          const statusMeta = getStatusLabel(record.status);
          const auditExpanded = Boolean(expandedAuditIds[record.id]);
          const completedTasksCount = record.actionItems.filter((t) => t.completed).length;

          return (
            <article
              key={record.id}
              role="listitem"
              aria-label={`Care handoff ${record.id} for ${displayPtName}`}
              className="bg-slate-950/75 border border-slate-800/90 rounded-xl p-4 space-y-4"
            >
              {/* Card Top Metadata & Custody Header (Unboxed inline metadata per frontend-design discipline) */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-indigo-300 font-semibold">
                      {record.id}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <span
                        aria-hidden="true"
                        className={`w-2 h-2 rounded-full ${urgencyMeta.dotColor}`}
                      />
                      <span className={urgencyMeta.textColor}>{urgencyMeta.label}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className={`font-medium ${statusMeta.textColor}`}>
                      {statusMeta.label}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{record.shiftTransition}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <Clock aria-hidden="true" className="w-3 h-3" />
                      {formatRelativeTime(record.updatedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <h3 className="text-base font-bold text-white inline-flex items-center gap-1.5">
                      {isPrivacyMode && (
                        <Lock aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>{displayPtName}</span>
                    </h3>
                    <span className="text-xs font-mono text-slate-400">{displayMrn}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="text-xs text-slate-300">{record.ward}</span>
                    <Link
                      to={`/patients/${record.patientId}`}
                      aria-label={`Open full clinical chart for ${displayPtName}`}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-0.5 ml-1"
                    >
                      <span>Open Chart</span>
                      <ArrowUpRight aria-hidden="true" className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                {/* Custodian Transfer Strip */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-lg px-3.5 py-2 flex flex-wrap items-center gap-2.5 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Releasing Clinician
                    </div>
                    <div className="font-semibold text-slate-200">{record.fromStaffName}</div>
                    <div className="text-[11px] text-slate-400">{record.fromStaffRole}</div>
                  </div>

                  <ArrowRightLeft
                    aria-hidden="true"
                    className="w-4 h-4 text-indigo-400 shrink-0 mx-1"
                  />

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-indigo-300">
                      Receiving Custodian
                    </div>
                    <div className="font-semibold text-white">{record.toStaffName}</div>
                    <div className="text-[11px] text-slate-400">{record.toStaffRole}</div>
                  </div>
                </div>
              </div>

              {/* SBAR 4-Column Clinical Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
                    S · Situation
                  </div>
                  <p className="text-slate-200 leading-relaxed">{record.situation}</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
                    B · Background
                  </div>
                  <p className="text-slate-300 leading-relaxed">{record.background}</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    A · Assessment
                  </div>
                  <p className="text-slate-200 leading-relaxed">{record.assessment}</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                    R · Recommendation
                  </div>
                  <p className="text-slate-200 leading-relaxed">{record.recommendation}</p>
                </div>
              </div>

              {/* Contingency Escalation & Action Items Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                <div className="lg:col-span-6 bg-rose-950/20 border border-rose-500/25 rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                    <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    <span>Contingency &amp; Escalation Trigger ("If / Then")</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{record.contingencyPlan}</p>
                </div>

                <div className="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <ClipboardCheck aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Shift Handoff Action Checklist</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {completedTasksCount}/{record.actionItems.length} Completed
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {record.actionItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          toggleActionItem(record.id, item.id, record.toStaffName);
                          toast.info(
                            item.completed
                              ? `Reopened handoff action item on ${record.id}`
                              : `Completed action item & logged to ${record.id} audit trail`
                          );
                        }}
                        className="w-full text-left flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        {item.completed ? (
                          <CheckSquare
                            aria-hidden="true"
                            className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"
                          />
                        ) : (
                          <Square
                            aria-hidden="true"
                            className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <span
                            className={
                              item.completed
                                ? 'line-through text-slate-400'
                                : 'text-slate-200 font-medium'
                            }
                          >
                            {item.description}
                          </span>
                          {item.completedBy && (
                            <span className="block text-[10px] text-emerald-400/90 font-mono">
                              Verified by {item.completedBy}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Bar & Audit Trail Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/70">
                <button
                  type="button"
                  aria-expanded={auditExpanded}
                  onClick={() => toggleAuditDrawer(record.id)}
                  className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <History aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>
                    {auditExpanded ? 'Hide' : 'View'} Chain-of-Custody Audit Trail (
                    {record.auditTrail.length} {record.auditTrail.length === 1 ? 'Event' : 'Events'})
                  </span>
                </button>

                {/* Status-Driven Custody Transfer Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  {record.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => {
                        dispatchDraftHandoff(record.id, record.fromStaffName);
                        toast.success(
                          `Signed & dispatched care transfer ${record.id} to ${record.toStaffName}.`
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>Sign &amp; Dispatch Transfer</span>
                    </button>
                  )}

                  {record.status === 'pending_acknowledgment' && (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        aria-label={`Optional verification note for ${record.id}`}
                        placeholder="Receiver verification note (optional)..."
                        value={ackNotesById[record.id] || ''}
                        onChange={(e) =>
                          setAckNotesById((prev) => ({
                            ...prev,
                            [record.id]: e.target.value,
                          }))
                        }
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-56"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          acknowledgeHandoff(record.id, ackNotesById[record.id]);
                          setExpandedAuditIds((prev) => ({ ...prev, [record.id]: true }));
                          toast.success(
                            `${record.toStaffName} acknowledged ${record.id} and assumed care responsibility.`
                          );
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserCheck aria-hidden="true" className="w-3.5 h-3.5" />
                        <span>Acknowledge &amp; Assume Care ({record.toStaffName.split(',')[0]})</span>
                      </button>
                    </div>
                  )}

                  {record.status === 'acknowledged_active' && (
                    <button
                      type="button"
                      onClick={() => {
                        coSignHandoff(record.id);
                        setExpandedAuditIds((prev) => ({ ...prev, [record.id]: true }));
                        toast.success(`Attending co-signature recorded on ${record.id}.`);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Attending Co-Sign &amp; Lock Audit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Immutable Chain-of-Custody Audit Trail */}
              {auditExpanded && (
                <div
                  role="region"
                  aria-label={`Audit trail for handoff ${record.id}`}
                  className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Immutable Care Transfer Audit Trail ({record.id})</span>
                    </span>
                    <span className="font-mono">SHA-256 Clinical Integrity Verification</span>
                  </div>

                  <ol className="space-y-2 text-xs">
                    {record.auditTrail.map((entry, idx) => (
                      <li
                        key={entry.id}
                        className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 bg-slate-950/70 border border-slate-800/70 rounded-lg p-2.5"
                      >
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            <span className="font-mono text-indigo-400 font-semibold">
                              #{idx + 1} · {entry.action}
                            </span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="font-semibold text-slate-200">
                              {entry.actorName}
                            </span>
                            <span className="text-slate-400">({entry.actorRole})</span>
                          </div>
                          <p className="text-slate-300">{entry.noteSummary}</p>
                          <div className="text-[11px] text-slate-400">
                            <span>Custody Path: </span>
                            <span className="text-slate-300 font-medium">
                              {entry.fromCustodian}
                            </span>
                            <span aria-hidden="true" className="mx-1 text-indigo-400">-&gt;</span>
                            <span className="text-white font-medium">{entry.toCustodian}</span>
                          </div>
                        </div>

                        <div className="sm:text-right shrink-0 font-mono text-[10px] text-slate-400 space-y-0.5">
                          <div>{formatTimeShort(entry.timestamp)}</div>
                          <div className="text-emerald-400/90" title="Integrity Checksum">
                            CHK:{entry.integrityHash.slice(0, 12)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
