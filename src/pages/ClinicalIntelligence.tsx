import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, Users
} from 'lucide-react';
import { SotaClinicalStudio } from '@/components/SotaClinicalStudio';
import { DifferentialDiagnosisAssistant } from '@/components/operations/DifferentialDiagnosisAssistant';
import { getConsensusReport, type ConsensusCouncilReport } from '@/lib/apiIntelligence';

export default function ClinicalIntelligencePage() {
  const [report, setReport] = useState<ConsensusCouncilReport | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getConsensusReport(42);
        setReport(data);
      } catch {
        // Fallback handled inside apiIntelligence
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <BrainCircuit className="w-4 h-4" />
              Evidence-Based Clinical Decision Support (CDSS)
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Clinical Intelligence Hub</h1>
            <p className="text-sm text-slate-400 mt-1">
              AI Differential Diagnosis synthesis, 109 validated guideline algorithms, Bayesian multi-specialist consensus councils, and pharmacogenomic safety rules.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* AI Differential Diagnosis Assistant */}
        <DifferentialDiagnosisAssistant initialPatientId={42} />

        {/* Consensus Council Strip */}
        {report && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Bayesian Clinical Consensus Council (Patient #42 Case)
              </h2>
              <span className="text-xs font-mono text-emerald-400">
                Agreement W: {report.kendall_tau_agreement}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-4">{report.clinical_summary}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.opinions.map((op, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="font-bold text-indigo-400 block mb-1">{op.specialist}</span>
                  <p className="text-slate-300 leading-relaxed">{op.recommendation}</p>
                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500">
                    Evidence: {op.evidence_citations.join(' · ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 109 Algorithms Decision Support Suite */}
        <SotaClinicalStudio />
      </div>
    </div>
  );
}
