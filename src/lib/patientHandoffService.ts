/**
 * AI Healthcare System — Patient Handoff & Care Responsibility Transfer Service
 * Implements structured I-PASS / SBAR clinical handoffs between staff members
 * with an immutable, checksum-verified chain-of-custody audit trail.
 */
import { create } from 'zustand';
import { CLINICAL_STAFF_ROSTER, type ClinicalStaffMember } from './patientAssignmentEngine';
import { computeClinicalIntegrityHash } from './offlineSync';
import { useOfflineAuditStore } from './offlineAuditLogger';
import { notifyPatientCareEventsUpdated } from './patientCareEvents';

export type HandoffUrgency = 'routine' | 'priority' | 'stat_critical';

export type HandoffStatus =
  | 'draft'
  | 'pending_acknowledgment'
  | 'acknowledged_active'
  | 'co_signed';

export type HandoffAuditAction =
  | 'DRAFT_CREATED'
  | 'DRAFT_UPDATED'
  | 'CARE_TRANSFER_DISPATCHED'
  | 'RECEIVING_CLINICIAN_ACKNOWLEDGED'
  | 'ATTENDING_COSIGNED'
  | 'ACTION_ITEM_COMPLETED';

export interface HandoffActionItem {
  id: string;
  description: string;
  dueWindow: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface HandoffAuditTrailEntry {
  id: string;
  timestamp: string;
  action: HandoffAuditAction;
  actorName: string;
  actorRole: string;
  fromCustodian: string;
  toCustodian: string;
  noteSummary: string;
  integrityHash: string;
}

export interface PatientHandoffRecord {
  id: string;
  patientId: number;
  patientName: string;
  mrn: string;
  ward: string;
  urgency: HandoffUrgency;
  status: HandoffStatus;
  shiftTransition: string;
  fromStaffId: string;
  fromStaffName: string;
  fromStaffRole: string;
  toStaffId: string;
  toStaffName: string;
  toStaffRole: string;
  toStaffSpecialty: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  contingencyPlan: string;
  actionItems: HandoffActionItem[];
  createdAt: string;
  updatedAt: string;
  acknowledgedAt?: string;
  auditTrail: HandoffAuditTrailEntry[];
}

export interface CreateHandoffInput {
  patientId: number;
  patientName: string;
  mrn: string;
  ward: string;
  urgency: HandoffUrgency;
  shiftTransition: string;
  fromStaffId: string;
  toStaffId: string;
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  contingencyPlan: string;
  actionItemsText: string[];
  saveAsDraft?: boolean;
}

const STORAGE_KEY = 'clinos_patient_handoff_records_v1';

export const HANDOFF_PATIENTS = [
  {
    id: 43,
    full_name: 'Marcus Vance',
    mrn: 'MRN-0043',
    ward: 'ICU · Bed ER-01 Resus',
    defaultUrgency: 'stat_critical' as HandoffUrgency,
    template: {
      situation:
        'Post-STEMI cardiogenic shock recovery with intermittent sinus tachycardia (HR 112–126 bpm) and borderline MAP 64 mmHg.',
      background:
        '64yo male admitted via ED after anterior STEMI; emergent PCI to LAD completed. History of stage 3 CKD and hypertension.',
      assessment:
        'Hemodynamically fragile on low-dose norepinephrine (0.04 mcg/kg/min). Serial high-sensitivity troponin trending down, SpO2 93% on 3L NC.',
      recommendation:
        'Repeat arterial blood gas + serum lactate at 04:00, titrate norepinephrine to keep MAP >= 65 mmHg, and hold nephrotoxic agents.',
      contingencyPlan:
        'If SBP drops < 90 mmHg or SpO2 < 90% despite 6L O2, page ICU Fellow immediately and prepare bedside echo.',
      actionItems: [
        'Recheck arterial lactate and BMP at 04:00',
        'Verify telemetry QTc interval after amiodarone bolus',
      ],
    },
  },
  {
    id: 42,
    full_name: 'Eleanor Vance',
    mrn: 'MRN-0042',
    ward: 'Cardiology · Bed CARD-01',
    defaultUrgency: 'priority' as HandoffUrgency,
    template: {
      situation:
        'Paroxysmal atrial fibrillation rate-controlled on oral metoprolol; awaiting morning transesophageal echocardiogram (TEE).',
      background:
        '44yo female admitted for symptomatic rapid ventricular response (initial HR 144 bpm) and mild volume overload.',
      assessment:
        'Currently in normal sinus rhythm (HR 76 bpm, BP 122/78 mmHg, SpO2 98% RA). Net negative 850 mL over past 12h after IV furosemide.',
      recommendation:
        'Maintain NPO after midnight for 08:30 TEE. Continue therapeutic apixaban 5mg BID and monitor telemetry for recurrent AFib.',
      contingencyPlan:
        'If recurrent RVR > 120 bpm sustained for > 15 min, administer 5mg IV metoprolol tartrate and notify Cardiology On-Call.',
      actionItems: [
        'Confirm NPO status at 00:00 ahead of 08:30 TEE',
        'Review morning potassium & magnesium levels (target K > 4.0, Mg > 2.0)',
      ],
    },
  },
  {
    id: 44,
    full_name: 'Elena Morales',
    mrn: 'MRN-0044',
    ward: 'MICU · Bed ICU-01',
    defaultUrgency: 'routine' as HandoffUrgency,
    template: {
      situation:
        'Resolving community-acquired pneumonia and sepsis; weaned to room air and stable for step-down transfer evaluation.',
      background:
        '35yo female admitted 48h ago with hypoxic respiratory failure and leukocytosis (WBC 18.4 -> 10.2). Blood cultures negative at 48h.',
      assessment:
        'Afebrile for 24 hours, HR 72 bpm, BP 116/74 mmHg, SpO2 97% on room air. Tolerating oral diet and ambulating with PT.',
      recommendation:
        'Transition IV ceftriaxone to oral cefpodoxime on morning rounds and finalize step-down bed transfer to Internal Medicine.',
      contingencyPlan:
        'If fever >= 38.3°C recurs or respiratory rate > 24/min, repeat chest radiograph and hold floor transfer.',
      actionItems: [
        'Sign step-down transfer order once Inpatient floor bed assigned',
        'Reconcile outpatient bronchodilator inhaler regimen with pharmacy',
      ],
    },
  },
];

function buildAuditEntry(params: {
  timestamp: string;
  action: HandoffAuditAction;
  actorName: string;
  actorRole: string;
  fromCustodian: string;
  toCustodian: string;
  noteSummary: string;
  patientId: number;
}): HandoffAuditTrailEntry {
  const payload = `${params.timestamp}|${params.action}|${params.actorName}|${params.fromCustodian}|${params.toCustodian}|${params.patientId}|${params.noteSummary}`;
  return {
    id: `ho-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: params.timestamp,
    action: params.action,
    actorName: params.actorName,
    actorRole: params.actorRole,
    fromCustodian: params.fromCustodian,
    toCustodian: params.toCustodian,
    noteSummary: params.noteSummary,
    integrityHash: computeClinicalIntegrityHash(payload),
  };
}

function getInitialSeedHandoffs(): PatientHandoffRecord[] {
  const now = Date.now();
  const tMinus45m = new Date(now - 45 * 60 * 1000).toISOString();
  const tMinus30m = new Date(now - 30 * 60 * 1000).toISOString();
  const tMinus2h = new Date(now - 120 * 60 * 1000).toISOString();
  const tMinus95m = new Date(now - 95 * 60 * 1000).toISOString();
  const tMinus15m = new Date(now - 15 * 60 * 1000).toISOString();

  return [
    {
      id: 'HO-2026-0891',
      patientId: 43,
      patientName: 'Marcus Vance',
      mrn: 'MRN-0043',
      ward: 'ICU · Bed ER-01 Resus',
      urgency: 'stat_critical',
      status: 'pending_acknowledgment',
      shiftTransition: 'Day Shift -> Night Handoff (19:00)',
      fromStaffId: 'staff-patel',
      fromStaffName: 'Dr. Arjun Patel, MD',
      fromStaffRole: 'Critical Care Intensivist',
      toStaffId: 'staff-kovacs',
      toStaffName: 'Dr. Lukas Kovacs, MD',
      toStaffRole: 'Nocturnist & Overflow Specialist',
      toStaffSpecialty: 'Inpatient / ICU',
      situation:
        'Post-STEMI cardiogenic shock recovery with intermittent sinus tachycardia (HR 112–126 bpm) and borderline MAP 64 mmHg.',
      background:
        '64yo male admitted via ED after anterior STEMI; emergent PCI to LAD completed. History of stage 3 CKD and hypertension.',
      assessment:
        'Hemodynamically fragile on low-dose norepinephrine (0.04 mcg/kg/min). Serial high-sensitivity troponin trending down, SpO2 93% on 3L NC.',
      recommendation:
        'Repeat arterial blood gas + serum lactate at 04:00, titrate norepinephrine to keep MAP >= 65 mmHg, and hold nephrotoxic agents.',
      contingencyPlan:
        'If SBP drops < 90 mmHg or SpO2 < 90% despite 6L O2, page ICU Fellow immediately and prepare bedside echo.',
      actionItems: [
        {
          id: 'task-43-1',
          description: 'Recheck arterial lactate and BMP at 04:00',
          dueWindow: '04:00',
          completed: false,
        },
        {
          id: 'task-43-2',
          description: 'Verify telemetry QTc interval after amiodarone bolus',
          dueWindow: '21:30',
          completed: true,
          completedBy: 'Dr. Arjun Patel, MD',
          completedAt: tMinus30m,
        },
      ],
      createdAt: tMinus45m,
      updatedAt: tMinus15m,
      auditTrail: [
        buildAuditEntry({
          timestamp: tMinus45m,
          action: 'DRAFT_CREATED',
          actorName: 'Dr. Arjun Patel, MD',
          actorRole: 'Critical Care Intensivist',
          fromCustodian: 'Dr. Arjun Patel, MD',
          toCustodian: 'Dr. Lukas Kovacs, MD',
          noteSummary: 'Drafted I-PASS/SBAR critical care handoff note for ICU Bed ER-01.',
          patientId: 43,
        }),
        buildAuditEntry({
          timestamp: tMinus15m,
          action: 'CARE_TRANSFER_DISPATCHED',
          actorName: 'Dr. Arjun Patel, MD',
          actorRole: 'Critical Care Intensivist',
          fromCustodian: 'Dr. Arjun Patel, MD',
          toCustodian: 'Dr. Lukas Kovacs, MD',
          noteSummary:
            'Signed and dispatched STAT care transfer to Night Handoff coverage. Awaiting receiving physician acknowledgment.',
          patientId: 43,
        }),
      ],
    },
    {
      id: 'HO-2026-0890',
      patientId: 42,
      patientName: 'Eleanor Vance',
      mrn: 'MRN-0042',
      ward: 'Cardiology · Bed CARD-01',
      urgency: 'priority',
      status: 'acknowledged_active',
      shiftTransition: 'Day Shift -> Swing Shift (15:00)',
      fromStaffId: 'staff-chen',
      fromStaffName: 'Dr. Sarah Chen, MD',
      fromStaffRole: 'Attending Cardiologist',
      toStaffId: 'staff-lin',
      toStaffName: 'Dr. Mei Lin, MD',
      toStaffRole: 'Internal Medicine Hospitalist',
      toStaffSpecialty: 'Inpatient / Cardiology',
      situation:
        'Paroxysmal atrial fibrillation rate-controlled on oral metoprolol; awaiting morning transesophageal echocardiogram (TEE).',
      background:
        '44yo female admitted for symptomatic rapid ventricular response (initial HR 144 bpm) and mild volume overload.',
      assessment:
        'Currently in normal sinus rhythm (HR 76 bpm, BP 122/78 mmHg, SpO2 98% RA). Net negative 850 mL over past 12h after IV furosemide.',
      recommendation:
        'Maintain NPO after midnight for 08:30 TEE. Continue therapeutic apixaban 5mg BID and monitor telemetry for recurrent AFib.',
      contingencyPlan:
        'If recurrent RVR > 120 bpm sustained for > 15 min, administer 5mg IV metoprolol tartrate and notify Cardiology On-Call.',
      actionItems: [
        {
          id: 'task-42-1',
          description: 'Confirm NPO status at 00:00 ahead of 08:30 TEE',
          dueWindow: '00:00',
          completed: true,
          completedBy: 'Dr. Mei Lin, MD',
          completedAt: tMinus95m,
        },
        {
          id: 'task-42-2',
          description: 'Review morning potassium & magnesium levels (target K > 4.0, Mg > 2.0)',
          dueWindow: '06:00',
          completed: false,
        },
      ],
      createdAt: tMinus2h,
      updatedAt: tMinus95m,
      acknowledgedAt: tMinus95m,
      auditTrail: [
        buildAuditEntry({
          timestamp: tMinus2h,
          action: 'CARE_TRANSFER_DISPATCHED',
          actorName: 'Dr. Sarah Chen, MD',
          actorRole: 'Attending Cardiologist',
          fromCustodian: 'Dr. Sarah Chen, MD',
          toCustodian: 'Dr. Mei Lin, MD',
          noteSummary:
            'Transferred Cardiology inpatient responsibility ahead of diagnostic TEE window.',
          patientId: 42,
        }),
        buildAuditEntry({
          timestamp: tMinus95m,
          action: 'RECEIVING_CLINICIAN_ACKNOWLEDGED',
          actorName: 'Dr. Mei Lin, MD',
          actorRole: 'Internal Medicine Hospitalist',
          fromCustodian: 'Dr. Sarah Chen, MD',
          toCustodian: 'Dr. Mei Lin, MD',
          noteSummary:
            'Acknowledged SBAR handoff and assumed primary inpatient floor coverage.',
          patientId: 42,
        }),
      ],
    },
  ];
}

function loadStoredHandoffs(): PatientHandoffRecord[] {
  if (typeof window === 'undefined') return getInitialSeedHandoffs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialSeedHandoffs();
    const parsed = JSON.parse(raw) as PatientHandoffRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialSeedHandoffs();
  } catch {
    return getInitialSeedHandoffs();
  }
}

function saveStoredHandoffs(records: PatientHandoffRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota exceptions in sandboxed browser environments
  }
}

function findStaffById(staffId: string): ClinicalStaffMember {
  return (
    CLINICAL_STAFF_ROSTER.find((s) => s.id === staffId) ?? CLINICAL_STAFF_ROSTER[0]
  );
}

interface PatientHandoffStoreState {
  handoffs: PatientHandoffRecord[];
  createOrDispatchHandoff: (input: CreateHandoffInput) => PatientHandoffRecord;
  dispatchDraftHandoff: (handoffId: string, actorName?: string) => void;
  acknowledgeHandoff: (handoffId: string, verifierNote?: string) => void;
  coSignHandoff: (handoffId: string, attendingName?: string) => void;
  toggleActionItem: (handoffId: string, itemId: string, actorName?: string) => void;
}

export const usePatientHandoffStore = create<PatientHandoffStoreState>((set, get) => ({
  handoffs: loadStoredHandoffs(),

  createOrDispatchHandoff: (input: CreateHandoffInput) => {
    const now = new Date().toISOString();
    const fromStaff = findStaffById(input.fromStaffId);
    const toStaff = findStaffById(input.toStaffId);
    const isDraft = Boolean(input.saveAsDraft);
    const status: HandoffStatus = isDraft ? 'draft' : 'pending_acknowledgment';
    const action: HandoffAuditAction = isDraft
      ? 'DRAFT_CREATED'
      : 'CARE_TRANSFER_DISPATCHED';

    const newRecord: PatientHandoffRecord = {
      id: `HO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: input.patientId,
      patientName: input.patientName,
      mrn: input.mrn,
      ward: input.ward,
      urgency: input.urgency,
      status,
      shiftTransition: input.shiftTransition,
      fromStaffId: fromStaff.id,
      fromStaffName: fromStaff.name,
      fromStaffRole: fromStaff.roleTitle,
      toStaffId: toStaff.id,
      toStaffName: toStaff.name,
      toStaffRole: toStaff.roleTitle,
      toStaffSpecialty: toStaff.primarySpecialty,
      situation: input.situation.trim(),
      background: input.background.trim(),
      assessment: input.assessment.trim(),
      recommendation: input.recommendation.trim(),
      contingencyPlan: input.contingencyPlan.trim(),
      actionItems: input.actionItemsText
        .map((t) => t.trim())
        .filter(Boolean)
        .map((desc, idx) => ({
          id: `task-${input.patientId}-${Date.now()}-${idx}`,
          description: desc,
          dueWindow: 'Next Shift',
          completed: false,
        })),
      createdAt: now,
      updatedAt: now,
      auditTrail: [
        buildAuditEntry({
          timestamp: now,
          action,
          actorName: fromStaff.name,
          actorRole: fromStaff.roleTitle,
          fromCustodian: fromStaff.name,
          toCustodian: toStaff.name,
          noteSummary: isDraft
            ? `Saved draft clinical handoff note for ${input.patientName} (${input.ward}).`
            : `Signed & dispatched ${input.urgency.toUpperCase()} care responsibility transfer from ${fromStaff.name} to ${toStaff.name}.`,
          patientId: input.patientId,
        }),
      ],
    };

    const updated = [newRecord, ...get().handoffs];
    saveStoredHandoffs(updated);
    set({ handoffs: updated });

    // Record in IndexedDB HIPAA Offline Audit Logger & notify patient care event subscribers
    void useOfflineAuditStore.getState().recordOfflineAuditEvent({
      eventType: 'DATA_MODIFICATION',
      action: isDraft ? 'HANDOFF_DRAFT_SAVED' : 'CARE_RESPONSIBILITY_TRANSFER',
      resourcePath: `/v1/hospital/patients/${input.patientId}/handoff`,
      httpMethod: 'POST',
      actorRole: 'doctor',
      targetPatientId: input.patientId,
      details: `${newRecord.id}: ${fromStaff.name} -> ${toStaff.name} (${status})`,
    });
    notifyPatientCareEventsUpdated({ patientId: input.patientId });

    return newRecord;
  },

  dispatchDraftHandoff: (handoffId: string, actorName?: string) => {
    const now = new Date().toISOString();
    const updated = get().handoffs.map((item) => {
      if (item.id !== handoffId) return item;
      const signer = actorName || item.fromStaffName;
      const entry = buildAuditEntry({
        timestamp: now,
        action: 'CARE_TRANSFER_DISPATCHED',
        actorName: signer,
        actorRole: item.fromStaffRole,
        fromCustodian: item.fromStaffName,
        toCustodian: item.toStaffName,
        noteSummary: `Finalized draft and dispatched care responsibility transfer to ${item.toStaffName}.`,
        patientId: item.patientId,
      });
      return {
        ...item,
        status: 'pending_acknowledgment' as HandoffStatus,
        updatedAt: now,
        auditTrail: [...item.auditTrail, entry],
      };
    });
    saveStoredHandoffs(updated);
    set({ handoffs: updated });
  },

  acknowledgeHandoff: (handoffId: string, verifierNote?: string) => {
    const now = new Date().toISOString();
    let targetPatientId: number | null = null;
    const updated = get().handoffs.map((item) => {
      if (item.id !== handoffId) return item;
      targetPatientId = item.patientId;
      const entry = buildAuditEntry({
        timestamp: now,
        action: 'RECEIVING_CLINICIAN_ACKNOWLEDGED',
        actorName: item.toStaffName,
        actorRole: item.toStaffRole,
        fromCustodian: item.fromStaffName,
        toCustodian: item.toStaffName,
        noteSummary:
          verifierNote?.trim() ||
          `Receiving clinician ${item.toStaffName} reviewed SBAR summary, verified contingency plan, and accepted active care responsibility.`,
        patientId: item.patientId,
      });
      return {
        ...item,
        status: 'acknowledged_active' as HandoffStatus,
        acknowledgedAt: now,
        updatedAt: now,
        auditTrail: [...item.auditTrail, entry],
      };
    });

    saveStoredHandoffs(updated);
    set({ handoffs: updated });

    if (targetPatientId !== null) {
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_MODIFICATION',
        action: 'CARE_TRANSFER_ACKNOWLEDGED',
        resourcePath: `/v1/hospital/patients/${targetPatientId}/handoff/${handoffId}/acknowledge`,
        httpMethod: 'PATCH',
        actorRole: 'doctor',
        targetPatientId,
        details: `Handoff ${handoffId} acknowledged and custody assumed.`,
      });
      notifyPatientCareEventsUpdated({ patientId: targetPatientId });
    }
  },

  coSignHandoff: (handoffId: string, attendingName?: string) => {
    const now = new Date().toISOString();
    const updated = get().handoffs.map((item) => {
      if (item.id !== handoffId) return item;
      const signer = attendingName || 'Dr. Sarah Chen, MD (Service Chief)';
      const entry = buildAuditEntry({
        timestamp: now,
        action: 'ATTENDING_COSIGNED',
        actorName: signer,
        actorRole: 'Attending Supervisor',
        fromCustodian: item.fromStaffName,
        toCustodian: item.toStaffName,
        noteSummary: `Attending co-signature completed. Chain-of-custody transfer archived to permanent EMR audit log.`,
        patientId: item.patientId,
      });
      return {
        ...item,
        status: 'co_signed' as HandoffStatus,
        updatedAt: now,
        auditTrail: [...item.auditTrail, entry],
      };
    });

    saveStoredHandoffs(updated);
    set({ handoffs: updated });
  },

  toggleActionItem: (handoffId: string, itemId: string, actorName?: string) => {
    const now = new Date().toISOString();
    const updated = get().handoffs.map((item) => {
      if (item.id !== handoffId) return item;
      let toggledTaskTitle = '';
      let isNowCompleted = false;
      const nextItems = item.actionItems.map((task) => {
        if (task.id !== itemId) return task;
        isNowCompleted = !task.completed;
        toggledTaskTitle = task.description;
        return {
          ...task,
          completed: isNowCompleted,
          completedBy: isNowCompleted ? actorName || item.toStaffName : undefined,
          completedAt: isNowCompleted ? now : undefined,
        };
      });

      const nextAudit = isNowCompleted
        ? [
            ...item.auditTrail,
            buildAuditEntry({
              timestamp: now,
              action: 'ACTION_ITEM_COMPLETED',
              actorName: actorName || item.toStaffName,
              actorRole: item.toStaffRole,
              fromCustodian: item.fromStaffName,
              toCustodian: item.toStaffName,
              noteSummary: `Completed handoff follow-up task: "${toggledTaskTitle}"`,
              patientId: item.patientId,
            }),
          ]
        : item.auditTrail;

      return {
        ...item,
        actionItems: nextItems,
        updatedAt: now,
        auditTrail: nextAudit,
      };
    });

    saveStoredHandoffs(updated);
    set({ handoffs: updated });
  },
}));
