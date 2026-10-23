/**
 * AI Healthcare System — Patient Inter-Departmental Transfer QR & EMR Link Service
 *
 * Generates ISO/IEC 18004 standard-compliant QR codes encoding patient EMR
 * linkage tokens and inter-departmental transfer context. Designed so receiving
 * clinical terminals (or PatientQrScannerModal via jsQR) can scan the patient
 * profile or wristband to immediately link EMR records during transfers.
 */
import QRCode from 'qrcode';

export type TransferPriorityLevel = 'STAT / Emergent' | 'Urgent' | 'Routine Handover';

export interface PatientTransferQrPayload {
  protocol: 'CLINOS-EMR-XFER-v2';
  patientId: number;
  mrn: string;
  patientAlias: string;
  bloodType: string;
  originDepartment: string;
  destinationDepartment: string;
  priority: TransferPriorityLevel;
  attendingClinician: string;
  transferToken: string;
  emrPath: string;
  issuedAtIso: string;
  expiresAtIso: string;
  hipaaRedacted: boolean;
}

export interface TerminalScanReceipt {
  id: string;
  patientId: number;
  mrn: string;
  originDepartment: string;
  destinationDepartment: string;
  priority: TransferPriorityLevel;
  transferToken: string;
  scannedByTerminal: string;
  scannedAtIso: string;
}

export const HOSPITAL_DEPARTMENTS: string[] = [
  'Emergency Trauma Bay 1',
  'ICU-02 (Critical Care)',
  'Telemetry-08 (Cardiology)',
  'Cardiac Cath Lab',
  'Neuro-Stepdown-03',
  'Radiology / CT & MRI Suite',
  'Post-Anesthesia Care Unit (PACU)',
  'General Inpatient Ward 4B',
];

const TRANSFER_RECEIPTS_STORAGE_KEY = 'clinos_emr_qr_transfer_receipts_v1';

/**
 * Generates a deterministic HMAC-style short clinical verification token.
 */
export function buildTransferVerificationToken(
  patientId: number,
  originDept: string,
  destDept: string
): string {
  const seed = `${patientId}:${originDept}:${destDept}:${new Date().toISOString().slice(0, 13)}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `XFER-${String(patientId).padStart(3, '0')}-${hex.slice(0, 6)}`;
}

/**
 * Constructs a structured JSON payload for the patient transfer QR code.
 * Compatible with parsePatientIdFromQrPayload in PatientQrScannerModal.tsx.
 */
export function createPatientTransferQrPayload(params: {
  patientId: number;
  mrn?: string;
  patientName?: string;
  bloodType?: string;
  originDepartment: string;
  destinationDepartment: string;
  priority: TransferPriorityLevel;
  attendingClinician?: string;
  hipaaRedacted?: boolean;
}): PatientTransferQrPayload {
  const now = new Date();
  const expires = new Date(now.getTime() + 4 * 3600 * 1000); // 4-hour clinical transfer validity window
  const mrn = params.mrn || `MRN-${String(params.patientId).padStart(4, '0')}`;
  const transferToken = buildTransferVerificationToken(
    params.patientId,
    params.originDepartment,
    params.destinationDepartment
  );

  return {
    protocol: 'CLINOS-EMR-XFER-v2',
    patientId: params.patientId,
    mrn,
    patientAlias: params.hipaaRedacted
      ? `SUBJ-${String(params.patientId).padStart(4, '0')}`
      : params.patientName || `Patient #${params.patientId}`,
    bloodType: params.bloodType || 'A+',
    originDepartment: params.originDepartment,
    destinationDepartment: params.destinationDepartment,
    priority: params.priority,
    attendingClinician: params.attendingClinician || 'Dr. Sarah Chen, MD',
    transferToken,
    emrPath: `/patients/${params.patientId}`,
    issuedAtIso: now.toISOString(),
    expiresAtIso: expires.toISOString(),
    hipaaRedacted: Boolean(params.hipaaRedacted),
  };
}

/**
 * Renders a high-contrast ISO/IEC 18004 QR code Data URL (PNG) suitable for
 * optical scanning by clinical terminals or jsQR image upload.
 */
export async function generatePatientQrDataUrl(
  payload: PatientTransferQrPayload
): Promise<string> {
  const serialized = JSON.stringify(payload);
  return await QRCode.toDataURL(serialized, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

/**
 * Parses a raw QR string and returns the rich PatientTransferQrPayload if it
 * matches the CLINOS-EMR-XFER-v2 protocol.
 */
export function parseTransferQrPayload(raw: string): PatientTransferQrPayload | null {
  try {
    const parsed = JSON.parse(raw.trim());
    if (
      parsed &&
      parsed.protocol === 'CLINOS-EMR-XFER-v2' &&
      typeof parsed.patientId === 'number'
    ) {
      return parsed as PatientTransferQrPayload;
    }
  } catch {
    // Not a structured transfer QR JSON
  }
  return null;
}

/**
 * Persists a terminal scan / EMR link receipt in localStorage for auditability.
 */
export function recordTerminalTransferScan(
  payload: PatientTransferQrPayload,
  terminalId = 'TERM-CATH-04'
): TerminalScanReceipt {
  const receipt: TerminalScanReceipt = {
    id: `scan-${Date.now().toString(36)}`,
    patientId: payload.patientId,
    mrn: payload.mrn,
    originDepartment: payload.originDepartment,
    destinationDepartment: payload.destinationDepartment,
    priority: payload.priority,
    transferToken: payload.transferToken,
    scannedByTerminal: terminalId,
    scannedAtIso: new Date().toISOString(),
  };

  const existing = getTerminalTransferScanHistory();
  const updated = [receipt, ...existing].slice(0, 20);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TRANSFER_RECEIPTS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  }
  return receipt;
}

export function getTerminalTransferScanHistory(patientId?: number): TerminalScanReceipt[] {
  if (typeof window === 'undefined') return getDefaultTransferHistory(patientId);
  try {
    const raw = localStorage.getItem(TRANSFER_RECEIPTS_STORAGE_KEY);
    if (!raw) return getDefaultTransferHistory(patientId);
    const parsed = JSON.parse(raw) as TerminalScanReceipt[];
    if (!Array.isArray(parsed)) return getDefaultTransferHistory(patientId);
    return patientId ? parsed.filter((r) => r.patientId === patientId) : parsed;
  } catch {
    return getDefaultTransferHistory(patientId);
  }
}

function getDefaultTransferHistory(patientId?: number): TerminalScanReceipt[] {
  const defaults: TerminalScanReceipt[] = [
    {
      id: 'scan-seed-1',
      patientId: 42,
      mrn: 'MRN-0042',
      originDepartment: 'Emergency Trauma Bay 1',
      destinationDepartment: 'Telemetry-08 (Cardiology)',
      priority: 'Urgent',
      transferToken: 'XFER-042-8F3A1C',
      scannedByTerminal: 'TERM-TELE-08',
      scannedAtIso: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    },
    {
      id: 'scan-seed-2',
      patientId: 43,
      mrn: 'MRN-0043',
      originDepartment: 'Emergency Trauma Bay 1',
      destinationDepartment: 'ICU-02 (Critical Care)',
      priority: 'STAT / Emergent',
      transferToken: 'XFER-043-4D9E2B',
      scannedByTerminal: 'TERM-ICU-02',
      scannedAtIso: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    },
  ];
  return patientId ? defaults.filter((r) => r.patientId === patientId) : defaults;
}
