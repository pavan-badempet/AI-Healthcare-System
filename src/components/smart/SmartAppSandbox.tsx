import React, { useState } from 'react';
import { ShieldCheck, Play, ExternalLink, RefreshCw, X, Box, CheckCircle2 } from 'lucide-react';

interface SmartAppSandboxProps {
  launchUrl: string;
  launchToken: string;
  onClose?: () => void;
}

export default function SmartAppSandbox({ launchUrl, launchToken, onClose }: SmartAppSandboxProps) {
  const [activeStep, setActiveStep] = useState<'auth' | 'scope' | 'running'>('running');

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Box className="w-4 h-4" />
            SMART EHR Launch Context (EHR-Mediated Sandbox)
          </div>
          <h3 className="text-xl font-bold text-white mt-1">Isolated App Execution Environment</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Scopes: <span className="font-mono text-indigo-300">patient/*.read launch/patient openid fhirUser</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            OAuth Token Active
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Simulated SMART Application Canvas */}
      <div className="mt-6 rounded-2xl bg-slate-950 border border-slate-800 p-6 min-h-[320px] flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                SMART
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Clinical Calculator & Decision Assistant</h4>
                <div className="text-[11px] text-slate-400 font-mono">Launch URI: {launchUrl}</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/50">
              Patient #42 (Eleanor Vance)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Framingham 10-Yr CVD Risk</span>
              <div className="text-2xl font-bold text-white mt-1">7.4%</div>
              <span className="text-[10px] text-emerald-400">Low-to-Intermediate Risk Category</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">CHA₂DS₂-VASc Score</span>
              <div className="text-2xl font-bold text-white mt-1">2</div>
              <span className="text-[10px] text-amber-400">Oral Anticoagulant Recommended</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">CKD-EPI eGFR 2021</span>
              <div className="text-2xl font-bold text-white mt-1">88.2</div>
              <span className="text-[10px] text-indigo-400">Stage G2 (Mild Decreased)</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>FHIR Server Endpoint: <code className="text-slate-400">https://fhir.clinos.internal/r4</code></span>
          <span>Verified Security Sandbox</span>
        </div>
      </div>
    </div>
  );
}
