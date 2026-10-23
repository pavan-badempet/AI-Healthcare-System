import { create } from 'zustand';
import { toast } from './toast';

const PRIVACY_STORAGE_KEY = 'clinos_privacy_mode';

function getInitialPrivacyState(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(PRIVACY_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export interface PrivacyState {
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;
  setPrivacyMode: (enabled: boolean) => void;
}

/**
 * Global store managing Privacy Mode (PII masking for staff training and clinical research).
 */
export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  isPrivacyMode: getInitialPrivacyState(),
  togglePrivacyMode: () => {
    const next = !get().isPrivacyMode;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage write errors
      }
    }
    set({ isPrivacyMode: next });
    if (next) {
      toast.info('Privacy Mode enabled — Patient PII is now masked for training & research.');
    } else {
      toast.info('Privacy Mode disabled — Standard clinical identifiers restored.');
    }
  },
  setPrivacyMode: (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PRIVACY_STORAGE_KEY, String(enabled));
      } catch {
        // Ignore storage write errors
      }
    }
    set({ isPrivacyMode: enabled });
  },
}));

/**
 * Masks a patient's full name into a HIPAA Safe Harbor research pseudonym with redacted initials.
 */
export function maskPatientName(
  fullName?: string | null,
  patientId?: number | string,
  privacyEnabled = true
): string {
  const cleanName = fullName?.trim() || (patientId ? `Patient #${patientId}` : 'Patient');
  if (!privacyEnabled) return cleanName;

  const parts = cleanName.split(/\s+/).filter(Boolean);
  const initials = parts
    .map((part) => {
      const first = part[0]?.toUpperCase() || 'X';
      return `${first}${'•'.repeat(Math.min(Math.max(part.length - 1, 3), 5))}`;
    })
    .join(' ');

  const cohortTag = patientId ? `SUBJ-${String(patientId).padStart(4, '0')}` : 'SUBJ-ANON';
  return `${cohortTag} (${initials})`;
}

/**
 * Masks a patient username handle when Privacy Mode is enabled.
 */
export function maskUsername(
  username?: string | null,
  patientId?: number | string,
  privacyEnabled = true
): string {
  const clean = username || `patient_${patientId || 42}`;
  if (!privacyEnabled) return clean;
  return `cohort_subj_${String(patientId || 42).padStart(4, '0')}`;
}

/**
 * Masks a Medical Record Number (MRN) into a de-identified research cohort identifier.
 */
export function maskMrn(
  mrn?: string | null,
  patientId?: number | string,
  privacyEnabled = true
): string {
  const clean = mrn || `MRN-${String(patientId || 42).padStart(4, '0')}`;
  if (!privacyEnabled) return clean;
  return `RES-COHORT-${String(patientId || 42).padStart(4, '0')}`;
}

/**
 * Masks Date of Birth (DOB) per HIPAA Safe Harbor rules (retaining only birth year).
 */
export function maskDob(dob?: string | null, privacyEnabled = true): string {
  const clean = dob || '1981-04-12';
  if (!privacyEnabled) return clean;
  const yearMatch = clean.match(/^(\d{4})/);
  const year = yearMatch ? yearMatch[1] : '1981';
  return `${year}-••-•• (Year Only)`;
}

/**
 * Masks email addresses when Privacy Mode is enabled.
 */
export function maskEmail(email?: string | null, privacyEnabled = true): string {
  const clean = email || 'patient@example.com';
  if (!privacyEnabled) return clean;
  const firstChar = clean[0] || 'p';
  return `${firstChar}••••••@research-cohort.anon`;
}

/**
 * Masks phone numbers when Privacy Mode is enabled.
 */
export function maskPhone(phone?: string | null, privacyEnabled = true): string {
  const clean = phone || '+1 (555) 234-5678';
  if (!privacyEnabled) return clean;
  return '+1 (•••) •••-••••';
}

const KNOWN_PATIENT_NAMES: Array<{ name: string; pseudonym: string }> = [
  { name: 'Eleanor Vance', pseudonym: 'SUBJ-0042 (E•••• V••••)' },
  { name: 'Assigned Patient', pseudonym: 'SUBJ-0042 (A•••• P••••)' },
  { name: 'Marcus Vance', pseudonym: 'SUBJ-0043 (M•••• V••••)' },
  { name: 'Arthur Pendleton', pseudonym: 'SUBJ-0043 (A•••• P••••)' },
  { name: 'Elena Morales', pseudonym: 'SUBJ-0044 (E•••• M••••)' },
  { name: 'Sarah Connor', pseudonym: 'SUBJ-0044 (S•••• C••••)' },
  { name: 'David Kim', pseudonym: 'SUBJ-0045 (D•••• K•••)' },
  { name: 'Priya Nair', pseudonym: 'SUBJ-0046 (P•••• N•••)' },
  { name: 'John Doe', pseudonym: 'SUBJ-0043 (J••• D••)' },
];

/**
 * Scrubs known patient names, emails, phone numbers, and full dates from clinical free text.
 */
export function maskFreeTextPii(text: string, privacyEnabled = true): string {
  if (!privacyEnabled || !text) return text;
  let redacted = text;

  for (const entry of KNOWN_PATIENT_NAMES) {
    const regex = new RegExp(entry.name, 'gi');
    redacted = redacted.replace(regex, entry.pseudonym);
  }

  // Mask email patterns
  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '••••@research-cohort.anon'
  );

  // Mask US phone numbers
  redacted = redacted.replace(
    /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g,
    '+1 (•••) •••-••••'
  );

  // Mask YYYY-MM-DD dates to YYYY-••-••
  redacted = redacted.replace(/\b(19\d{2}|20\d{2})-\d{2}-\d{2}\b/g, '$1-••-••');

  return redacted;
}
