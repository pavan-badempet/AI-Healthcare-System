import React, { useState } from 'react';
import {
  ShieldCheck, CheckCircle2, User, Key,
  ExternalLink, FileText, ArrowRight, RefreshCw
} from 'lucide-react';
import { AbdmHealthIdModal } from '@/components/modals/AbdmHealthIdModal';

export default function ABDMIntegrationPage() {
  const [showModal, setShowModal] = useState<boolean>(false);
  const [abhaAddress, setAbhaAddress] = useState<string>('patient42@abdm');
  const [consentStatus, setConsentStatus] = useState<'GRANTED' | 'REQUESTED' | 'REVOKED'>('GRANTED');

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              Ayushman Bharat Digital Mission (ABDM) Gateway
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">ABHA & National Health Network</h1>
            <p className="text-sm text-slate-400 mt-1">
              ABHA Health ID creation, consent manager (HIU / HIP) bridge, and Aadhaar/OTP federated authentication.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5" /> Create / Link ABHA ID
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <span className="text-xs text-slate-400">Linked ABHA Address</span>
            <div className="text-lg font-bold text-white mt-1 font-mono">{abhaAddress}</div>
            <span className="text-[11px] text-emerald-400 font-medium">Verified by National Health Authority (NHA)</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <span className="text-xs text-slate-400">Consent Artefact Status</span>
            <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">{consentStatus}</div>
            <span className="text-[11px] text-slate-400">Purpose: Care Management & Diagnostic Review</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <span className="text-xs text-slate-400">HIP / HIU Node Status</span>
            <div className="text-lg font-bold text-cyan-400 mt-1 font-mono">ACTIVE (M2/M3 Compliance)</div>
            <span className="text-[11px] text-cyan-400 font-medium">FHIR R4 DiagnosticReport Push Enabled</span>
          </div>
        </div>

        {/* Consent Flow Overview */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            ABDM Milestone 1, 2 & 3 Compliance Architecture
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            Complies with ABDM Sandbox v1.0 specifications for Health Information Provider (HIP) and Health Information User (HIU).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-emerald-400 block mb-1">M1: ABHA Registration</span>
              <p className="text-slate-400">Aadhaar and mobile OTP generation for 14-digit ABHA ID and PHR address linking.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-cyan-400 block mb-1">M2: HIP Data Transfer</span>
              <p className="text-slate-400">ECDH Diffie-Hellman key exchange for encrypted end-to-end FHIR bundle transmission.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-indigo-400 block mb-1">M3: HIU Consent Engine</span>
              <p className="text-slate-400">Consent request initiation, notification webhooks, and granular resource-level access control.</p>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <AbdmHealthIdModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
