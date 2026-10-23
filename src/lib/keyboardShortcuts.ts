/**
 * keyboardShortcuts.ts
 *
 * Centralized clinical keyboard shortcut definitions, editable-input guards,
 * patient directory data loader helper, and global event triggers for
 * high-speed mouse-free clinical workflows.
 */

import {
  getAdminPatients,
  getDoctorPatients,
  getDepartments,
} from '@/lib/api';
import type { QuickViewPatient } from '@/components/modals/PatientQuickViewModal';

export interface PatientDirectoryEntry extends QuickViewPatient {
  department: string;
  mrn: string;
}

export const DEFAULT_DEPARTMENTS = [
  'All',
  'OPD',
  'ICU',
  'Cardiology',
  'Emergency',
  'Inpatient',
];

export interface ShortcutDefinition {
  id: string;
  keys: string[];
  alternateKeys?: string[];
  label: string;
  description: string;
  category: 'navigation' | 'patients_list' | 'patient_chart' | 'system';
  routeHint?: string;
}

export const CLINICAL_SHORTCUTS: ShortcutDefinition[] = [
  // Global Dashboard Navigation
  {
    id: 'nav-dashboard',
    keys: ['g', 'd'],
    alternateKeys: ['Alt', '1'],
    label: 'Go to Clinical Dashboard',
    description: 'Open main hospital telemetry, alerts, and overview metrics.',
    category: 'navigation',
    routeHint: '/dashboard',
  },
  {
    id: 'nav-patients',
    keys: ['g', 'p'],
    alternateKeys: ['Alt', '2'],
    label: 'Go to Patients Registry',
    description: 'Open longitudinal EHR directory and staff load assignments.',
    category: 'navigation',
    routeHint: '/patients',
  },
  {
    id: 'nav-capacity',
    keys: ['g', 'b'],
    alternateKeys: ['Alt', '3'],
    label: 'Go to Beds & Capacity',
    description: 'Open 24h department capacity surge forecaster and bed management.',
    category: 'navigation',
    routeHint: '/capacity',
  },
  {
    id: 'nav-telemedicine',
    keys: ['g', 't'],
    alternateKeys: ['Alt', '4'],
    label: 'Go to Telehealth Console',
    description: 'Open virtual encounter rooms and remote patient monitoring.',
    category: 'navigation',
    routeHint: '/telemedicine',
  },
  {
    id: 'nav-predict',
    keys: ['g', 'e'],
    alternateKeys: ['Alt', '5'],
    label: 'Go to Health AI & Organ Risk',
    description: 'Launch multi-organ clinical risk scoring and TabICLv2 predictors.',
    category: 'navigation',
    routeHint: '/predict',
  },
  {
    id: 'nav-chat',
    keys: ['g', 'c'],
    alternateKeys: ['Alt', '6'],
    label: 'Go to Clinical Assistant',
    description: 'Open clinical decision support and protocol search.',
    category: 'navigation',
    routeHint: '/chat',
  },
  {
    id: 'nav-admin',
    keys: ['g', 'a'],
    alternateKeys: ['Alt', '7'],
    label: 'Go to Admin & Governance',
    description: 'Open HIPAA audit logs, RBAC roles, and system governance.',
    category: 'navigation',
    routeHint: '/admin',
  },

  // Patients Registry List Actions (/patients)
  {
    id: 'patients-next-row',
    keys: ['j'],
    alternateKeys: ['↓'],
    label: 'Select Next Patient Row',
    description: 'Move keyboard focus down one patient in the active registry table.',
    category: 'patients_list',
  },
  {
    id: 'patients-prev-row',
    keys: ['k'],
    alternateKeys: ['↑'],
    label: 'Select Previous Patient Row',
    description: 'Move keyboard focus up one patient in the active registry table.',
    category: 'patients_list',
  },
  {
    id: 'patients-open-chart',
    keys: ['Enter'],
    label: 'Open Selected Patient Chart',
    description: 'Navigate directly to the full EMR chart for the focused patient row.',
    category: 'patients_list',
  },
  {
    id: 'patients-quick-view',
    keys: ['q'],
    alternateKeys: ['Space'],
    label: 'Toggle Patient Quick-View',
    description: 'Open or close the slide-over summary drawer for the focused patient.',
    category: 'patients_list',
  },
  {
    id: 'patients-quick-note',
    keys: ['n'],
    label: 'Add Clinical Note for Selected Patient',
    description: 'Open the SOAP / Triage note composer pre-bound to the focused patient.',
    category: 'patients_list',
  },
  {
    id: 'patients-new-record',
    keys: ['c'],
    alternateKeys: ['Shift', 'N'],
    label: 'Register New Patient Record',
    description: 'Launch the quick patient intake and auto-assignment modal.',
    category: 'patients_list',
  },
  {
    id: 'patients-rebalance',
    keys: ['r'],
    label: 'Rebalance Shift Load',
    description: 'Redistribute patient assignments across on-shift clinicians by acuity.',
    category: 'patients_list',
  },
  {
    id: 'patients-qr-scan',
    keys: ['s'],
    label: 'Scan Patient Wristband QR',
    description: 'Open the optical/manual MRN wristband scanner modal.',
    category: 'patients_list',
  },
  {
    id: 'patients-search',
    keys: ['/'],
    label: 'Focus Real-Time Patient Search',
    description: 'Jump cursor directly into the patient name / MRN / specialty filter bar.',
    category: 'patients_list',
  },

  // Patient Chart & Clinical Record Actions (/patients/:id)
  {
    id: 'chart-tabs-1-8',
    keys: ['1–8'],
    label: 'Switch Patient Chart Tabs (1 to 8)',
    description: '1 Overview · 2 DICOM · 3 Smart Rx · 4 EMR Notes · 5 Timeline · 6 Labs · 7 Orders · 8 Vitals.',
    category: 'patient_chart',
  },
  {
    id: 'chart-emr-note',
    keys: ['n'],
    label: 'Voice Dictate / Add EMR Note',
    description: 'Switch immediately to the EMR Notes & Voice Dictation workspace.',
    category: 'patient_chart',
  },
  {
    id: 'chart-smart-rx',
    keys: ['m'],
    alternateKeys: ['p'],
    label: 'Open Smart Prescription & Meds',
    description: 'Open CDS dosage calculator and contraindication checker.',
    category: 'patient_chart',
  },
  {
    id: 'chart-dicom',
    keys: ['i'],
    label: 'Open DICOM Medical Imaging',
    description: 'Switch to the interactive X-Ray / MRI Cornerstone viewer.',
    category: 'patient_chart',
  },
  {
    id: 'chart-export-fhir',
    keys: ['e'],
    label: 'Export Signed FHIR R4 Bundle',
    description: 'Generate and sign an interoperable FHIR R4 health record bundle.',
    category: 'patient_chart',
  },
  {
    id: 'chart-back-list',
    keys: ['b'],
    alternateKeys: ['Backspace'],
    label: 'Return to Patients Registry',
    description: 'Navigate back to the Patients Registry list view.',
    category: 'patient_chart',
  },

  // Global System & Privacy Controls
  {
    id: 'sys-command-palette',
    keys: ['⌘/Ctrl', 'K'],
    label: 'Open Global Command Palette',
    description: 'Search and jump to any clinical module, predictor, or setting.',
    category: 'system',
  },
  {
    id: 'sys-privacy-mode',
    keys: ['Alt', 'M'],
    label: 'Toggle HIPAA Privacy Mode',
    description: 'Mask or unmask patient PII across all screens for training & research.',
    category: 'system',
  },
  {
    id: 'sys-shortcuts-help',
    keys: ['?'],
    label: 'Toggle Keyboard Shortcuts Reference',
    description: 'Open or close this interactive clinical keyboard shortcuts guide.',
    category: 'system',
  },
  {
    id: 'sys-escape',
    keys: ['Esc'],
    label: 'Dismiss Modal / Clear Search Focus',
    description: 'Close any open drawer/modal or unfocus active search inputs.',
    category: 'system',
  },
];

export const NAVIGATION_CHORD_MAP: Record<
  string,
  { path: string; label: string }
> = {
  d: { path: '/dashboard', label: 'Clinical Dashboard' },
  p: { path: '/patients', label: 'Patients Registry' },
  b: { path: '/capacity', label: 'Beds & Capacity' },
  t: { path: '/telemedicine', label: 'Telehealth Console' },
  e: { path: '/predict', label: 'Health AI & Organ Risk' },
  c: { path: '/chat', label: 'Clinical Assistant' },
  a: { path: '/admin', label: 'Admin & Governance' },
};

export const ALT_NUMBER_NAVIGATION_MAP: Record<
  string,
  { path: string; label: string }
> = {
  '1': { path: '/dashboard', label: 'Clinical Dashboard' },
  '2': { path: '/patients', label: 'Patients Registry' },
  '3': { path: '/capacity', label: 'Beds & Capacity' },
  '4': { path: '/telemedicine', label: 'Telehealth Console' },
  '5': { path: '/predict', label: 'Health AI & Organ Risk' },
  '6': { path: '/chat', label: 'Clinical Assistant' },
  '7': { path: '/admin', label: 'Admin & Governance' },
};

/**
 * Checks whether a keyboard event originated inside an editable form field
 * so single-key clinical shortcuts do not interfere with text entry.
 *
 * @param target - DOM event target from KeyboardEvent
 * @returns true if user is typing inside an input, textarea, select, or contentEditable node
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toUpperCase();
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  return Boolean(target.closest('[contenteditable="true"]'));
}

export const OPEN_SHORTCUTS_MODAL_EVENT = 'clinos:open-shortcuts-modal';

/**
 * Dispatches a global custom event to open the Keyboard Shortcuts Reference modal
 * from any page button or toolbar badge.
 */
export function triggerKeyboardShortcutsModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_SHORTCUTS_MODAL_EVENT));
  }
}

/**
 * Loads and merges doctor-assigned patients, admin directory records, and departments
 * with a deterministic zero-configuration local fallback roster.
 *
 * @returns Merged patient directory entries and unique department list
 */
export async function fetchMergedPatientDirectory(): Promise<{
  patients: PatientDirectoryEntry[];
  departments: string[];
}> {
  const [adminPatients, doctorPatients, deptList] = await Promise.all([
    getAdminPatients().catch(() => []),
    getDoctorPatients().catch(() => []),
    getDepartments().catch(() => []),
  ]);

  const merged: PatientDirectoryEntry[] = [];
  const seenIds = new Set<number>();

  if (Array.isArray(doctorPatients)) {
    doctorPatients.forEach((dp: any) => {
      const id = Number(dp.patient_id || dp.id);
      seenIds.add(id);
      const dept = dp.department_name || dp.latest_encounter_type || 'OPD';
      merged.push({
        id,
        mrn: `MRN-${String(id).padStart(4, '0')}`,
        username: dp.username || `patient_${id}`,
        full_name: dp.full_name || `Patient #${id}`,
        email: dp.email || `patient${id}@example.com`,
        department: dept,
        encounter_type: dept,
        status: dp.latest_status || 'active',
        open_orders: dp.open_orders ?? 0,
      });
    });
  }

  if (Array.isArray(adminPatients)) {
    const fallbackDepts = ['Inpatient', 'Cardiology', 'OPD', 'ICU', 'Emergency'];
    adminPatients.forEach((ap: any, idx: number) => {
      const id = Number(ap.id);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        const dept =
          ap.department ||
          ap.encounter_type ||
          fallbackDepts[idx % fallbackDepts.length];
        merged.push({
          id,
          mrn: `MRN-${String(id).padStart(4, '0')}`,
          username: ap.username,
          full_name: ap.full_name || ap.username,
          email: ap.email,
          department: dept,
          encounter_type: dept,
          status: ap.status || 'active',
          open_orders: ap.open_orders ?? 1,
        });
      }
    });
  }

  if (merged.length === 0) {
    merged.push(
      {
        id: 42,
        mrn: 'MRN-0042',
        username: 'assigned_patient',
        full_name: 'Assigned Patient',
        email: 'assigned@example.com',
        department: 'OPD',
        encounter_type: 'OPD',
        status: 'open',
        open_orders: 2,
      },
      {
        id: 43,
        mrn: 'MRN-0043',
        username: 'marcus_vance',
        full_name: 'Marcus Vance',
        email: 'marcus@example.com',
        department: 'ICU',
        encounter_type: 'ICU',
        status: 'critical',
        open_orders: 4,
      },
      {
        id: 44,
        mrn: 'MRN-0044',
        username: 'elena_morales',
        full_name: 'Elena Morales',
        email: 'elena@example.com',
        department: 'Cardiology',
        encounter_type: 'Cardiology',
        status: 'stable',
        open_orders: 1,
      },
      {
        id: 45,
        mrn: 'MRN-0045',
        username: 'david_kim',
        full_name: 'David Kim',
        email: 'david@example.com',
        department: 'Emergency',
        encounter_type: 'Emergency',
        status: 'triage',
        open_orders: 3,
      },
      {
        id: 46,
        mrn: 'MRN-0046',
        username: 'priya_nair',
        full_name: 'Priya Nair',
        email: 'priya@example.com',
        department: 'Inpatient',
        encounter_type: 'Inpatient',
        status: 'active',
        open_orders: 2,
      }
    );
  }

  const deptSet = new Set<string>(DEFAULT_DEPARTMENTS);
  merged.forEach((p) => {
    if (p.department) deptSet.add(p.department);
  });
  if (Array.isArray(deptList)) {
    deptList.forEach((d: any) => {
      if (d?.name) deptSet.add(d.name);
    });
  }

  return {
    patients: merged,
    departments: Array.from(deptSet),
  };
}
