import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  AlertTriangle,
  BedDouble,
  BellRing,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import {
  getDepartmentCapacityForecast24h,
  type CapacityForecast24hResponse,
  type DepartmentCapacityForecastItem,
} from '@/lib/api';
import { dispatchClinicalNotification } from '@/lib/notificationService';
import { usePrivacyStore, maskFreeTextPii } from '@/lib/privacy';
import { toast } from '@/lib/toast';

interface CapacityShortageForecastModalProps {
  open: boolean;
  onClose: () => void;
  forecastData?: CapacityForecast24hResponse | null;
}

/**
 * Proactive dashboard alert banner warning staff of predicted 24h department capacity shortages
 * before they occur, with one-click access to the full 24h trend forecast overlay.
 */
export function CapacityShortageBanner({
  onOpenOverlay,
  forecast,
}: {
  onOpenOverlay: () => void;
  forecast: CapacityForecast24hResponse | null;
}) {
  if (!forecast) return null;

  const atRiskDepts = forecast.departments.filter(
    (d) => d.riskLevel === 'critical' || d.riskLevel === 'warning'
  );
  if (atRiskDepts.length === 0) return null;

  const primaryRisk = atRiskDepts[0];

  return (
    <div
      role="region"
      aria-label="24-Hour Capacity Shortage Prediction Alert"
      className="rounded-2xl bg-gradient-to-r from-rose-950/50 via-amber-950/30 to-slate-900/70 border border-rose-500/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              24h Predictive Capacity Alert
            </span>
            <span className="text-xs text-amber-300 font-semibold">
              {atRiskDepts.length} Department{atRiskDepts.length === 1 ? '' : 's'} Projected to Exceed {forecast.criticalThresholdPct}% Capacity
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-1">
            {primaryRisk.name} projected to reach {primaryRisk.predictedPeakPct}% ({primaryRisk.predictedBedDeficit} bed deficit) in +{primaryRisk.hoursUntilShortage} hours
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Historical Trend Driver: {primaryRisk.trendDriver}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onOpenOverlay}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Open 24h Capacity Forecast</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Interactive Dashboard Overlay that uses 30-day historical admission/discharge trends
 * to predict department capacity shortages over the next 24 hours and alert staff proactively.
 */
export default function CapacityShortageForecastModal({
  open,
  onClose,
  forecastData,
}: CapacityShortageForecastModalProps) {
  const { isPrivacyMode } = usePrivacyStore();
  const [forecast, setForecast] = useState<CapacityForecast24hResponse | null>(
    forecastData || null
  );
  const [selectedDeptId, setSelectedDeptId] = useState<number>(2);
  const [alertedDepts, setAlertedDepts] = useState<Record<number, boolean>>({});
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);

  useEffect(() => {
    if (forecastData) {
      setForecast(forecastData);
    } else if (open) {
      getDepartmentCapacityForecast24h().then(setForecast);
    }
  }, [open, forecastData]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !forecast) return null;

  const selectedDept: DepartmentCapacityForecastItem =
    forecast.departments.find((d) => d.id === selectedDeptId) || forecast.departments[0];

  const handleAlertStaff = async (dept: DepartmentCapacityForecastItem) => {
    setDispatchingId(dept.id);
    try {
      await dispatchClinicalNotification({
        category: 'PATIENT_STATUS',
        severity: dept.riskLevel === 'critical' ? 'error' : 'warning',
        title: `24h Capacity Shortage Warning: ${dept.name}`,
        message: `${dept.name} is projected to reach ${dept.predictedPeakPct}% occupancy (${
          dept.predictedBedDeficit
        } bed deficit) in +${dept.hoursUntilShortage || 8}h based on 30-day historical trends. Action: ${
          dept.recommendedAction
        }`,
        department: dept.name,
        action_href: '/capacity',
        action_label: 'Manage Ward Beds',
      });

      setAlertedDepts((prev) => ({ ...prev, [dept.id]: true }));
      toast.warning(
        `Proactive shortage alert dispatched to ${dept.name} charge nurses & bed management.`
      );
    } finally {
      setDispatchingId(null);
    }
  };

  // SVG Chart dimensions for the 24-hour trajectory
  const chartWidth = 680;
  const chartHeight = 210;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const xForHour = (h: number) => padLeft + (h / 24) * innerW;
  const yForPct = (pct: number) => {
    const clamped = Math.max(50, Math.min(100, pct));
    return padTop + ((100 - clamped) / 50) * innerH;
  };

  const points = selectedDept.hourlyForecast;
  const forecastLinePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xForHour(pt.hourOffset)} ${yForPct(pt.occupancyPct)}`)
    .join(' ');

  const baselineLinePath = points
    .map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${xForHour(pt.hourOffset)} ${yForPct(pt.historicalBaselinePct)}`
    )
    .join(' ');

  const areaPath = `${forecastLinePath} L ${xForHour(24)} ${padTop + innerH} L ${xForHour(0)} ${
    padTop + innerH
  } Z`;

  const thresholdY = yForPct(forecast.criticalThresholdPct);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="capacity-forecast-modal-title"
    >
      <div
        className="w-full max-w-5xl rounded-3xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900/80 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>24-Hour Predictive Department Capacity Forecaster</span>
            </div>
            <h2
              id="capacity-forecast-modal-title"
              className="text-xl font-extrabold text-white mt-1"
            >
              Historical Trend Capacity Shortage Predictions (Next 24 Hours)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{forecast.modelNote}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close 24-hour capacity forecast overlay"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* 1. Department Selector Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {forecast.departments.map((dept) => {
              const isSelected = dept.id === selectedDept.id;
              const badgeColor =
                dept.riskLevel === 'critical'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : dept.riskLevel === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => setSelectedDeptId(dept.id)}
                  className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-white truncate">{dept.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${badgeColor}`}
                    >
                      {dept.riskLevel}
                    </span>
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">
                        24h Peak Forecast
                      </span>
                      <span className="text-2xl font-extrabold text-white">
                        {dept.predictedPeakPct}%
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono text-slate-400 block">
                        Current Beds
                      </span>
                      <span className="text-xs font-mono text-slate-200">
                        {dept.currentOccupied}/{dept.totalBeds} ({dept.currentOccupancyPct}%)
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                    {dept.hoursUntilShortage !== null ? (
                      <span className="text-rose-300 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Shortage in +{dept.hoursUntilShortage}h (-{dept.predictedBedDeficit} beds)
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        No 24h shortage projected
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 2. Interactive 24-Hour Historical vs Predicted Occupancy Curve */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <span>{selectedDept.name} — 24-Hour Occupancy Trajectory</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparing real-time 24-hour surge projection against 30-day historical baseline and {forecast.criticalThresholdPct}% critical threshold.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px]">
                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold">
                  <span className="w-3 h-0.5 bg-indigo-400 inline-block" /> 24h Predicted Curve
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="w-3 h-0.5 bg-slate-500 inline-block border-b border-dashed" /> 30-Day Historical Avg
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                  <span className="w-3 h-0.5 bg-rose-500 inline-block" /> {forecast.criticalThresholdPct}% Shortage Threshold
                </span>
              </div>
            </div>

            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-52 select-none"
                role="img"
                aria-label={`24-hour capacity forecast chart for ${selectedDept.name}`}
              >
                <defs>
                  <linearGradient id="capacityForecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines (50% to 100%) */}
                {[50, 60, 70, 80, 90, 100].map((pct) => {
                  const y = yForPct(pct);
                  return (
                    <g key={pct}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={chartWidth - padRight}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padLeft - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[10px] font-mono"
                      >
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Critical 90% Shortage Threshold Line */}
                <line
                  x1={padLeft}
                  y1={thresholdY}
                  x2={chartWidth - padRight}
                  y2={thresholdY}
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                />

                {/* Area under predicted curve */}
                <path d={areaPath} fill="url(#capacityForecastGrad)" />

                {/* 30-Day Historical Baseline Curve */}
                <path
                  d={baselineLinePath}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="1.75"
                  strokeDasharray="4 4"
                />

                {/* Predicted 24h Occupancy Curve */}
                <path
                  d={forecastLinePath}
                  fill="none"
                  stroke={selectedDept.riskLevel === 'critical' ? '#f43f5e' : '#818cf8'}
                  strokeWidth="2.5"
                />

                {/* Data Points & X-axis labels every 4 hours */}
                {points
                  .filter((pt) => pt.hourOffset % 4 === 0)
                  .map((pt) => {
                    const cx = xForHour(pt.hourOffset);
                    const cy = yForPct(pt.occupancyPct);
                    const isOverThreshold = pt.occupancyPct >= forecast.criticalThresholdPct;
                    return (
                      <g key={pt.hourOffset}>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isOverThreshold ? 4.5 : 3.5}
                          fill={isOverThreshold ? '#f43f5e' : '#818cf8'}
                          stroke="#020617"
                          strokeWidth="1.5"
                        />
                        <text
                          x={cx}
                          y={cy - 8}
                          textAnchor="middle"
                          className={`text-[10px] font-mono font-bold ${
                            isOverThreshold ? 'fill-rose-300' : 'fill-slate-300'
                          }`}
                        >
                          {pt.occupancyPct}%
                        </text>
                        <text
                          x={cx}
                          y={chartHeight - 8}
                          textAnchor="middle"
                          className="fill-slate-400 text-[10px] font-mono"
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
              </svg>
            </div>
          </div>

          {/* 3. Selected Department Shortage Analysis & Pre-Emptive Staff Alert Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-amber-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>Historical Trend Analysis &amp; Recommended Surge Protocol</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                <strong className="text-white">Historical Driver:</strong>{' '}
                {maskFreeTextPii(selectedDept.trendDriver, isPrivacyMode)}
              </p>
              <p className="text-xs text-indigo-200 bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 leading-relaxed">
                <strong className="text-indigo-300">Recommended Pre-Emptive Action:</strong>{' '}
                {maskFreeTextPii(selectedDept.recommendedAction, isPrivacyMode)}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Shortage Window</span>
                  <Clock className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-xl font-extrabold text-white mt-1">
                  {selectedDept.hoursUntilShortage !== null
                    ? `In +${selectedDept.hoursUntilShortage} Hours`
                    : 'Within Safe Capacity'}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedDept.predictedBedDeficit > 0
                    ? `Projected deficit of ${selectedDept.predictedBedDeficit} monitored bed(s) above safe threshold.`
                    : 'Department maintains sufficient buffer capacity over next 24h.'}
                </p>
              </div>

              <button
                type="button"
                disabled={dispatchingId === selectedDept.id}
                onClick={() => handleAlertStaff(selectedDept)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  alertedDepts[selectedDept.id]
                    ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25'
                }`}
              >
                {alertedDepts[selectedDept.id] ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Staff Alert Dispatched</span>
                  </>
                ) : (
                  <>
                    <BellRing className="w-4 h-4" />
                    <span>
                      {dispatchingId === selectedDept.id
                        ? 'Dispatching Alert...'
                        : 'Alert Ward Staff Before Shortage'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
