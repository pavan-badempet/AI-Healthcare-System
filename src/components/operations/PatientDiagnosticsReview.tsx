import React, { useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-react';
import { toast } from '@/lib/toast';

interface PatientDiagnosticsReviewProps {
  patientId: number;
}

export default function PatientDiagnosticsReview({ patientId }: PatientDiagnosticsReviewProps) {
  const [reports, setReports] = useState([
    {
      id: 'LAB-9041',
      title: 'Comprehensive Metabolic Panel & Liver Function',
      modality: 'Pathology / Clinical Chemistry',
      ordered_date: '2026-05-24',
      status: 'pending_review',
      ai_summary: 'Slightly elevated ALT (52 U/L) and AST (44 U/L) consistent with mild metabolic hepatic stress. Renal markers within normal reference limits.',
      priority: 'routine',
    },
    {
      id: 'RAD-1108',
      title: 'Portable AP Chest Radiography',
      modality: 'Radiology / X-Ray',
      ordered_date: '2026-05-24',
      status: 'pending_review',
      ai_summary: 'Clear bilateral lung fields without focal consolidation, pneumothorax, or pleural effusion. Cardiothoracic ratio is normal (0.46).',
      priority: 'urgent',
    },
  ]);

  const handleSignOff = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'reviewed' } : r))
    );
    toast.success(`Diagnostic report ${id} signed and verified in medical record.`);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
        <FileText className="w-4 h-4" />
        Clinical Attestation
      </div>
      <h3 className="text-xl font-bold text-white">Pending Diagnostic Reviews</h3>
      <p className="text-xs text-slate-400 mt-1">
        Physician verification queue for incoming pathology panels, radiological reads, and AI preliminary syntheses.
      </p>

      <div className="mt-6 space-y-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 transition-colors hover:border-slate-700"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold text-indigo-400">{report.id}</span>
                  <h4 className="text-sm font-bold text-white">{report.title}</h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                    {report.modality}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                  <span>Ordered: {report.ordered_date}</span>
                  <span>•</span>
                  <span className="capitalize text-amber-400 font-medium">Priority: {report.priority}</span>
                </div>
              </div>

              {report.status === 'pending_review' ? (
                <button
                  onClick={() => handleSignOff(report.id)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2 shrink-0"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Sign & Attest
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <CheckCircle2 className="w-4 h-4" />
                  Signed by Attending
                </div>
              )}
            </div>

            <div className="mt-3.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-semibold text-purple-300 block mb-0.5">
                  Preliminary AI Synthesis (Decision Support)
                </span>
                {report.ai_summary}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
