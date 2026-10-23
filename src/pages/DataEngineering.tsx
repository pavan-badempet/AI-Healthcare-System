import React from 'react';
import { Database, GitBranch, Layers, Sparkles } from 'lucide-react';
import DataEngineeringPanel from '@/components/admin/DataEngineeringPanel';

export default function DataEngineeringPage() {
  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Database className="w-4 h-4" />
              Databricks Medallion Lakehouse Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Data Engineering & OMOP CDM</h1>
            <p className="text-sm text-slate-400 mt-1">
              Delta Lake Bronze/Silver/Gold ingestion pipelines, Great Expectations quality gates, and time-travel querying.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <DataEngineeringPanel />
      </div>
    </div>
  );
}
