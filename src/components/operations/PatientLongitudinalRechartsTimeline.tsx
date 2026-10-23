/**
 * AI Healthcare System — Recharts Longitudinal Vitals & Treatment Timeline
 *
 * Maps historical multi-parameter patient vitals (Systolic/Diastolic BP, MAP,
 * Heart Rate, SpO2, Core Temperature) alongside overlaid clinical treatment
 * milestones (medications, procedures, resuscitation boluses, and diagnostics)
 * using Recharts for an interactive longitudinal health trajectory view.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Brush,
} from 'recharts';
import {
  Activity,
  Pill,
  Stethoscope,
  Syringe,
  FlaskConical,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  LongitudinalHorizon,
  LongitudinalDataPoint,
  TreatmentMilestone,
  TreatmentCategory,
  LongitudinalSummaryStats,
  VITAL_SERIES_CATALOG,
  fetchPatientLongitudinalTrajectory,
} from '../../lib/clinicalLongitudinalData';
import { usePrivacyStore, maskPatientName } from '@/lib/privacy';

interface PatientLongitudinalRechartsTimelineProps {
  patientId: number;
  patientName?: string;
}

const HORIZON_OPTIONS: Array<{ id: LongitudinalHorizon; label: string; subtitle: string }> = [
  { id: '72h', label: '72 Hours', subtitle: 'ICU / Acute Telemetry' },
  { id: '30d', label: '30 Days', subtitle: 'Subacute Titration' },
  { id: '6m', label: '6 Months', subtitle: 'GDMT Longitudinal' },
  { id: '1y', label: '1 Year', subtitle: 'Annual Trajectory' },
];

const CATEGORY_FILTER_OPTIONS: Array<{ id: 'all' | TreatmentCategory; label: string }> = [
  { id: 'all', label: 'All Interventions' },
  { id: 'medication', label: 'Medications' },
  { id: 'procedure', label: 'Procedures' },
  { id: 'resuscitation', label: 'Resuscitation' },
  { id: 'diagnostic', label: 'Diagnostics' },
];

export const PatientLongitudinalRechartsTimeline: React.FC<
  PatientLongitudinalRechartsTimelineProps
> = ({ patientId, patientName }) => {
  const { isPrivacyMode } = usePrivacyStore();
  const [horizon, setHorizon] = useState<LongitudinalHorizon>('30d');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TreatmentCategory>('all');
  const [activeVitals, setActiveVitals] = useState<Record<string, boolean>>({
    systolicBp: true,
    diastolicBp: true,
    heartRate: true,
    meanArterialPressure: false,
    spo2: true,
    temperatureC: false,
  });
  const [points, setPoints] = useState<LongitudinalDataPoint[]>([]);
  const [milestones, setMilestones] = useState<
    Array<{ pointIndex: number; displayLabel: string; fullDateLabel: string; milestone: TreatmentMilestone }>
  >([]);
  const [stats, setStats] = useState<LongitudinalSummaryStats | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [showTargetCorridor, setShowTargetCorridor] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function loadTrajectory() {
      const data = await fetchPatientLongitudinalTrajectory(patientId, horizon);
      if (cancelled) return;
      setPoints(data.points);
      setMilestones(data.milestones);
      setStats(data.stats);
      if (data.milestones.length > 0) {
        setSelectedMilestoneId(data.milestones[data.milestones.length - 1].milestone.id);
      } else {
        setSelectedMilestoneId(null);
      }
    }
    void loadTrajectory();
    return () => {
      cancelled = true;
    };
  }, [patientId, horizon]);

  const filteredMilestones = useMemo(() => {
    if (categoryFilter === 'all') return milestones;
    return milestones.filter((m) => m.milestone.category === categoryFilter);
  }, [milestones, categoryFilter]);

  const selectedMilestoneEntry = useMemo(
    () => milestones.find((m) => m.milestone.id === selectedMilestoneId) || milestones[0] || null,
    [milestones, selectedMilestoneId]
  );

  const toggleVitalSeries = (key: string) => {
    setActiveVitals((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const displayName = maskPatientName(patientName || `Patient #${patientId}`, patientId, isPrivacyMode);

  const renderCategoryIcon = (category: TreatmentCategory) => {
    switch (category) {
      case 'medication':
        return <Pill className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'procedure':
        return <Stethoscope className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'resuscitation':
        return <Syringe className="w-3.5 h-3.5 text-teal-400 shrink-0" />;
      case 'diagnostic':
        return <FlaskConical className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    }
  };

  return (
    <section
      aria-label="Longitudinal Patient Vitals and Treatment Trajectory"
      className="bg-slate-900/75 border border-slate-800 rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Top Header & Horizon Controls */}
      <div className="px-6 py-5 border-b border-slate-800/90 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-teal-400">
            <Activity className="w-4 h-4 shrink-0" />
            <span>Longitudinal Hemodynamic &amp; Therapeutic Trajectory · {displayName}</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Historical Vitals &amp; Clinical Treatment Event Correlation
          </h3>
          <p className="text-xs text-slate-400 max-w-3xl">
            Synchronizes multi-parameter vital sign trends with medication titrations, interventional procedures, and acute resuscitation milestones.
          </p>
        </div>

        {/* Interactive Time Horizon Segmented Control */}
        <div
          role="group"
          aria-label="Select longitudinal time horizon"
          className="flex flex-wrap items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800"
        >
          {HORIZON_OPTIONS.map((opt) => {
            const isActive = horizon === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setHorizon(opt.id)}
                aria-pressed={isActive}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Longitudinal Summary Telemetry Strip */}
      {stats && (
        <div className="px-6 py-3.5 bg-slate-950/50 border-b border-slate-800/80 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[11px] font-mono uppercase text-slate-400 block">
              Time in Target Range
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold font-mono text-emerald-400">
                {stats.timeInTherapeuticRangePct}%
              </span>
              <span className="text-xs text-slate-400">
                · {stats.trajectoryStatus}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase text-slate-400 block">
              Systolic BP Delta ({horizon})
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {stats.systolicDelta <= 0 ? (
                <TrendingDown className="w-4 h-4 text-teal-400" />
              ) : (
                <TrendingUp className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-lg font-bold font-mono text-white">
                {stats.systolicDelta > 0 ? `+${stats.systolicDelta}` : stats.systolicDelta} mmHg
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase text-slate-400 block">
              Heart Rate Delta ({horizon})
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-lg font-bold font-mono text-white">
                {stats.heartRateDelta > 0 ? `+${stats.heartRateDelta}` : stats.heartRateDelta} bpm
              </span>
              <span className="text-xs text-slate-400">
                · MAP {stats.latestMap} mmHg
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase text-slate-400 block">
              Mapped Clinical Interventions
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-lg font-bold font-mono text-indigo-400">
                {stats.totalInterventions} Events
              </span>
              <span className="text-xs text-slate-400">
                · Latest SpO2 {stats.latestSpo2}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vital Series & Corridor Toggles */}
      <div className="px-6 py-3.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Toggle vital sign series">
          {VITAL_SERIES_CATALOG.map((series) => {
            const isChecked = Boolean(activeVitals[series.key]);
            return (
              <button
                key={series.key}
                type="button"
                onClick={() => toggleVitalSeries(series.key)}
                aria-pressed={isChecked}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-slate-800 text-white border-slate-600 shadow-2xs'
                    : 'bg-slate-950/60 text-slate-500 border-slate-800/80 hover:text-slate-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isChecked ? series.color : '#475569' }}
                />
                <span>{series.label}</span>
                <span className="text-[10px] font-mono text-slate-400">({series.unit})</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowTargetCorridor((prev) => !prev)}
          aria-pressed={showTargetCorridor}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors cursor-pointer ${
            showTargetCorridor
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50'
              : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}
        >
          {showTargetCorridor ? '✓ Target SBP Corridor (95–130 mmHg)' : 'Show Target SBP Corridor'}
        </button>
      </div>

      {/* Main Recharts Longitudinal Canvas */}
      <div className="p-6">
        <div className="h-[360px] w-full" role="img" aria-label="Recharts longitudinal vital signs and treatment chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} margin={{ top: 18, right: 20, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="sbpGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="mapGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

              <XAxis
                dataKey="displayLabel"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickMargin={8}
              />

              <YAxis
                yAxisId="left"
                domain={[45, 180]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                unit=" mmHg"
                width={68}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[35, 102]}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                width={48}
              />

              {/* Normotensive Target Reference Area */}
              {showTargetCorridor && (
                <ReferenceArea
                  yAxisId="left"
                  y1={95}
                  y2={130}
                  fill="#10b981"
                  fillOpacity={0.06}
                  stroke="#10b981"
                  strokeOpacity={0.2}
                  strokeDasharray="3 3"
                />
              )}

              {/* Overlaid Vertical Reference Lines for Clinical Treatment Events */}
              {filteredMilestones.map((item) => {
                const isSelected = selectedMilestoneEntry?.milestone.id === item.milestone.id;
                const strokeColor =
                  item.milestone.severity === 'critical'
                    ? '#f43f5e'
                    : item.milestone.severity === 'attention'
                      ? '#f59e0b'
                      : '#38bdf8';
                return (
                  <ReferenceLine
                    key={item.milestone.id}
                    yAxisId="left"
                    x={item.displayLabel}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? undefined : '4 4'}
                    label={{
                      value: isSelected ? `★ ${item.milestone.title.slice(0, 22)}...` : '● Tx',
                      position: 'top',
                      fill: strokeColor,
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                );
              })}

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const point = payload[0]?.payload as LongitudinalDataPoint | undefined;
                  if (!point) return null;

                  return (
                    <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3.5 shadow-xl text-xs space-y-2 max-w-xs">
                      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
                        <span className="font-mono font-bold text-white">{point.fullDateLabel}</span>
                        <span className="font-mono text-[10px] text-teal-400">
                          RR {point.respiratoryRate} rpm
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                        <span className="text-sky-400">
                          BP: <strong>{point.systolicBp}/{point.diastolicBp}</strong> mmHg
                        </span>
                        <span className="text-rose-400">
                          HR: <strong>{point.heartRate}</strong> bpm
                        </span>
                        <span className="text-teal-400">
                          MAP: <strong>{point.meanArterialPressure}</strong> mmHg
                        </span>
                        <span className="text-emerald-400">
                          SpO2: <strong>{point.spo2}%</strong>
                        </span>
                        <span className="text-amber-400 col-span-2">
                          Core Temp: <strong>{point.temperatureC} °C</strong>
                        </span>
                      </div>

                      {point.treatmentEvent && (
                        <div className="pt-2 border-t border-slate-800 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                            {renderCategoryIcon(point.treatmentEvent.category)}
                            <span>{point.treatmentEvent.title}</span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-300">
                            {point.treatmentEvent.dosageOrProtocol}
                          </p>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            {point.treatmentEvent.physiologicalEffect}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }}
              />

              {activeVitals.systolicBp && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="systolicBp"
                  name="Systolic BP"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fill="url(#sbpGradient)"
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              )}

              {activeVitals.diastolicBp && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="diastolicBp"
                  name="Diastolic BP"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                />
              )}

              {activeVitals.meanArterialPressure && (
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="meanArterialPressure"
                  name="Mean Arterial Pressure"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#mapGradient)"
                />
              )}

              {activeVitals.heartRate && (
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart Rate"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  dot={{ r: 2.5 }}
                />
              )}

              {activeVitals.spo2 && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="spo2"
                  name="Arterial SpO2"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              )}

              {activeVitals.temperatureC && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="temperatureC"
                  name="Core Temp"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              )}

              <Brush
                dataKey="displayLabel"
                height={24}
                stroke="#4f46e5"
                fill="#0f172a"
                travellerWidth={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Synchronized Treatment Event Milestones Inspector */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Synchronized Clinical Interventions &amp; Physiological Response
              </h4>
              <p className="text-xs text-slate-400">
                Select any treatment milestone below to highlight its exact timestamp on the Recharts curve above.
              </p>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter treatment events">
              {CATEGORY_FILTER_OPTIONS.map((cat) => {
                const isSelected = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    aria-pressed={isSelected}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Milestone Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredMilestones.map(({ displayLabel, fullDateLabel, milestone }) => {
              const isSelected = selectedMilestoneEntry?.milestone.id === milestone.id;
              return (
                <button
                  key={milestone.id}
                  type="button"
                  onClick={() => setSelectedMilestoneId(milestone.id)}
                  aria-pressed={isSelected}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500/70 shadow-sm'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-200 capitalize">
                        {renderCategoryIcon(milestone.category)}
                        {milestone.category}
                      </span>
                      <span>{displayLabel}</span>
                    </div>
                    <h5 className="text-xs font-bold text-white leading-snug">
                      {milestone.title}
                    </h5>
                    <p className="text-[11px] font-mono text-teal-300">
                      {milestone.dosageOrProtocol}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span>{milestone.clinician}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{milestone.department}</span>
                    <span aria-hidden="true"> · </span>
                    <span className="font-mono">{fullDateLabel.split(',')[0]}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Milestone Clinical Response Detail Bar */}
          {selectedMilestoneEntry && (
            <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-indigo-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{selectedMilestoneEntry.fullDateLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedMilestoneEntry.milestone.clinician}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedMilestoneEntry.milestone.department}</span>
                </div>
                <h5 className="text-sm font-bold text-white">
                  {selectedMilestoneEntry.milestone.title} — {selectedMilestoneEntry.milestone.dosageOrProtocol}
                </h5>
                <p className="text-xs text-slate-300">
                  <strong className="text-slate-200">Clinical Rationale:</strong>{' '}
                  {selectedMilestoneEntry.milestone.clinicalRationale}
                </p>
              </div>

              <div className="md:max-w-md p-3 rounded-xl bg-emerald-950/25 border border-emerald-800/40 flex items-start gap-2.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200 space-y-0.5">
                  <span className="font-bold block text-emerald-300">Observed Physiological Effect:</span>
                  <p>{selectedMilestoneEntry.milestone.physiologicalEffect}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
