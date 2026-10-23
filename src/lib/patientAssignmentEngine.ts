/**
 * Automated Patient-to-Staff Assignment & Load-Balancing Engine
 * Distributes incoming and active patients across clinical staff based on:
 * 1. Specialty & Department alignment (Cardiology, ICU, Emergency, OPD, Inpatient)
 * 2. Active Shift Schedule availability (Day, Swing, 24h On-Call, Night Handoff)
 * 3. Current Department & Individual Clinician Caseload (acuity-weighted utilization)
 */

export interface ClinicalStaffMember {
  id: string;
  name: string;
  roleTitle: string;
  primarySpecialty: string;
  secondarySpecialties: string[];
  shiftWindow: string;
  shiftType: 'Day Shift' | 'Swing Shift' | 'On-Call Coverage' | 'Night Handoff';
  isOnShift: boolean;
  baseCaseload: number; // Pre-existing baseline patients outside the visible registry slice
  maxCapacity: number;
}

export interface AssignablePatientInput {
  id: number;
  full_name: string;
  department: string;
  encounter_type?: string;
  status?: string;
  open_orders?: number;
}

export interface PatientStaffAssignment {
  patientId: number;
  staff: ClinicalStaffMember;
  assignedCount: number;
  maxCapacity: number;
  utilizationPct: number;
  loadStatus: 'optimal' | 'moderate' | 'near_capacity';
  specialtyMatched: boolean;
  assignmentScore: number; // 0 - 100 composite match score
  rationale: string;
}

export interface StaffLoadSummary {
  staff: ClinicalStaffMember;
  activeAssignedPatients: number;
  totalCaseload: number;
  utilizationPct: number;
  loadStatus: 'optimal' | 'moderate' | 'near_capacity';
  assignedPatientIds: number[];
}

export const CLINICAL_STAFF_ROSTER: ClinicalStaffMember[] = [
  {
    id: 'staff-chen',
    name: 'Dr. Sarah Chen, MD',
    roleTitle: 'Attending Cardiologist',
    primarySpecialty: 'Cardiology',
    secondarySpecialties: ['OPD', 'Inpatient'],
    shiftWindow: '07:00–19:00',
    shiftType: 'Day Shift',
    isOnShift: true,
    baseCaseload: 1,
    maxCapacity: 6,
  },
  {
    id: 'staff-patel',
    name: 'Dr. Arjun Patel, MD',
    roleTitle: 'Critical Care Intensivist',
    primarySpecialty: 'ICU',
    secondarySpecialties: ['Emergency', 'Cardiology'],
    shiftWindow: '07:00–19:00',
    shiftType: 'Day Shift',
    isOnShift: true,
    baseCaseload: 1,
    maxCapacity: 4,
  },
  {
    id: 'staff-ross',
    name: 'Dr. Rachel Ross, DO',
    roleTitle: 'Emergency & Trauma Attending',
    primarySpecialty: 'Emergency',
    secondarySpecialties: ['ICU', 'OPD'],
    shiftWindow: '11:00–23:00',
    shiftType: 'Swing Shift',
    isOnShift: true,
    baseCaseload: 2,
    maxCapacity: 6,
  },
  {
    id: 'staff-okafor',
    name: 'Dr. Chidi Okafor, MD',
    roleTitle: 'Ambulatory & OPD Lead',
    primarySpecialty: 'OPD',
    secondarySpecialties: ['Inpatient', 'Cardiology'],
    shiftWindow: '08:00–20:00',
    shiftType: 'Day Shift',
    isOnShift: true,
    baseCaseload: 2,
    maxCapacity: 7,
  },
  {
    id: 'staff-lin',
    name: 'Dr. Mei Lin, MD',
    roleTitle: 'Internal Medicine Hospitalist',
    primarySpecialty: 'Inpatient',
    secondarySpecialties: ['OPD', 'Cardiology'],
    shiftWindow: '07:00–19:00',
    shiftType: 'Day Shift',
    isOnShift: true,
    baseCaseload: 2,
    maxCapacity: 7,
  },
  {
    id: 'staff-kovacs',
    name: 'Dr. Lukas Kovacs, MD',
    roleTitle: 'Nocturnist & Overflow Specialist',
    primarySpecialty: 'Inpatient',
    secondarySpecialties: ['ICU', 'Emergency', 'Cardiology', 'OPD'],
    shiftWindow: '19:00–07:00',
    shiftType: 'On-Call Coverage',
    isOnShift: true,
    baseCaseload: 0,
    maxCapacity: 6,
  },
];

function normalizeSpecialty(raw?: string): string {
  const val = (raw || '').trim().toLowerCase();
  if (val.includes('icu') || val.includes('critical') || val.includes('micu')) return 'ICU';
  if (val.includes('cardio')) return 'Cardiology';
  if (val.includes('emerg') || val.includes('trauma') || val.includes('er')) return 'Emergency';
  if (val.includes('inpatient') || val.includes('med') || val.includes('ward')) return 'Inpatient';
  return 'OPD';
}

function getAcuityLoadWeight(status?: string): number {
  const s = (status || 'active').toLowerCase();
  if (s === 'critical') return 1.4;
  if (s === 'triage') return 1.2;
  return 1.0;
}

/**
 * Computes automated patient-to-staff assignments across the cohort using specialty alignment,
 * shift schedule status, and dynamic department load balancing.
 */
export function computeAutomatedPatientAssignments(
  patients: AssignablePatientInput[],
  manualOverrides: Record<number, string> = {},
  shiftRotationSeed = 0
): {
  assignmentsByPatientId: Record<number, PatientStaffAssignment>;
  staffLoadSummaries: StaffLoadSummary[];
} {
  // Track dynamic caseload and acuity-weighted load per clinician
  const dynamicCounts: Record<string, number> = {};
  const weightedLoads: Record<string, number> = {};
  const assignedIdsMap: Record<string, number[]> = {};

  CLINICAL_STAFF_ROSTER.forEach((s, idx) => {
    // Allow optional rebalance seed to slightly rotate tie-breakers across on-shift clinicians
    const rotationOffset = shiftRotationSeed > 0 ? ((idx + shiftRotationSeed) % 2) * 0.15 : 0;
    dynamicCounts[s.id] = s.baseCaseload;
    weightedLoads[s.id] = s.baseCaseload + rotationOffset;
    assignedIdsMap[s.id] = [];
  });

  // Sort incoming/active patients so Critical and Triage acuity are assigned first to primary specialists
  const prioritizedPatients = [...patients].sort((a, b) => {
    const weightA = getAcuityLoadWeight(a.status);
    const weightB = getAcuityLoadWeight(b.status);
    if (weightB !== weightA) return weightB - weightA;
    return a.id - b.id;
  });

  const assignmentsByPatientId: Record<number, PatientStaffAssignment> = {};

  for (const pt of prioritizedPatients) {
    const normalizedDept = normalizeSpecialty(pt.department || pt.encounter_type);
    const acuityWeight = getAcuityLoadWeight(pt.status);
    const overrideStaffId = manualOverrides[pt.id];

    let chosenStaff = CLINICAL_STAFF_ROSTER[0];
    let bestScore = -Infinity;
    let isPrimarySpecialty = false;

    if (overrideStaffId) {
      const found = CLINICAL_STAFF_ROSTER.find((s) => s.id === overrideStaffId);
      if (found) {
        chosenStaff = found;
        isPrimarySpecialty =
          found.primarySpecialty.toLowerCase() === normalizedDept.toLowerCase();
        bestScore = 98;
      }
    } else {
      for (const candidate of CLINICAL_STAFF_ROSTER) {
        const currentTotal = dynamicCounts[candidate.id];
        const utilizationRatio = weightedLoads[candidate.id] / candidate.maxCapacity;

        // 1. Specialty Score (0 - 45 pts)
        const primaryMatch =
          candidate.primarySpecialty.toLowerCase() === normalizedDept.toLowerCase();
        const secondaryMatch = candidate.secondarySpecialties.some(
          (sec) => sec.toLowerCase() === normalizedDept.toLowerCase()
        );
        const specialtyScore = primaryMatch ? 45 : secondaryMatch ? 26 : 8;

        // 2. Shift Schedule Score (0 - 30 pts)
        const shiftScore = candidate.isOnShift
          ? candidate.shiftType === 'Day Shift' || candidate.shiftType === 'Swing Shift'
            ? 30
            : 22
          : 5;

        // 3. Department & Individual Load-Balancing Score (0 - 25 pts)
        // Strongly reward lower utilization and penalize exceeding maxCapacity
        const capacityHeadroom = Math.max(0, 1 - utilizationRatio);
        const overloadPenalty = currentTotal >= candidate.maxCapacity ? -35 : 0;
        const loadBalanceScore = Math.round(capacityHeadroom * 25) + overloadPenalty;

        const totalScore = specialtyScore + shiftScore + loadBalanceScore;

        if (totalScore > bestScore) {
          bestScore = totalScore;
          chosenStaff = candidate;
          isPrimarySpecialty = primaryMatch;
        }
      }
    }

    // Commit assignment and increment clinician's live load
    dynamicCounts[chosenStaff.id] += 1;
    weightedLoads[chosenStaff.id] += acuityWeight;
    assignedIdsMap[chosenStaff.id].push(pt.id);

    const assignedCount = dynamicCounts[chosenStaff.id];
    const utilizationPct = Math.min(
      100,
      Math.round((assignedCount / chosenStaff.maxCapacity) * 100)
    );
    const loadStatus: PatientStaffAssignment['loadStatus'] =
      utilizationPct >= 85
        ? 'near_capacity'
        : utilizationPct >= 65
          ? 'moderate'
          : 'optimal';

    const rationale = overrideStaffId
      ? `Supervisor override · ${chosenStaff.primarySpecialty} · ${chosenStaff.shiftType}`
      : `${
          isPrimarySpecialty
            ? `Primary ${chosenStaff.primarySpecialty} match`
            : `Cross-coverage (${chosenStaff.primarySpecialty})`
        } · ${chosenStaff.shiftType} (${chosenStaff.shiftWindow}) · Load ${assignedCount}/${chosenStaff.maxCapacity}`;

    assignmentsByPatientId[pt.id] = {
      patientId: pt.id,
      staff: chosenStaff,
      assignedCount,
      maxCapacity: chosenStaff.maxCapacity,
      utilizationPct,
      loadStatus,
      specialtyMatched: isPrimarySpecialty,
      assignmentScore: Math.max(60, Math.min(99, Math.round(bestScore))),
      rationale,
    };
  }

  const staffLoadSummaries: StaffLoadSummary[] = CLINICAL_STAFF_ROSTER.map((s) => {
    const totalCaseload = dynamicCounts[s.id];
    const utilizationPct = Math.min(
      100,
      Math.round((totalCaseload / s.maxCapacity) * 100)
    );
    const loadStatus: StaffLoadSummary['loadStatus'] =
      utilizationPct >= 85
        ? 'near_capacity'
        : utilizationPct >= 65
          ? 'moderate'
          : 'optimal';

    return {
      staff: s,
      activeAssignedPatients: assignedIdsMap[s.id].length,
      totalCaseload,
      utilizationPct,
      loadStatus,
      assignedPatientIds: assignedIdsMap[s.id],
    };
  });

  return {
    assignmentsByPatientId,
    staffLoadSummaries,
  };
}
