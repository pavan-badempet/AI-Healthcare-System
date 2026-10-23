import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Activity, Heart, ShieldCheck,
  Stethoscope, Wind, ArrowRight, Layers, Award
} from 'lucide-react';
import { DifferentialDiagnosisAssistant } from '../components/operations/DifferentialDiagnosisAssistant';

const MODELS = [
  {
    id: 'diabetes',
    title: 'Type 2 Diabetes Mellitus',
    desc: 'ADA 2026 Standards-compliant glycemic trajectory and pre-diabetes risk prediction.',
    accuracy: '99.5% AUC',
    conformal: '95% Conformal Set',
    icon: Activity,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    id: 'heart',
    title: 'Cardiovascular & Coronary Artery Disease',
    desc: 'Framingham and ASCVD calibrated 10-year major adverse cardiac event (MACE) risk.',
    accuracy: '95.0% AUC',
    conformal: '95% Conformal Set',
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  {
    id: 'kidney',
    title: 'Chronic Kidney Disease (CKD)',
    desc: 'KDIGO 2026 risk matrix evaluating eGFR clearance, proteinuria, and progression stages.',
    accuracy: '100% Calibrated',
    conformal: '95% Conformal Set',
    icon: ShieldCheck,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
  },
  {
    id: 'liver',
    title: 'Hepatic & Liver Fibrosis',
    desc: 'FIB-4 and NAFLD non-invasive scoring paired with TabICL quad-ensemble classification.',
    accuracy: '100% Calibrated',
    conformal: '95% Conformal Set',
    icon: Stethoscope,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  {
    id: 'lungs',
    title: 'Pulmonary & Respiratory Disease',
    desc: 'GOLD spirometry classification, COPD staging, and acute exacerbation risk prediction.',
    accuracy: '100% Calibrated',
    conformal: '95% Conformal Set',
    icon: Wind,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

export default function Predict() {
  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              TabICLv2 Sovereign Tabular Foundation Models &amp; Bayesian DDx
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Calibrated Diagnostic AI &amp; Differential Diagnosis Assistant
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Guaranteed 95% conformal confidence coverage sets, Bayesian symptom-to-diagnosis synthesis, and peer-reviewed medical literature grounding.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/predict/unified"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Open Unified Multi-Organ Hub
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* AI Differential Diagnosis Assistant Module */}
        <DifferentialDiagnosisAssistant initialPatientId={43} />

        {/* Banner Feature */}
        <div className="bg-gradient-to-r from-indigo-950/50 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Award className="w-4 h-4" /> #1 Ranked Open-Source Foundation Model on TabArena
            </div>
            <h2 className="text-lg font-bold text-white">Inria Soda TabICLv2 Sovereign Inference</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Trained on 500,000+ clinical and biological tabular datasets. 0 token cost, 0 API keys required, running locally or on edge gateway proxies.
            </p>
          </div>
          <Link
            to="/predict/unified"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap"
          >
            Run 5-Organ Screen &rarr;
          </Link>
        </div>

        {/* 5 Disease Model Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MODELS.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.id}
                className="bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-2xl p-6 flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl ${m.bg} ${m.border} border flex items-center justify-center ${m.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      {m.accuracy}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">{m.conformal}</span>
                  <Link
                    to={`/predict/${m.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Launch Calculator <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
