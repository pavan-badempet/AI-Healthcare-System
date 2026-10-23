import React from 'react';
import {
  Sparkles, Award, Database, Cpu, ShieldCheck,
  CheckCircle2, ExternalLink, GitBranch, Layers
} from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Open-Source Clinical Intelligence Platform
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">About AI Healthcare System</h1>
          <p className="text-sm text-slate-400 mt-1">
            Planetary-scale clinical intelligence featuring the TabICLv2 tabular foundation model, Databricks Delta Lakehouse (OMOP CDM v5.4), and 10-year multi-organ digital twin simulations.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-8">
        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">TabICLv2 Foundation Model</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inria Soda's #1 ranked open-source tabular foundation model on TabArena. Zero token costs, local inference capability, calibrated for 5 organ systems with 95% conformal confidence coverage sets.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Databricks Delta Lakehouse</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized Medallion architecture (Bronze ingestion, Silver cleaning, Gold aggregations) mapped to OHDSI OMOP CDM v5.4 and HL7 FHIR R4 interoperability schemas with time-travel audit logs.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Rust PID 1 Edge Proxy</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Axum + Tokio high-performance reverse proxy with PyO3 FFI in-process Python interop, mimalloc memory allocator, and zero-copy binary serialization for sub-millisecond route latency.
            </p>
          </div>
        </div>

        {/* Clinical Disclaimer */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Clinical Intended Use & Regulatory Statement
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            The AI Healthcare System is an open-source clinical research and decision support platform intended for qualified healthcare practitioners. All risk scores, digital twin trajectories, and medication alerts are assistive recommendations and must be independently verified by attending clinical staff.
          </p>
        </div>
      </div>
    </div>
  );
}
