import React, { useState, useEffect } from 'react';
import {
  Plug, ExternalLink, ShieldCheck, CheckCircle2,
  Sparkles, Layers, Box, Play
} from 'lucide-react';
import { getSmartApps, type SmartApp } from '@/lib/apiSmart';
import SmartAppSandbox from '@/components/smart/SmartAppSandbox';

export default function AppRegistryPage() {
  const [apps, setApps] = useState<SmartApp[]>([]);
  const [activeApp, setActiveApp] = useState<SmartApp | null>(null);

  useEffect(() => {
    async function load() {
      const list = await getSmartApps();
      setApps(list);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Plug className="w-4 h-4" />
              SMART on FHIR v2 Application Gallery
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">SMART App Registry & Sandbox</h1>
            <p className="text-sm text-slate-400 mt-1">
              Launch third-party clinical calculators, genomics risk advisors, and imaging plugins within a secure OAuth sandbox.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Apps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {apps.map((app) => (
            <div
              key={app.id}
              className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-bold uppercase border border-cyan-500/20">
                    FHIR {app.fhir_version}
                  </span>
                  {app.is_verified && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white mb-2">{app.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{app.description}</p>
                <div className="text-[11px] text-slate-500 mt-3">Author: {app.author}</div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">v{app.version}</span>
                <button
                  onClick={() => setActiveApp(app)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" /> Launch Sandbox
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sandbox Launcher */}
        {activeApp && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Box className="w-4 h-4 text-indigo-400" />
                Active Sandbox: {activeApp.name}
              </h2>
              <button
                onClick={() => setActiveApp(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Sandbox
              </button>
            </div>
            <SmartAppSandbox
              launchUrl={activeApp.launch_uri}
              launchToken="smart_sandbox_token"
              onClose={() => setActiveApp(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
