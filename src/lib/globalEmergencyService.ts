/**
 * AI Healthcare System — Global Emergency & Active Trauma Resuscitation Service
 * Triggers system-wide high-priority alerts and automatically pulls up the most
 * critical patient records for active trauma and resuscitation cases.
 */
import { create } from 'zustand';
import { useNotificationStore } from './notificationService';
import { useOfflineAuditStore } from './offlineAuditLogger';
import { notifyPatientCareEventsUpdated } from './patientCareEvents';
import { toast } from './toast';

export interface CriticalTraumaOrder {
  id: string;
  label: string;
  category: 'Blood Bank' | 'Airway / Procedure' | 'Vasopressor / Med' | 'Stat Imaging';
  dispatched: boolean;
  dispatchedAt?: string;
  dispatchedBy?: string;
}

export interface CriticalTraumaCaseRecord {
  id: string;
  patientId: number;
  patientName: string;
  ageSex: string;
  mrn: string;
  bloodType: string;
  traumaLevel: 'Level 1 Trauma' | 'Level 1 Cardiac Resus' | 'High-Acuity Escalation';
  bayLocation: string;
  attendingLead: string;
  news2Score: number;
  shockIndex: number;
  vitals: {
    heartRate: number;
    bloodPressure: string;
    map: number;
    spO2: number;
    respiratoryRate: number;
    lactateMmol: number;
    gcsScore: string;
  };
  mechanismAndChiefComplaint: string;
  primaryAssessment: string;
  activeLinesAndAirway: string;
  allergies: string;
  statOrders: CriticalTraumaOrder[];
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

const INITIAL_CRITICAL_TRAUMA_CASES: CriticalTraumaCaseRecord[] = [
  {
    id: 'TRAUMA-CASE-43',
    patientId: 43,
    patientName: 'Marcus Vance',
    ageSex: '54M',
    mrn: 'MRN-0043',
    bloodType: 'O+ (Crossmatched 4U)',
    traumaLevel: 'Level 1 Cardiac Resus',
    bayLocation: 'ICU · Bed ER-01 Resus',
    attendingLead: 'Dr. Arjun Patel, MD (Critical Care)',
    news2Score: 11,
    shockIndex: 1.52,
    vitals: {
      heartRate: 128,
      bloodPressure: '84/52',
      map: 63,
      spO2: 89,
      respiratoryRate: 28,
      lactateMmol: 4.2,
      gcsScore: '14 (E4 V4 M6)',
    },
    mechanismAndChiefComplaint:
      'Acute post-STEMI cardiogenic shock with refractory sinus tachycardia, hypotension (MAP 63 mmHg), and rising arterial lactate.',
    primaryAssessment:
      'FAST Exam negative for pericardial tamponade; bilateral basal rales on auscultation; cool extremities. High-sensitivity Troponin-I 0.18 ng/mL.',
    activeLinesAndAirway:
      'Right Internal Jugular Triple-Lumen CVC · Left Radial Arterial Line · High-Flow Nasal Cannula 40L/min (FiO2 60%)',
    allergies: 'Iodinated Contrast (Mild Urticaria), NSAIDs',
    statOrders: [
      {
        id: 'ord-43-1',
        label: 'Titrate Norepinephrine 0.08 mcg/kg/min + Start Dobutamine 5 mcg/kg/min',
        category: 'Vasopressor / Med',
        dispatched: false,
      },
      {
        id: 'ord-43-2',
        label: 'STAT Bedside Transthoracic Echo + Repeat Arterial Blood Gas & Lactate',
        category: 'Stat Imaging',
        dispatched: false,
      },
      {
        id: 'ord-43-3',
        label: 'Prepare Intubation Tray & Mechanical Ventilator Standby at ER-01',
        category: 'Airway / Procedure',
        dispatched: false,
      },
    ],
    acknowledged: false,
  },
  {
    id: 'TRAUMA-CASE-45',
    patientId: 43,
    patientName: 'Julian Mercer (Trauma Alpha)',
    ageSex: '39M',
    mrn: 'MRN-0045',
    bloodType: 'O- (Uncrossmatched Ready)',
    traumaLevel: 'Level 1 Trauma',
    bayLocation: 'Emergency · Bay TRAUMA-01',
    attendingLead: 'Dr. Rachel Ross, DO (Trauma Attending)',
    news2Score: 12,
    shockIndex: 1.52,
    vitals: {
      heartRate: 134,
      bloodPressure: '88/56',
      map: 67,
      spO2: 87,
      respiratoryRate: 30,
      lactateMmol: 4.8,
      gcsScore: '13 (E3 V4 M6)',
    },
    mechanismAndChiefComplaint:
      'High-velocity motor vehicle collision with blunt thoracoabdominal trauma, decreased right breath sounds, and hemodynamic instability.',
    primaryAssessment:
      'eFAST positive for right hemopneumothorax and trace Morison pouch free fluid. Pelvis stable to compression.',
    activeLinesAndAirway:
      '2x 14G Antecubital IVs · Non-Rebreather Mask 15L/min · Cervical Collar Applied',
    allergies: 'No Known Drug Allergies (NKDA)',
    statOrders: [
      {
        id: 'ord-45-1',
        label: 'Activate Massive Transfusion Protocol (2U O-Negative PRBCs + TXA 1g IV)',
        category: 'Blood Bank',
        dispatched: false,
      },
      {
        id: 'ord-45-2',
        label: 'Right 28Fr Tube Thoracostomy (Chest Tube) Setup STAT',
        category: 'Airway / Procedure',
        dispatched: false,
      },
      {
        id: 'ord-45-3',
        label: 'Emergent Trauma CT Pan-Scan & Hold Operating Room Bay 2',
        category: 'Stat Imaging',
        dispatched: false,
      },
    ],
    acknowledged: false,
  },
  {
    id: 'TRAUMA-CASE-42',
    patientId: 42,
    patientName: 'Eleanor Vance',
    ageSex: '44F',
    mrn: 'MRN-0042',
    bloodType: 'A+ (Type & Screen Active)',
    traumaLevel: 'High-Acuity Escalation',
    bayLocation: 'Cardiology · Bed CARD-01',
    attendingLead: 'Dr. Sarah Chen, MD (Cardiology)',
    news2Score: 8,
    shockIndex: 1.51,
    vitals: {
      heartRate: 142,
      bloodPressure: '94/60',
      map: 71,
      spO2: 92,
      respiratoryRate: 24,
      lactateMmol: 2.4,
      gcsScore: '15 (E4 V5 M6)',
    },
    mechanismAndChiefComplaint:
      'Sudden recurrent atrial fibrillation with rapid ventricular response (142 bpm) accompanied by acute systolic pressure drop and dyspnea.',
    primaryAssessment:
      'Narrow-complex irregular tachycardia on continuous telemetry; mild jugular venous distension; SpO2 92% on 2L nasal cannula.',
    activeLinesAndAirway:
      'Left Forearm 18G Peripheral IV · Continuous 12-Lead Telemetry · 2L O2 Nasal Cannula',
    allergies: 'Penicillin (Rash)',
    statOrders: [
      {
        id: 'ord-42-1',
        label: 'Administer IV Metoprolol Tartrate 5mg Slow Push + 250mL Crystalloid Bolus',
        category: 'Vasopressor / Med',
        dispatched: false,
      },
      {
        id: 'ord-42-2',
        label: 'Place Biphasic Synchronized Cardioversion Defibrillator Pads at Bedside',
        category: 'Airway / Procedure',
        dispatched: false,
      },
    ],
    acknowledged: false,
  },
];

interface GlobalEmergencyStoreState {
  isEmergencyActive: boolean;
  modalOpen: boolean;
  emergencyCode: string;
  activatedAt: string | null;
  activatedBy: string;
  selectedCaseId: string;
  criticalCases: CriticalTraumaCaseRecord[];
  triggerGlobalEmergency: (actorName?: string, actorRole?: string) => void;
  openEmergencyModal: () => void;
  closeEmergencyModal: () => void;
  selectCriticalCase: (caseId: string) => void;
  acknowledgeTraumaCase: (caseId: string, clinicianName?: string) => void;
  dispatchRapidTraumaOrder: (
    caseId: string,
    orderId: string,
    clinicianName?: string
  ) => void;
  resolveGlobalEmergency: (actorName?: string) => void;
}

export const useGlobalEmergencyStore = create<GlobalEmergencyStoreState>((set, get) => ({
  isEmergencyActive: false,
  modalOpen: false,
  emergencyCode: 'CODE TRAUMA — LEVEL 1 CRITICAL RESUSCITATION',
  activatedAt: null,
  activatedBy: 'Dr. Sarah Chen, MD',
  selectedCaseId: INITIAL_CRITICAL_TRAUMA_CASES[0].id,
  criticalCases: INITIAL_CRITICAL_TRAUMA_CASES,

  triggerGlobalEmergency: (actorName = 'Dr. Sarah Chen, MD', actorRole = 'doctor') => {
    const now = new Date().toISOString();
    const alreadyActive = get().isEmergencyActive;

    set({
      isEmergencyActive: true,
      modalOpen: true,
      activatedAt: alreadyActive ? get().activatedAt ?? now : now,
      activatedBy: actorName,
      selectedCaseId: get().criticalCases[0]?.id || INITIAL_CRITICAL_TRAUMA_CASES[0].id,
    });

    if (!alreadyActive) {
      // Broadcast system-wide high-priority alert into the staff notification feed & toast bus
      useNotificationStore.getState().upsertNotification(
        {
          id: `global-emerg-${Date.now()}`,
          category: 'CRITICAL_LAB',
          severity: 'error',
          title: 'CODE TRAUMA — GLOBAL EMERGENCY ACTIVATED',
          message: `System-wide Level 1 Trauma & Resuscitation alert triggered by ${actorName}. 3 critical patient records pulled for immediate bedside intervention.`,
          patient_id: 43,
          patient_name: 'Marcus Vance',
          department: 'Emergency & ICU Resus',
          action_href: '/patients/43',
          action_label: 'Open Trauma Chart',
          acknowledged: false,
          created_at: now,
        },
        true
      );

      // Record tamper-evident emergency activation in local IndexedDB HIPAA audit log
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_ACCESS',
        action: 'GLOBAL_EMERGENCY_TRAUMA_OVERRIDE',
        resourcePath: '/v1/hospital/emergency/trauma-cohort',
        httpMethod: 'POST',
        actorRole,
        targetPatientId: 43,
        details: `Global Emergency Code Trauma triggered by ${actorName}. Pulled top 3 critical resuscitation records.`,
      });
    }
  },

  openEmergencyModal: () => set({ modalOpen: true }),

  closeEmergencyModal: () => set({ modalOpen: false }),

  selectCriticalCase: (caseId: string) => set({ selectedCaseId: caseId }),

  acknowledgeTraumaCase: (caseId: string, clinicianName = 'Dr. Sarah Chen, MD') => {
    const now = new Date().toISOString();
    set((state) => ({
      criticalCases: state.criticalCases.map((c) =>
        c.id === caseId
          ? {
              ...c,
              acknowledged: true,
              acknowledgedBy: clinicianName,
              acknowledgedAt: now,
            }
          : c
      ),
    }));
    toast.success(`Trauma case ${caseId} acknowledged by ${clinicianName}.`);
  },

  dispatchRapidTraumaOrder: (
    caseId: string,
    orderId: string,
    clinicianName = 'Dr. Sarah Chen, MD'
  ) => {
    const now = new Date().toISOString();
    let orderLabel = '';
    let patientId = 43;

    set((state) => ({
      criticalCases: state.criticalCases.map((c) => {
        if (c.id !== caseId) return c;
        patientId = c.patientId;
        return {
          ...c,
          statOrders: c.statOrders.map((ord) => {
            if (ord.id !== orderId) return ord;
            orderLabel = ord.label;
            return {
              ...ord,
              dispatched: true,
              dispatchedAt: now,
              dispatchedBy: clinicianName,
            };
          }),
        };
      }),
    }));

    if (orderLabel) {
      toast.success(`STAT Trauma Order Dispatched: ${orderLabel}`);
      void useOfflineAuditStore.getState().recordOfflineAuditEvent({
        eventType: 'DATA_MODIFICATION',
        action: 'STAT_TRAUMA_ORDER_DISPATCHED',
        resourcePath: `/v1/hospital/patients/${patientId}/orders`,
        httpMethod: 'POST',
        actorRole: 'doctor',
        targetPatientId: patientId,
        details: `Dispatched emergency trauma order (${caseId}): ${orderLabel}`,
      });
      notifyPatientCareEventsUpdated({ patientId });
    }
  },

  resolveGlobalEmergency: (actorName = 'Dr. Sarah Chen, MD') => {
    set({
      isEmergencyActive: false,
      modalOpen: false,
      activatedAt: null,
    });
    toast.info(
      `Global Emergency Code Trauma stood down by ${actorName}. Normal telemetry monitoring resumed.`
    );
  },
}));
