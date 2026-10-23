/**
 * AI Healthcare System — Differential Diagnosis Assistant Module
 *
 * Interactive AI-assisted clinical differential diagnosis workbench that
 * evaluates presenting symptoms, vital signs, and laboratory biomarkers to
 * generate ranked differential diagnoses with calibrated confidence intervals,
 * diagnostic workup orders, and peer-reviewed medical literature references.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Stethoscope,
  Sparkles,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  Activity,
  FileSearch,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  ClipboardCheck,
} from 'lucide-react';
import {
  SymptomInputProfile,
  DifferentialDiagnosisReport,
  DifferentialDiagnosisCandidate,
  MedicalLiteratureCitation,
  SYMPTOM_CATALOG,
  PRESET_PATIENT_PROFILES,
  analyzeDifferentialDiagnosis,
  fetchLiveMedicalLiterature,
} from '../../lib/differentialDiagnosisService';
import { usePrivacyStore, maskPatientName, maskMrn } from '@/lib/privacy';
import { toast } from '@/lib/toast';

interface DifferentialDiagnosisAssistantProps {
  initialPatientId?: number;
}

export const DifferentialDiagnosisAssistant: React.FC<DifferentialDiagnosisAssistantProps> = ({
  initialPatientId = 43,
}) => {
  const { isPrivacyMode } = usePrivacyStore();
  const [selectedPatientId, setSelectedPatientId] = useState<number>(initialPatientId);
  const [profile, setProfile] = useState<SymptomInputProfile>(
    () => PRESET_PATIENT_PROFILES[initialPatientId] || PRESET_PATIENT_PROFILES[43]
  );
  const [customSymptomInput, setCustomSymptomInput] = useState('');
  const [report, setReport] = useState<DifferentialDiagnosisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [stagedOrders, setStagedOrders] = useState<Record<string, boolean>>({});
  const [liveCitationsMap, setLiveCitationsMap] = useState<Record<string, MedicalLiteratureCitation[]>>({});
  const [loadingLiteratureId, setLoadingLiteratureId] = useState<string | null>(null);

  const runAnalysis = useCallback(async (inputProfile: SymptomInputProfile) => {
    setIsAnalyzing(true);
    try {
      const generated = await analyzeDifferentialDiagnosis(inputProfile);
      setReport(generated);
      if (generated.candidates.length > 0) {
        setExpandedCandidateId(generated.candidates[0].id);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    const nextPreset = PRESET_PATIENT_PROFILES[initialPatientId];
    if (nextPreset) {
      setSelectedPatientId(initialPatientId);
      setProfile(nextPreset);
      void runAnalysis(nextPreset);
    }
  }, [initialPatientId, runAnalysis]);

  const handleSelectPatientPreset = (patientId: number) => {
    const preset = PRESET_PATIENT_PROFILES[patientId];
    if (!preset) return;
    setSelectedPatientId(patientId);
    setProfile(preset);
    void runAnalysis(preset);
    toast.success(`Loaded clinical presentation for ${maskPatientName(preset.patientLabel.split(' (')[0], patientId, isPrivacyMode)}`);
  };

  const handleToggleSymptom = (symptomLabel: string) => {
    setProfile((prev) => {
      const exists = prev.selectedSymptoms.includes(symptomLabel);
      const updatedSymptoms = exists
        ? prev.selectedSymptoms.filter((s) => s !== symptomLabel)
        : [...prev.selectedSymptoms, symptomLabel];
      return { ...prev, selectedSymptoms: updatedSymptoms };
    });
  };

  const handleAddCustomSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customSymptomInput.trim();
    if (!trimmed) return;
    if (!profile.selectedSymptoms.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        selectedSymptoms: [...prev.selectedSymptoms, trimmed],
      }));
    }
    setCustomSymptomInput('');
  };

  const handleFetchLivePubMed = async (candidate: DifferentialDiagnosisCandidate) => {
    setLoadingLiteratureId(candidate.id);
    try {
      const liveRefs = await fetchLiveMedicalLiterature(candidate.conditionName, 3);
      if (liveRefs.length > 0) {
        setLiveCitationsMap((prev) => ({
          ...prev,
          [candidate.id]: liveRefs,
        }));
        toast.success(`Retrieved ${liveRefs.length} live MEDLINE / Europe PMC references for ${candidate.conditionName}`);
      } else {
        toast.info('Using curated high-impact guideline references (live query returned no additional entries).');
      }
    } finally {
      setLoadingLiteratureId(null);
    }
  };

  const handleToggleOrderStage = (orderText: string) => {
    setStagedOrders((prev) => {
      const nextState = !prev[orderText];
      if (nextState) {
        toast.success(`Diagnostic order queued: ${orderText}`);
      }
      return { ...prev, [orderText]: nextState };
    });
  };

  const formatPatientDisplay = (rawLabel: string) => {
    if (!isPrivacyMode) return rawLabel;
    const [namePart, restPart] = rawLabel.split(' (');
    const maskedName = maskPatientName(namePart, selectedPatientId, true);
    const maskedRest = restPart ? restPart.replace(/MRN-\d+/g, (m) => maskMrn(m, selectedPatientId, true)) : '';
    return maskedRest ? `${maskedName} (${maskedRest}` : maskedName;
  };

  return (
    <section
      aria-label="AI Differential Diagnosis Assistant"
      className="bg-white/95 dark:bg-slate-900/95 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors"
    >
      {/* Header Bar */}
      <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="w-5 h-5 text-teal-400 shrink-0" />
            <span className="text-xs font-mono uppercase tracking-widest text-teal-300">
              Bayesian CDSS · Conformal Probability Calibration · MEDLINE Grounded
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            AI Differential Diagnosis &amp; Literature Synthesis Engine
          </h2>
          <p className="text-xs text-slate-300 max-w-3xl">
            Evaluates presenting symptoms, hemodynamic vitals, and laboratory biomarkers to rank candidate diagnoses with 95% conformal confidence intervals and verifiable peer-reviewed medical literature.
          </p>
        </div>

        {/* Active Patient Cohort Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {[43, 42, 44].map((ptId) => {
            const preset = PRESET_PATIENT_PROFILES[ptId];
            const isSelected = selectedPatientId === ptId;
            const shortName = maskPatientName(preset.patientLabel.split(' (')[0], ptId, isPrivacyMode);
            return (
              <button
                key={ptId}
                type="button"
                onClick={() => handleSelectPatientPreset(ptId)}
                aria-pressed={isSelected}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-sm'
                    : 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {shortName} · #{ptId}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split Workbench */}
      <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-200 dark:divide-slate-800">
        {/* Left Column: Clinical Presentation & Symptom Matrix (5 cols) */}
        <div className="xl:col-span-5 p-6 space-y-5 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                1. Clinical Presentation &amp; Phenotype
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {formatPatientDisplay(profile.patientLabel)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void runAnalysis(profile)}
              disabled={isAnalyzing}
              aria-label="Recompute differential diagnosis"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              {isAnalyzing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isAnalyzing ? 'Synthesizing...' : 'Run AI Differential'}</span>
            </button>
          </div>

          {/* Chief Complaint & Biomarkers */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="ddx-chief-complaint"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Chief Complaint &amp; Onset Trajectory
              </label>
              <input
                id="ddx-chief-complaint"
                type="text"
                value={profile.chiefComplaint}
                onChange={(e) => setProfile((prev) => ({ ...prev, chiefComplaint: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="ddx-clinical-hpi"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                History of Present Illness (HPI) &amp; Physical Exam Findings
              </label>
              <textarea
                id="ddx-clinical-hpi"
                rows={3}
                value={profile.freeTextClinicalNotes}
                onChange={(e) => setProfile((prev) => ({ ...prev, freeTextClinicalNotes: e.target.value }))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="ddx-biomarkers"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Key Laboratory Biomarkers &amp; Blood Gas
              </label>
              <input
                id="ddx-biomarkers"
                type="text"
                value={profile.keyBiomarkers}
                onChange={(e) => setProfile((prev) => ({ ...prev, keyBiomarkers: e.target.value }))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Hemodynamic Vital Signs Grid */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Bedside Hemodynamics &amp; Vitals
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
                <label htmlFor="vital-hr" className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Heart Rate (bpm)
                </label>
                <input
                  id="vital-hr"
                  type="number"
                  value={profile.vitals.heartRateBpm}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      vitals: { ...prev.vitals, heartRateBpm: Number(e.target.value) || 0 },
                    }))
                  }
                  className="w-full mt-0.5 text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
                <label htmlFor="vital-sbp" className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Systolic BP (mmHg)
                </label>
                <input
                  id="vital-sbp"
                  type="number"
                  value={profile.vitals.systolicBpMmHg}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      vitals: { ...prev.vitals, systolicBpMmHg: Number(e.target.value) || 0 },
                    }))
                  }
                  className="w-full mt-0.5 text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
                <label htmlFor="vital-spo2" className="block text-[11px] text-slate-500 dark:text-slate-400">
                  SpO2 (%)
                </label>
                <input
                  id="vital-spo2"
                  type="number"
                  value={profile.vitals.spo2Percent}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      vitals: { ...prev.vitals, spo2Percent: Number(e.target.value) || 0 },
                    }))
                  }
                  className="w-full mt-0.5 text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
                <label htmlFor="vital-temp" className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Temp (°C)
                </label>
                <input
                  id="vital-temp"
                  type="number"
                  step="0.1"
                  value={profile.vitals.temperatureC}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      vitals: { ...prev.vitals, temperatureC: Number(e.target.value) || 37.0 },
                    }))
                  }
                  className="w-full mt-0.5 text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
                <label htmlFor="vital-rr" className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Resp Rate (rpm)
                </label>
                <input
                  id="vital-rr"
                  type="number"
                  value={profile.vitals.respiratoryRateRpm}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      vitals: { ...prev.vitals, respiratoryRateRpm: Number(e.target.value) || 16 },
                    }))
                  }
                  className="w-full mt-0.5 text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700">
                <label htmlFor="vital-dbp" className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Diastolic BP (mmHg)
                </label>
                <input
                  id="vital-dbp"
                  type="number"
                  value={profile.vitals.diastolicBpMmHg}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      vitals: { ...prev.vitals, diastolicBpMmHg: Number(e.target.value) || 60 },
                    }))
                  }
                  className="w-full mt-0.5 text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Interactive Symptom Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Active Presenting Symptoms ({profile.selectedSymptoms.length} selected)
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_CATALOG.map((item) => {
                const isSelected = profile.selectedSymptoms.includes(item.label);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleToggleSymptom(item.label)}
                    aria-pressed={isSelected}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Add custom clinical finding */}
            <form onSubmit={handleAddCustomSymptom} className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add custom finding (e.g., JVD, S3 gallop, friction rub)..."
                value={customSymptomInput}
                onChange={(e) => setCustomSymptomInput(e.target.value)}
                aria-label="Add custom clinical symptom"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Ranked Differential Diagnoses & Medical Literature (7 cols) */}
        <div className="xl:col-span-7 p-6 space-y-5">
          {report && (
            <>
              {/* Synopsis Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-teal-300">
                  <span>
                    {report.engineModel} · {report.reportId}
                  </span>
                  <span>{report.triageDisposition}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{report.clinicalSynopsis}</p>
              </div>

              {/* Ranked Candidate List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    2. Ranked Differential Diagnoses &amp; Evidence Grounding
                  </h3>
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {report.calibrationMethod}
                  </span>
                </div>

                {report.candidates.map((candidate, rankIdx) => {
                  const isExpanded = expandedCandidateId === candidate.id;
                  const liveCitations = liveCitationsMap[candidate.id] || [];
                  const allCitations = [...liveCitations, ...candidate.citations];

                  const urgencyColor =
                    candidate.urgency === 'emergent'
                      ? 'text-rose-600 dark:text-rose-400'
                      : candidate.urgency === 'urgent'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-teal-600 dark:text-teal-400';

                  const barColor =
                    candidate.confidenceScore >= 75
                      ? 'bg-rose-500'
                      : candidate.confidenceScore >= 50
                        ? 'bg-amber-500'
                        : 'bg-indigo-500';

                  return (
                    <article
                      key={candidate.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all"
                    >
                      {/* Candidate Summary Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedCandidateId(isExpanded ? null : candidate.id)}
                        aria-expanded={isExpanded}
                        className="w-full p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                            <span className="font-bold text-slate-900 dark:text-white">
                              #{rankIdx + 1}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className={`font-semibold uppercase ${urgencyColor}`}>
                              {candidate.urgency}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600 dark:text-slate-400">
                              ICD-10 {candidate.icd10Code}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              SNOMED {candidate.snomedCode}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-indigo-600 dark:text-indigo-400">
                              {candidate.specialty}
                            </span>
                          </div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-white">
                            {candidate.conditionName}
                          </h4>
                        </div>

                        {/* Confidence Score & Conformal Interval */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="w-40 space-y-1">
                            <div className="flex items-baseline justify-between text-xs font-mono">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {candidate.confidenceScore}% Posterior
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                95% CI [{candidate.conformalInterval[0]}–{candidate.conformalInterval[1]}%]
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${candidate.confidenceScore}%` }}
                              />
                            </div>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              Bayesian LR+ {candidate.bayesianLikelihoodRatio.toFixed(1)} · {allCitations.length} Literature Refs
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Clinical Reasoning, Workup & Medical Literature */}
                      {isExpanded && (
                        <div className="px-4 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-4 bg-slate-50/40 dark:bg-slate-900/60">
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            <strong className="text-slate-900 dark:text-white">Pathophysiology Synthesis:</strong>{' '}
                            {candidate.pathophysiologySummary}
                          </p>

                          {/* Supporting vs Discriminating Features */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/50 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Supporting Clinical Features</span>
                              </div>
                              <ul className="space-y-1 text-xs text-emerald-950/90 dark:text-emerald-200/90 list-disc list-inside">
                                {candidate.supportingFeatures.map((feat, i) => (
                                  <li key={i}>{feat}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                                <Activity className="w-3.5 h-3.5 shrink-0" />
                                <span>Discriminating &amp; Rule-Out Criteria</span>
                              </div>
                              <ul className="space-y-1 text-xs text-amber-950/90 dark:text-amber-200/90 list-disc list-inside">
                                {candidate.discriminatingOrRuleOutFeatures.map((feat, i) => (
                                  <li key={i}>{feat}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Recommended Diagnostic Workup with One-Click Order Staging */}
                          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                Recommended Diagnostic Workup &amp; Acute Management
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Click order to stage in EMR
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {candidate.recommendedWorkup.map((order, idx) => {
                                const isStaged = Boolean(stagedOrders[order]);
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleToggleOrderStage(order)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 border transition-colors cursor-pointer ${
                                      isStaged
                                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-950 dark:text-indigo-200 font-medium'
                                        : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                                    }`}
                                  >
                                    <span>{order}</span>
                                    <span className="text-[11px] font-mono shrink-0 text-indigo-600 dark:text-indigo-400">
                                      {isStaged ? '✓ Staged' : '+ Stage Order'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Red Flags */}
                          {candidate.redFlags.length > 0 && (
                            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                              <div className="text-xs text-rose-950 dark:text-rose-200 space-y-0.5">
                                <span className="font-bold">Critical Decompensation Red Flags:</span>
                                <p>{candidate.redFlags.join(' · ')}</p>
                              </div>
                            </div>
                          )}

                          {/* Peer-Reviewed Medical Literature & Guideline Citations */}
                          <div className="space-y-2.5 pt-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                                <BookOpen className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                <span>Verifiable Medical Literature &amp; Clinical Society Guidelines</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => void handleFetchLivePubMed(candidate)}
                                disabled={loadingLiteratureId === candidate.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-semibold transition-colors cursor-pointer"
                              >
                                <FileSearch className="w-3 h-3" />
                                <span>
                                  {loadingLiteratureId === candidate.id
                                    ? 'Querying Europe PMC...'
                                    : 'Fetch Live PubMed / Europe PMC Citations'}
                                </span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {allCitations.map((cit) => (
                                <div
                                  key={cit.id}
                                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-1"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    <span>
                                      {cit.guidelineBody} · {cit.evidenceGrade}
                                      {cit.isLiveFetched ? ' · Live Europe PMC' : ''}
                                    </span>
                                    <span>
                                      PMID: {cit.pmid} · DOI: {cit.doi}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                                    {cit.title} ({cit.year})
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {cit.authors} — <em>{cit.journal}</em>
                                    {cit.citationCount ? ` · Cited by ${cit.citationCount}` : ''}
                                  </p>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 pt-0.5">
                                    {cit.clinicalTakeaway}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mandatory Medical Disclaimer Footer */}
      <div
        role="note"
        aria-label="Clinical Decision Support Medical Disclaimer"
        className="px-6 py-3.5 bg-amber-50/90 dark:bg-amber-950/30 border-t border-amber-200/80 dark:border-amber-900/50 flex items-start gap-2.5 text-xs text-amber-950 dark:text-amber-200"
      >
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {report?.medicalDisclaimer ||
            'CLINICAL DECISION SUPPORT DISCLAIMER: AI-generated differential diagnoses, confidence intervals, and literature citations are for clinical decision support only and do not replace qualified physician judgment.'}
        </p>
      </div>
    </section>
  );
};
