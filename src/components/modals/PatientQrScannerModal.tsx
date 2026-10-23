/**
 * PatientQrScannerModal — Uses the device camera (getUserMedia + jsQR) to scan
 * a patient wristband QR code and immediately open the Patient Quick-View overlay.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  X,
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { QuickViewPatient } from './PatientQuickViewModal';
import {
  parseTransferQrPayload,
  recordTerminalTransferScan,
} from '@/lib/patientTransferQrService';
import { toast } from '@/lib/toast';

export interface ScannablePatient extends QuickViewPatient {
  department?: string;
  mrn?: string;
}

interface PatientQrScannerModalProps {
  open: boolean;
  patients: ScannablePatient[];
  onClose: () => void;
  onPatientScanned: (patient: ScannablePatient) => void;
}

/**
 * Extracts a numeric patient ID from any common clinical QR payload:
 * - CLINOS-EMR-XFER-v2 JSON: {"protocol":"CLINOS-EMR-XFER-v2","patientId":43,...}
 * - JSON: {"patientId": 43} or {"id": 43} or {"mrn": "MRN-0043"}
 * - URL: https://.../patients/43
 * - MRN / Tag: MRN-0043, PATIENT:43, ID#43, 43
 */
export function parsePatientIdFromQrPayload(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    const idCandidate = Number(
      parsed?.patientId ?? parsed?.patient_id ?? parsed?.id
    );
    if (!Number.isNaN(idCandidate) && idCandidate > 0) {
      return idCandidate;
    }
    if (typeof parsed?.mrn === 'string') {
      const mrnMatch = parsed.mrn.match(/(\d+)/);
      if (mrnMatch) return Number(mrnMatch[1]);
    }
  } catch {
    // Not JSON; continue with pattern matching
  }

  const urlMatch = trimmed.match(/\/patients\/(\d+)/i);
  if (urlMatch) return Number(urlMatch[1]);

  const mrnOrPrefixMatch = trimmed.match(/(?:mrn[-_]?0*|patient[-_:#\s]*|id[-_:#\s]*)(\d+)/i);
  if (mrnOrPrefixMatch) return Number(mrnOrPrefixMatch[1]);

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return null;
}

export default function PatientQrScannerModal({
  open,
  patients,
  onClose,
  onPatientScanned,
}: PatientQrScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [cameraStatus, setCameraStatus] = useState<'starting' | 'active' | 'unavailable'>('starting');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualInput, setManualInput] = useState<string>('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resolveAndTriggerPatient = useCallback(
    (rawPayload: string) => {
      const transferPayload = parseTransferQrPayload(rawPayload);
      const parsedId = transferPayload ? transferPayload.patientId : parsePatientIdFromQrPayload(rawPayload);
      const normalizedRaw = rawPayload.trim().toLowerCase();

      let matched = patients.find(
        (p) =>
          (parsedId !== null && p.id === parsedId) ||
          p.mrn?.toLowerCase() === normalizedRaw ||
          p.username?.toLowerCase() === normalizedRaw ||
          p.full_name?.toLowerCase() === normalizedRaw
      );

      if (!matched && parsedId !== null) {
        matched = {
          id: parsedId,
          mrn: transferPayload?.mrn || `MRN-${String(parsedId).padStart(4, '0')}`,
          username: `patient_${parsedId}`,
          full_name: transferPayload?.patientAlias || `Patient #${parsedId}`,
          email: `patient${parsedId}@example.com`,
          department: transferPayload?.destinationDepartment || 'Inpatient',
          encounter_type: 'Inpatient',
          status: 'active',
          open_orders: 1,
        };
      }

      if (!matched) {
        toast.warning(`Could not match "${rawPayload}" to a patient ID.`);
        return;
      }

      setLastScannedCode(rawPayload);
      stopCamera();

      if (transferPayload) {
        recordTerminalTransferScan(transferPayload, 'TERM-SCANNER-OPTICAL');
        toast.success(
          `Inter-Departmental Transfer Linked: ${matched.full_name} (${transferPayload.originDepartment} → ${transferPayload.destinationDepartment} · ${transferPayload.transferToken})`
        );
      } else {
        toast.success(
          `Scanned Patient QR: ${matched.full_name || `Patient #${matched.id}`} (ID #${matched.id})`
        );
      }
      onClose();
      onPatientScanned(matched);
    },
    [patients, stopCamera, onClose, onPatientScanned]
  );

  // Start camera stream and run continuous jsQR frame decoding loop
  useEffect(() => {
    if (!open) {
      stopCamera();
      setLastScannedCode(null);
      setManualInput('');
      return;
    }

    let cancelled = false;
    setCameraStatus('starting');
    setCameraError(null);

    async function startStream() {
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        if (!cancelled) {
          setCameraStatus('unavailable');
          setCameraError(
            'Camera access is not available in this browser context. Use the quick wristband buttons or upload a QR image below.'
          );
        }
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        }
        setCameraStatus('active');

        const scanLoop = () => {
          if (cancelled) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const width = video.videoWidth || 640;
            const height = video.videoHeight || 480;
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              const imageData = ctx.getImageData(0, 0, width, height);
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (qrCode && qrCode.data) {
                resolveAndTriggerPatient(qrCode.data);
                return;
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanLoop);
        };

        rafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        if (!cancelled) {
          setCameraStatus('unavailable');
          setCameraError(
            'Camera permission was denied or no camera was detected. You can click any patient wristband below or upload a QR image.'
          );
        }
      }
    }

    startStream();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, facingMode, stopCamera, resolveAndTriggerPatient]);

  // Decode uploaded QR code image file using jsQR
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height);
        if (qr && qr.data) {
          resolveAndTriggerPatient(qr.data);
        } else {
          toast.warning('No QR code found in the uploaded image.');
        }
      };
      if (typeof reader.result === 'string') {
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-modal-title"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 id="qr-scanner-modal-title" className="text-base font-bold text-white">
                Scan Patient Wristband QR
              </h2>
              <p className="text-xs text-slate-400">
                Point your camera at a patient QR code to open their Quick-View chart.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close QR scanner"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Camera Viewfinder */}
          <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${
                cameraStatus === 'active' ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Target Frame */}
            {cameraStatus === 'active' && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-44 h-44 border-2 border-indigo-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(2,6,23,0.45)] relative">
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-emerald-400/80 animate-pulse" />
                </div>
                <span className="mt-3 px-3 py-1 rounded-full bg-slate-950/85 border border-slate-800 text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Camera Active — Align QR Code
                </span>
              </div>
            )}

            {cameraStatus === 'starting' && (
              <div className="text-center space-y-2 p-4">
                <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300 font-medium">Starting device camera...</p>
              </div>
            )}

            {cameraStatus === 'unavailable' && (
              <div className="text-center space-y-2 p-6 max-w-sm">
                <AlertCircle className="w-7 h-7 text-amber-400 mx-auto" />
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              </div>
            )}

            {/* Camera Controls Overlay */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {cameraStatus === 'active' && (
                <button
                  type="button"
                  onClick={() =>
                    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
                  }
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Flip Camera
                </button>
              )}

              <label className="px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-slate-800 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3 h-3 text-indigo-400" />
                <span>Upload QR</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* 1-Click Simulated Wristband Scans (Zero-Setup Fallback) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Quick-Scan Demo Wristband (No physical QR required)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {patients.slice(0, 4).map((pt) => (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() =>
                    resolveAndTriggerPatient(
                      JSON.stringify({ patientId: pt.id, mrn: pt.mrn || `MRN-00${pt.id}` })
                    )
                  }
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-left transition-all cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                      {pt.full_name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      ID #{pt.id} · {pt.department || pt.encounter_type || 'OPD'}
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 text-[10px] font-semibold shrink-0">
                    Scan #{pt.id}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Barcode / Patient ID Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) {
                resolveAndTriggerPatient(manualInput);
              }
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-800"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Or enter Patient ID / MRN code (e.g. 43 or MRN-0043)..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Open Quick-View
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
