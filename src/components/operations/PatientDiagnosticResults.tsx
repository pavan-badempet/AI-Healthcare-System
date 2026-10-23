import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Info } from 'lucide-react';

interface PatientDiagnosticResultsProps {
  patientId: number;
}

export default function PatientDiagnosticResults({ patientId }: PatientDiagnosticResultsProps) {
  const labResults = [
    { name: 'Hemoglobin A1c', value: 6.8, unit: '%', refRange: '< 5.7', status: 'elevated', interpretation: 'Pre-diabetes / Early Type 2 glycemic range' },
    { name: 'Fasting Plasma Glucose', value: 114, unit: 'mg/dL', refRange: '70 - 99', status: 'elevated', interpretation: 'Impaired fasting glucose' },
    { name: 'Estimated GFR (eGFR)', value: 88, unit: 'mL/min/1.73m²', refRange: '> 60', status: 'normal', interpretation: 'Adequate renal filtration' },
    { name: 'Serum Creatinine', value: 0.98, unit: 'mg/dL', refRange: '0.6 - 1.2', status: 'normal', interpretation: 'Within normal limits' },
    { name: 'High-Sensitivity Troponin-I', value: 8.2, unit: 'ng/L', refRange: '< 14.0', status: 'normal', interpretation: 'No myocardial necrosis detected' },
    { name: 'Total Cholesterol', value: 198, unit: 'mg/dL', refRange: '< 200', status: 'normal', interpretation: 'Desirable lipid concentration' },
    { name: 'LDL-C Direct', value: 118, unit: 'mg/dL', refRange: '< 100', status: 'elevated', interpretation: 'Borderline elevated atherogenic lipoprotein' },
    { name: 'Alanine Aminotransferase (ALT)', value: 44, unit: 'U/L', refRange: '7 - 56', status: 'normal', interpretation: 'Normal hepatic transaminase' },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
        <div>
          <h3 className="text-lg font-bold text-white">Quantitative Laboratory Profile</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Standardized LOINC clinical biomarkers linked to OMOP CDM v5.4 person record.
          </p>
        </div>
        <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          Last Drawn: 4h ago
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <th className="py-3 px-3">Analyte / Biomarker</th>
              <th className="py-3 px-3">Result</th>
              <th className="py-3 px-3">Standard Unit</th>
              <th className="py-3 px-3">Reference Range</th>
              <th className="py-3 px-3">Clinical Evaluation</th>
              <th className="py-3 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {labResults.map((lab, idx) => (
              <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-3 font-semibold text-white">{lab.name}</td>
                <td className="py-3 px-3 font-mono font-bold text-slate-200">{lab.value}</td>
                <td className="py-3 px-3 font-mono text-slate-400">{lab.unit}</td>
                <td className="py-3 px-3 font-mono text-slate-400">{lab.refRange}</td>
                <td className="py-3 px-3 text-slate-300">{lab.interpretation}</td>
                <td className="py-3 px-3 text-right">
                  {lab.status === 'elevated' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-3 h-3" /> Elevated
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> Normal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
