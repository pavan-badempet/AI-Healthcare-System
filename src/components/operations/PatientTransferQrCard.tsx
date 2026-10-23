/**
 * AI Healthcare System — Patient Inter-Departmental Transfer QR Code & EMR Link Card
 *
 * Generates and displays a high-contrast, ISO/IEC 18004 patient-specific QR code
 * in the patient profile so receiving clinical terminals can scan the screen or
 * wristband to immediately link EMR records during inter-departmental transfers.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  ArrowRightLeft,
  Download,
  Copy,
  CheckCircle2,
  ScanLine,
  ShieldCheck,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  HOSPITAL_DEPARTMENTS,
  TransferPriorityLevel,
  PatientTransferQrPayload,
  TerminalScanReceipt,
  createPatientTransferQrPayload,
  generatePatientQrDataUrl,
  recordTerminalTransferScan,
  getTerminalTransferScanHistory,
} from '../../lib/patientTransferQrService';
import { usePrivacyStore, maskPatientName, maskMrn } from '@/lib/privacy';
import { toast } from '@/lib/toast';

interface PatientTransferQrCardProps {
  patientId: number;
  patientName?: string;
  bloodType?: string;
  defaultOriginDepartment?: string;
  defaultDestinationDepartment?: string;
  allowPatientSwitching?: boolean;
}

const COHORT_PATIENTS = [
  { id: 42, name: 'Eleanor Vance', bloodType: 'A+', origin: 'Telemetry-08 (Cardiology)', dest: 'Cardiac Cath Lab' },
  { id: 43, name: 'Marcus Vance', bloodType: 'O+', origin: 'Emergency Trauma Bay 1', dest: 'ICU-02 (Critical Care)' },
  { id: 44, name: 'Elena Morales', bloodType: 'B+', origin: 'Neuro-Stepdown-03', dest: 'Radiology / CT & MRI Suite' },
];

const PRIORITY_OPTIONS: TransferPriorityLevel[] = [
  'STAT / Emergent',
  'Urgent',
  'Routine Handover',
];

export const PatientTransferQrCard: React.FC<PatientTransferQrCardProps> = ({
  patientId: initialPatientId,
  patientName: initialPatientName,
  bloodType: initialBloodType = 'A+',
  defaultOriginDepartment = 'Telemetry-08 (Cardiology)',
  defaultDestinationDepartment = 'Cardiac Cath Lab',
  allowPatientSwitching = false,
}) => {
  const { isPrivacyMode } = usePrivacyStore();
  const [activePatientId, setActivePatientId] = useState<number>(initialPatientId);
  const [originDept, setOriginDept] = useState<string>(defaultOriginDepartment);
  const [destDept, setDestDept] = useState<string>(defaultDestinationDepartment);
  const [priority, setPriority] = useState<TransferPriorityLevel>('Urgent');
  const [qrPayload, setQrPayload] = useState<PatientTransferQrPayload | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<TerminalScanReceipt[]>([]);

  useEffect(() => {
    setActivePatientId(initialPatientId);
  }, [initialPatientId]);

  const activePatientMeta =
    COHORT_PATIENTS.find((p) => p.id === activePatientId) || {
      id: activePatientId,
      name: initialPatientName || `Patient #${activePatientId}`,
      bloodType: initialBloodType,
      origin: defaultOriginDepartment,
      dest: defaultDestinationDepartment,
    };

  const resolvedName = initialPatientName && activePatientId === initialPatientId
    ? initialPatientName
    : activePatientMeta.name;

  const resolvedBloodType = initialBloodType && activePatientId === initialPatientId
    ? initialBloodType
    : activePatientMeta.bloodType;

  const regenerateQrCode = useCallback(async () => {
    setIsGenerating(true);
    try {
      const payload = createPatientTransferQrPayload({
        patientId: activePatientId,
        mrn: `MRN-${String(activePatientId).padStart(4, '0')}`,
        patientName: resolvedName,
        bloodType: resolvedBloodType,
        originDepartment: originDept,
        destinationDepartment: destDept,
        priority,
        hipaaRedacted: isPrivacyMode,
      });
      const dataUrl = await generatePatientQrDataUrl(payload);
      setQrPayload(payload);
      setQrDataUrl(dataUrl);
      setScanHistory(getTerminalTransferScanHistory(activePatientId));
    } finally {
      setIsGenerating(false);
    }
  }, [
    activePatientId,
    resolvedName,
    resolvedBloodType,
    originDept,
    destDept,
    priority,
    isPrivacyMode,
  ]);

  useEffect(() => {
    void regenerateQrCode();
  }, [regenerateQrCode]);

  const handleSelectCohortPatient = (pt: typeof COHORT_PATIENTS[number]) => {
    setActivePatientId(pt.id);
    setOriginDept(pt.origin);
    setDestDept(pt.dest);
  };

  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !qrPayload) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `EMR-Transfer-QR-Patient-${activePatientId}-${qrPayload.transferToken}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded Transfer QR Wristband PNG (${qrPayload.transferToken})`);
  };

  const handleCopyPayload = async () => {
    if (!qrPayload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(qrPayload));
      setCopiedPayload(true);
      toast.success('Copied EMR Transfer QR payload to clipboard for terminal pairing.');
      setTimeout(() => setCopiedPayload(false), 2500);
    } catch {
      toast.info(`Transfer Token: ${qrPayload.transferToken}`);
    }
  };

  const handleSimulateTerminalScan = () => {
    if (!qrPayload) return;
    const terminalCode = `TERM-${destDept.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '')}-01`;
    const receipt = recordTerminalTransferScan(qrPayload, terminalCode);
    setScanHistory(getTerminalTransferScanHistory(activePatientId));
    toast.success(
      `Terminal ${receipt.scannedByTerminal} linked EMR #${activePatientId} (${qrPayload.originDepartment} -> ${qrPayload.destinationDepartment})`
    );
  };

  const displayName = maskPatientName(resolvedName, activePatientId, isPrivacyMode);
  const displayMrn = maskMrn(
    `MRN-${String(activePatientId).padStart(4, '0')}`,
    activePatientId,
    isPrivacyMode
  );

  return (
    <section
      aria-label="Patient Inter-Departmental Transfer QR Code Generator"
      className="bg-slate-900/75 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800/90 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400">
            <QrCode className="w-4 h-4 shrink-0" />
            <span>Inter-Departmental EMR Handover · Optical Terminal Link</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Patient-Specific Transfer QR Code &amp; Wristband Pass
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Generates an ISO/IEC 18004 QR code encoding the patient’s EMR identifier, transfer token, and origin/receiving units for instant scanning by clinical terminals.
          </p>
        </div>

        {allowPatientSwitching && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select patient profile for QR generation">
            {COHORT_PATIENTS.map((pt) => {
              const isSelected = pt.id === activePatientId;
              const maskedPtName = maskPatientName(pt.name, pt.id, isPrivacyMode);
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => handleSelectCohortPatient(pt)}
                  aria-pressed={isSelected}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {maskedPtName} · #{pt.id}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Split Body */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Scannable High-Contrast QR Code Badge (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
          <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2.5">
            <span className="font-bold text-white">{displayName}</span>
            <span>
              {displayMrn} · {resolvedBloodType}
            </span>
          </div>

          {/* White High-Contrast Optical Target Box for Terminal Cameras */}
          <div className="relative p-3.5 bg-white rounded-2xl shadow-md border-2 border-indigo-500/40 flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`EMR Transfer QR Code for ${displayName} (${displayMrn})`}
                className="w-52 h-52 object-contain"
              />
            ) : (
              <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs font-mono">
                Generating QR...
              </div>
            )}
          </div>

          {/* Token & Protocol Metadata (Zero-Pill inline text) */}
          {qrPayload && (
            <div className="w-full text-center space-y-1">
              <div className="text-xs font-mono font-bold text-teal-400">
                {qrPayload.transferToken} · {qrPayload.priority}
              </div>
              <div className="text-[11px] text-slate-400">
                <span>{qrPayload.originDepartment}</span>
                <span aria-hidden="true"> → </span>
                <span className="text-slate-200 font-semibold">{qrPayload.destinationDepartment}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                Protocol {qrPayload.protocol} · Valid 4h · {isPrivacyMode ? 'HIPAA Safe-Harbor Redacted' : 'Standard Clinical Mode'}
              </div>
            </div>
          )}

          {/* QR Action Controls */}
          <div className="w-full grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR PNG</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopyPayload()}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedPayload ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>{copiedPayload ? 'Copied Payload' : 'Copy QR Payload'}</span>
            </button>
          </div>
        </div>

        {/* Right: Inter-Departmental Route Configuration & Terminal Handshake Log (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                <span>Configure Inter-Departmental Transfer Route</span>
              </h4>
              <button
                type="button"
                onClick={() => void regenerateQrCode()}
                disabled={isGenerating}
                className="inline-flex items-center gap-1 text-xs font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Rotate Token</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor={`qr-origin-${activePatientId}`}
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Origin Clinical Unit
                </label>
                <select
                  id={`qr-origin-${activePatientId}`}
                  value={originDept}
                  onChange={(e) => setOriginDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {HOSPITAL_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={`qr-dest-${activePatientId}`}
                  className="block text-xs font-semibold text-slate-300 mb-1"
                >
                  Receiving Clinical Unit
                </label>
                <select
                  id={`qr-dest-${activePatientId}`}
                  value={destDept}
                  onChange={(e) => setDestDept(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {HOSPITAL_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transfer Priority Selector */}
            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-1.5">
                Transfer Acuity &amp; Terminal Alert Priority
              </span>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Select transfer priority">
                {PRIORITY_OPTIONS.map((level) => {
                  const isSelected = priority === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setPriority(level)}
                      aria-pressed={isSelected}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simulate Receiving Clinical Terminal Scan */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200 block">
                  Test Receiving Terminal Handshake
                </span>
                <span>
                  Verifies optical payload decoding and logs an audit entry for {destDept}.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSimulateTerminalScan}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Simulate Terminal Scan</span>
              </button>
            </div>
          </div>

          {/* Recent Terminal Link & Scan Audit Trail */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Recent Terminal QR Link Handshakes (Patient #{activePatientId})</span>
              </h4>
              <span className="text-[11px] font-mono text-slate-400">
                {scanHistory.length} Verified Links
              </span>
            </div>

            <div className="space-y-2">
              {scanHistory.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white">
                      {item.originDepartment} → {item.destinationDepartment}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      <span>Token {item.transferToken}</span>
                      <span aria-hidden="true"> · </span>
                      <span>Terminal {item.scannedByTerminal}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="text-teal-400">{item.priority}</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      {new Date(item.scannedAtIso).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
