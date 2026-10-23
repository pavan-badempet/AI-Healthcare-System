import React, { useState } from 'react';
import {
  Sparkles, Activity, AlertTriangle, CheckCircle2,
  HelpCircle, RefreshCw, ArrowRight, ShieldCheck, ShieldAlert
} from 'lucide-react';
import type { PredictionResult } from '@/lib/api';

export interface FormField {
  name: string;
  label: string;
  type: 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
}

interface PredictionFormProps {
  title: string;
  description: string;
  fields: FormField[];
  onSubmit: (data: Record<string, any>) => Promise<PredictionResult>;
  modelName?: string;
}

export default function PredictionForm({
  title,
  description,
  fields,
  onSubmit,
  modelName,
}: PredictionFormProps) {
  const initialValues: Record<string, any> = {};
  fields.forEach((f) => {
    initialValues[f.name] = f.placeholder ? Number(f.placeholder) || f.placeholder : (f.options ? f.options[0].value : '');
  });

  const [formData, setFormData] = useState<Record<string, any>>(initialValues);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFillDemo = () => {
    const demo: Record<string, any> = {};
    fields.forEach((f) => {
      demo[f.name] = f.placeholder ? Number(f.placeholder) || f.placeholder : (f.options ? f.options[0].value : 0);
    });
    setFormData(demo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onSubmit(formData);
      setResult(res);
    } catch (err: any) {
      console.error('Prediction failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Form Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              TabICLv2 Foundation Model
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">{title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">{description}</p>
          </div>

          <button
            type="button"
            onClick={handleFillDemo}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Fill Demo Vitals
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={formData[field.name] ?? ''}
                    onChange={(e) => handleChange(field.name, Number(e.target.value) || e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {field.options?.map((opt) => (
                      <option key={String(opt.value)} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    step={field.step || 1}
                    value={formData[field.name] ?? ''}
                    onChange={(e) => handleChange(field.name, e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Evaluating Tabular In-Context Transformer...' : 'Execute Calibrated Prediction'}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono text-indigo-400 font-semibold uppercase tracking-wider">
                Inference Result
              </span>
              <h3 className="text-2xl font-black text-white mt-1">{result.prediction}</h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Confidence</span>
                <div className="text-lg font-bold text-white font-mono">
                  {typeof result.confidence === 'number' ? `${result.confidence}%` : result.confidence}
                </div>
              </div>
              <span
                className={`px-3 py-1.5 rounded-full text-xs font-extrabold uppercase border ${
                  result.risk_level?.toLowerCase() === 'high' || result.risk_level?.toLowerCase() === 'critical'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : result.risk_level?.toLowerCase() === 'moderate'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {result.risk_level || 'Evaluated'}
              </span>
            </div>
          </div>

          {/* Conformal Bounds Section */}
          {result.conformal_bounds && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Conformal Prediction Set ({Math.round(result.conformal_bounds.confidence_level * 100)}% Coverage Guarantee)
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  p-value: [{result.conformal_bounds.lower_p_value}, {result.conformal_bounds.upper_p_value}]
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {result.conformal_bounds.prediction_set?.map((item: string) => (
                  <span
                    key={item}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Probabilities Breakdown */}
          {result.probabilities && (
            <div className="space-y-2">
              <span className="text-xs font-mono text-slate-400 uppercase">Class Probabilities</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(result.probabilities).map(([label, prob]) => (
                  <div key={label} className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block truncate">{label}</span>
                    <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                      {(Number(prob) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medical Disclaimer */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-300 leading-relaxed">
              Clinical decision support only: This evaluation does not replace professional diagnostic judgment or physician assessment. Always consult a qualified clinician for medical advice or in the event of an emergency.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
