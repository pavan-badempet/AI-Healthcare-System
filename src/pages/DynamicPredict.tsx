import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import PredictionForm from '@/components/predict/PredictionForm';
import {
  predictDiabetes, predictHeart, predictKidney,
  predictLiver, predictLungs, type PredictionResult
} from '@/lib/api';

const MODEL_CONFIGS: Record<string, {
  title: string;
  description: string;
  fields: any[];
  fn: (data: Record<string, any>) => Promise<PredictionResult>;
}> = {
  diabetes: {
    title: 'Type 2 Diabetes Screening',
    description: 'Calibrated TabICLv2 classifier predicting prediabetes & Type 2 Diabetes onset with 95% conformal bounds.',
    fn: predictDiabetes,
    fields: [
      { name: 'age', label: 'Age (Years)', type: 'number', min: 18, max: 100, placeholder: '52' },
      { name: 'bmi', label: 'BMI (kg/m²)', type: 'number', min: 15, max: 50, step: 0.1, placeholder: '28.4' },
      { name: 'glucose', label: 'Fasting Blood Glucose (mg/dL)', type: 'number', min: 60, max: 300, placeholder: '115' },
      { name: 'bp', label: 'Systolic Blood Pressure (mmHg)', type: 'number', min: 80, max: 200, placeholder: '130' },
      {
        name: 'hypertension',
        label: 'Hypertension Diagnosis',
        type: 'select',
        options: [{ label: 'No', value: 0 }, { label: 'Yes', value: 1 }],
      },
    ],
  },
  heart: {
    title: 'Cardiovascular Risk Calculator',
    description: 'Cleveland ASCVD ensemble evaluating coronary artery stenosis probability.',
    fn: predictHeart,
    fields: [
      { name: 'age', label: 'Age (Years)', type: 'number', min: 20, max: 90, placeholder: '58' },
      { name: 'chol', label: 'Serum Cholesterol (mg/dL)', type: 'number', min: 100, max: 400, placeholder: '210' },
      { name: 'trestbps', label: 'Resting Blood Pressure (mmHg)', type: 'number', min: 80, max: 200, placeholder: '135' },
      { name: 'thalach', label: 'Max Heart Rate (bpm)', type: 'number', min: 60, max: 220, placeholder: '150' },
      {
        name: 'cp',
        label: 'Chest Pain Type',
        type: 'select',
        options: [
          { label: 'Typical Angina', value: 0 },
          { label: 'Atypical Angina', value: 1 },
          { label: 'Non-anginal Pain', value: 2 },
          { label: 'Asymptomatic', value: 3 },
        ],
      },
    ],
  },
  kidney: {
    title: 'Chronic Kidney Disease (CKD) Matrix',
    description: 'KDIGO 2026-aligned renal function and progression classifier.',
    fn: predictKidney,
    fields: [
      { name: 'age', label: 'Age (Years)', type: 'number', min: 18, max: 95, placeholder: '62' },
      { name: 'bp', label: 'Blood Pressure (mmHg)', type: 'number', min: 70, max: 180, placeholder: '125' },
      { name: 'sc', label: 'Serum Creatinine (mg/dL)', type: 'number', min: 0.4, max: 8.0, step: 0.1, placeholder: '1.2' },
      { name: 'bgr', label: 'Blood Glucose Random (mg/dL)', type: 'number', min: 70, max: 350, placeholder: '120' },
    ],
  },
  liver: {
    title: 'Hepatic Fibrosis & NAFLD Assessment',
    description: 'Non-invasive hepatic steatosis and FIB-4 progression scoring.',
    fn: predictLiver,
    fields: [
      { name: 'age', label: 'Age (Years)', type: 'number', min: 18, max: 90, placeholder: '48' },
      { name: 'bmi', label: 'BMI (kg/m²)', type: 'number', min: 16, max: 50, step: 0.1, placeholder: '27.8' },
      { name: 'alt', label: 'Alanine Aminotransferase (ALT, U/L)', type: 'number', min: 5, max: 200, placeholder: '35' },
      { name: 'ast', label: 'Aspartate Aminotransferase (AST, U/L)', type: 'number', min: 5, max: 200, placeholder: '30' },
    ],
  },
  lungs: {
    title: 'Pulmonary Obstruction & COPD Staging',
    description: 'GOLD spirometry classification evaluating FEV1/FVC ratios.',
    fn: predictLungs,
    fields: [
      { name: 'age', label: 'Age (Years)', type: 'number', min: 20, max: 90, placeholder: '60' },
      { name: 'fev1', label: 'FEV1 (% predicted)', type: 'number', min: 20, max: 120, placeholder: '78' },
      {
        name: 'smoking',
        label: 'Smoking History',
        type: 'select',
        options: [{ label: 'Non-Smoker', value: 0 }, { label: 'Former Smoker', value: 1 }, { label: 'Active Smoker', value: 2 }],
      },
    ],
  },
};

export default function DynamicPredict() {
  const { modelType } = useParams<{ modelType: string }>();
  const config = MODEL_CONFIGS[modelType || 'diabetes'] || MODEL_CONFIGS.diabetes;

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/predict"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Prediction Models
          </Link>
          <span className="text-[10px] text-indigo-400 font-mono font-bold bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            TabICLv2 Foundation Model
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8">
        <PredictionForm
          title={config.title}
          description={config.description}
          fields={config.fields}
          onSubmit={async (data) => config.fn(data)}
          modelName={modelType}
        />
      </div>
    </div>
  );
}
