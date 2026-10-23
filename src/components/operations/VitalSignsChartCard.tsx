import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Heart,
  Wind,
  Gauge,
  Pause,
  Play,
  Download,
} from 'lucide-react';
import { useTelemetry } from '@/lib/useTelemetry';
import { usePrivacyStore, maskPatientName } from '@/lib/privacy';

import {
  PATIENT_PROFILES,
  generate24HourVitals,
  type VitalSignHourlyPoint,
  type VitalMetricFilter,
} from '@/lib/vitalsTriageEngine';

export type { VitalSignHourlyPoint, VitalMetricFilter };

interface VitalSignsChartCardProps {
  patientId?: number;
  compactHeader?: boolean;
  externalMetricFilter?: VitalMetricFilter;
  simulatedSurgePatients?: Record<number, boolean>;
  onPatientChange?: (patientId: number) => void;
  onMetricFilterChange?: (metric: VitalMetricFilter) => void;
}

/**
 * Vital Signs Dashboard Component — Visualizes real-time patient Heart Rate (bpm),
 * Blood Pressure (Systolic/Diastolic mmHg), and Oxygen Saturation (SpO2 %)
 * over the last 24 hours using an accessible, keyboard-scrubbable D3 line chart.
 */
export default function VitalSignsChartCard({
  patientId: initialPatientId,
  compactHeader = false,
  externalMetricFilter,
  simulatedSurgePatients = {},
  onPatientChange,
  onMetricFilterChange,
}: VitalSignsChartCardProps) {
  const { isPrivacyMode } = usePrivacyStore();
  const [selectedPatientId, setSelectedPatientId] = useState<number>(initialPatientId || 42);
  const [metricFilter, setMetricFilter] = useState<VitalMetricFilter>(
    externalMetricFilter || 'all'
  );
  const [streamPaused, setStreamPaused] = useState<boolean>(false);
  const [hoveredPoint, setHoveredPoint] = useState<VitalSignHourlyPoint | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 820,
    height: 290,
  });

  useEffect(() => {
    if (initialPatientId) {
      setSelectedPatientId(initialPatientId);
    }
  }, [initialPatientId]);

  useEffect(() => {
    if (externalMetricFilter) {
      setMetricFilter(externalMetricFilter);
    }
  }, [externalMetricFilter]);

  const handleSelectPatient = (id: number) => {
    setSelectedPatientId(id);
    if (onPatientChange) onPatientChange(id);
  };

  const handleSelectMetric = (metric: VitalMetricFilter) => {
    setMetricFilter(metric);
    if (onMetricFilterChange) onMetricFilterChange(metric);
  };

  const { data: liveTelemetry } = useTelemetry(selectedPatientId);

  const profile =
    PATIENT_PROFILES[selectedPatientId] || {
      id: selectedPatientId,
      name: `Patient #${selectedPatientId}`,
      mrn: `MRN-00${selectedPatientId}`,
      ward: 'Inpatient Telemetry',
      departmentId: 1,
      baseHr: 75,
      baseSys: 120,
      baseDia: 78,
      baseSpo2: 98,
    };

  const maskedPatientLabel = maskPatientName(profile.name, profile.id, isPrivacyMode);
  const isSimulatedSurge = Boolean(simulatedSurgePatients[selectedPatientId]);
  const liveHr = !streamPaused ? liveTelemetry?.heart_rate ?? profile.baseHr : profile.baseHr;
  const liveSys = !streamPaused ? liveTelemetry?.systolic_bp ?? profile.baseSys : profile.baseSys;
  const liveDia = !streamPaused ? liveTelemetry?.diastolic_bp ?? profile.baseDia : profile.baseDia;
  const liveSpo2 = !streamPaused ? liveTelemetry?.spo2 ?? profile.baseSpo2 : profile.baseSpo2;

  const seriesData = useMemo(
    () =>
      generate24HourVitals(
        profile,
        liveHr,
        liveSys,
        liveDia,
        liveSpo2,
        isSimulatedSurge
      ),
    [profile, liveHr, liveSys, liveDia, liveSpo2, isSimulatedSurge]
  );

  const latestPoint = seriesData[seriesData.length - 1];
  const inspected = hoveredPoint || latestPoint;
  const hrMin = Math.min(...seriesData.map((d) => d.heartRate));
  const hrMax = Math.max(...seriesData.map((d) => d.heartRate));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.max(320, Math.floor(rect.width)),
          height: 290,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || seriesData.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Accessible SVG title & description for screen readers
    svg
      .append('title')
      .attr('id', `vitals-d3-title-${selectedPatientId}`)
      .text(`24-Hour Vital Signs Trend Chart for ${maskedPatientLabel}`);
    svg
      .append('desc')
      .attr('id', `vitals-d3-desc-${selectedPatientId}`)
      .text(
        `Interactive 24-hour telemetry line chart displaying Heart Rate (${hrMin} to ${hrMax} bpm), Blood Pressure (${latestPoint.systolicBp}/${latestPoint.diastolicBp} mmHg), and Oxygen Saturation (${latestPoint.spo2}%). Use Left and Right arrow keys on the interactive chart surface to inspect hourly readings.`
      );

    const margin = { top: 20, right: 28, bottom: 32, left: 44 };
    const innerWidth = Math.max(120, dimensions.width - margin.left - margin.right);
    const innerHeight = Math.max(120, dimensions.height - margin.top - margin.bottom);

    const defs = svg.append('defs');
    const hrGrad = defs
      .append('linearGradient')
      .attr('id', 'vitals-hr-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    hrGrad.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.22);
    hrGrad.append('stop').attr('offset', '100%').attr('stop-color', '#f43f5e').attr('stop-opacity', 0.0);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('role', 'presentation');

    const xScale = d3.scaleLinear().domain([-24, 0]).range([0, innerWidth]);
    const yDomain: [number, number] =
      metricFilter === 'spo2'
        ? [88, 100]
        : metricFilter === 'hr'
        ? [50, 140]
        : [50, 165];
    const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);
    const yTicks =
      metricFilter === 'spo2'
        ? [90, 92, 94, 96, 98, 100]
        : [60, 80, 100, 120, 140, 160];

    g.selectAll('.vitals-grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(148, 163, 184, 0.12)')
      .attr('stroke-dasharray', '3,3')
      .attr('aria-hidden', 'true');

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([-24, -20, -16, -12, -8, -4, 0])
      .tickFormat((d) => (Number(d) === 0 ? 'Now' : `${d}h`))
      .tickSizeOuter(0);

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(yTicks)
      .tickFormat((d) => (metricFilter === 'spo2' ? `${d}%` : `${d}`))
      .tickSizeOuter(0);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('aria-label', 'Time offset in hours over last 24 hours')
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.25)');
    xAxisGroup.selectAll('.tick line').remove();
    xAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');

    const yAxisGroup = g
      .append('g')
      .attr('aria-label', 'Vital sign measurement value')
      .call(yAxis);
    yAxisGroup.select('.domain').remove();
    yAxisGroup.selectAll('.tick line').remove();
    yAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');

    const drawSeries = (
      seriesName: string,
      accessor: (d: VitalSignHourlyPoint) => number,
      color: string,
      strokeDash?: string,
      fillUrl?: string
    ) => {
      if (fillUrl) {
        const areaGen = d3
          .area<VitalSignHourlyPoint>()
          .x((d) => xScale(d.hourOffset))
          .y0(innerHeight)
          .y1((d) => yScale(accessor(d)))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(seriesData)
          .attr('fill', fillUrl)
          .attr('aria-hidden', 'true')
          .attr('d', areaGen);
      }

      const lineGen = d3
        .line<VitalSignHourlyPoint>()
        .x((d) => xScale(d.hourOffset))
        .y((d) => yScale(accessor(d)))
        .curve(d3.curveMonotoneX);

      const path = g
        .append('path')
        .datum(seriesData)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.4)
        .attr('role', 'graphics-symbol')
        .attr('aria-label', `${seriesName} 24-hour trend line`)
        .attr('d', lineGen);

      if (strokeDash) {
        path.attr('stroke-dasharray', strokeDash);
      }

      g.selectAll(null)
        .data(seriesData.filter((pt) => pt.hourOffset % 2 === 0))
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.hourOffset))
        .attr('cy', (d) => yScale(accessor(d)))
        .attr('r', (d) => (d.hourOffset === 0 ? 4.5 : 2.8))
        .attr('fill', color)
        .attr('stroke', '#020617')
        .attr('stroke-width', 1.2)
        .attr('role', 'graphics-symbol')
        .attr(
          'aria-label',
          (d) => `${seriesName} at ${d.timeLabel}: ${accessor(d)}`
        );
    };

    if (metricFilter === 'all' || metricFilter === 'bp') {
      const bpBand = d3
        .area<VitalSignHourlyPoint>()
        .x((d) => xScale(d.hourOffset))
        .y0((d) => yScale(d.diastolicBp))
        .y1((d) => yScale(d.systolicBp))
        .curve(d3.curveMonotoneX);

      g.append('path')
        .datum(seriesData)
        .attr('fill', '#6366f1')
        .attr('fill-opacity', 0.12)
        .attr('aria-hidden', 'true')
        .attr('d', bpBand);

      drawSeries('Systolic Blood Pressure', (d) => d.systolicBp, '#6366f1');
      drawSeries('Diastolic Blood Pressure', (d) => d.diastolicBp, '#a855f7', '4,3');
    }

    if (metricFilter === 'all' || metricFilter === 'hr') {
      drawSeries(
        'Heart Rate',
        (d) => d.heartRate,
        '#f43f5e',
        undefined,
        metricFilter === 'hr' ? 'url(#vitals-hr-grad)' : undefined
      );
    }

    if (metricFilter === 'all' || metricFilter === 'spo2') {
      drawSeries('Oxygen Saturation SpO2', (d) => d.spo2, '#06b6d4');
    }

    // Interactive Crosshair with both Pointer and Keyboard Scrubbing support
    const focusGroup = g.append('g').style('display', 'none').attr('aria-hidden', 'true');
    const focusLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(226, 232, 240, 0.4)')
      .attr('stroke-dasharray', '3,3');

    const bisectHour = d3.bisector<VitalSignHourlyPoint, number>((d) => d.hourOffset).left;
    let keyboardIndex = seriesData.length - 1;

    const updateFocusPoint = (point: VitalSignHourlyPoint, overlayNode: SVGRectElement) => {
      const cx = xScale(point.hourOffset);
      focusGroup.style('display', null);
      focusLine.attr('x1', cx).attr('x2', cx);
      setHoveredPoint(point);
      overlayNode.setAttribute('aria-valuenow', String(point.hourOffset));
      overlayNode.setAttribute(
        'aria-valuetext',
        `${point.timeLabel} (${point.hourOffset === 0 ? 'Live' : `${point.hourOffset} hours`}): Heart rate ${point.heartRate} bpm, Blood pressure ${point.systolicBp} over ${point.diastolicBp} mmHg, SpO2 ${point.spo2}%`
      );
    };

    g.append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('tabindex', '0')
      .attr('role', 'slider')
      .attr(
        'aria-label',
        `Interactive 24-hour vital signs timeline scrubber for ${maskedPatientLabel}. Use Left and Right arrow keys to inspect hourly readings.`
      )
      .attr('aria-valuemin', '-24')
      .attr('aria-valuemax', '0')
      .attr('aria-valuenow', String(latestPoint.hourOffset))
      .attr(
        'aria-valuetext',
        `Live (${latestPoint.timeLabel}): Heart rate ${latestPoint.heartRate} bpm, Blood pressure ${latestPoint.systolicBp}/${latestPoint.diastolicBp} mmHg, SpO2 ${latestPoint.spo2}%`
      )
      .style('cursor', 'crosshair')
      .style('outline', 'none')
      .on('mouseenter', () => focusGroup.style('display', null))
      .on('focus', function () {
        const pt = seriesData[keyboardIndex] || latestPoint;
        updateFocusPoint(pt, this);
      })
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const h0 = xScale.invert(mx);
        const idx = bisectHour(seriesData, h0, 1);
        const d0 = seriesData[idx - 1];
        const d1 = seriesData[idx];
        const nearest =
          d1 && d0 ? (h0 - d0.hourOffset > d1.hourOffset - h0 ? d1 : d0) : d0 || d1;
        if (nearest) {
          keyboardIndex = seriesData.indexOf(nearest);
          updateFocusPoint(nearest, this);
        }
      })
      .on('keydown', function (event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          keyboardIndex = Math.max(0, keyboardIndex - 1);
          updateFocusPoint(seriesData[keyboardIndex], this);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          keyboardIndex = Math.min(seriesData.length - 1, keyboardIndex + 1);
          updateFocusPoint(seriesData[keyboardIndex], this);
        } else if (event.key === 'Home') {
          event.preventDefault();
          keyboardIndex = 0;
          updateFocusPoint(seriesData[0], this);
        } else if (event.key === 'End') {
          event.preventDefault();
          keyboardIndex = seriesData.length - 1;
          updateFocusPoint(seriesData[seriesData.length - 1], this);
        }
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
      })
      .on('blur', () => {
        focusGroup.style('display', 'none');
        setHoveredPoint(null);
      });
  }, [seriesData, dimensions, metricFilter, selectedPatientId, maskedPatientLabel, hrMin, hrMax, latestPoint]);

  const handleExportVitalsCsv = () => {
    const headers = [
      'Hour_Offset',
      'Time',
      'Heart_Rate_BPM',
      'Systolic_BP_mmHg',
      'Diastolic_BP_mmHg',
      'SpO2_Pct',
    ];
    const rows = seriesData.map((d) =>
      [d.hourOffset, d.timeLabel, d.heartRate, d.systolicBp, d.diastolicBp, d.spo2].join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vital-signs-24h-patient-${selectedPatientId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="24-Hour Vital Signs D3 Telemetry Chart"
      className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-5"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wide">
            <Activity aria-hidden="true" className="w-4 h-4 animate-pulse" />
            <span>Real-Time Vital Signs &bull; 24-Hour D3 Trend Monitor</span>
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">
            Heart Rate, Blood Pressure &amp; Oxygen Saturation (Last 24 Hours)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoring{' '}
            <strong className="text-slate-200">{maskedPatientLabel}</strong> ({profile.ward})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Patient Selector */}
          {!compactHeader && (
            <select
              aria-label="Select patient for vital signs trend"
              value={selectedPatientId}
              onChange={(e) => handleSelectPatient(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {Object.values(PATIENT_PROFILES).map((p) => (
                <option key={p.id} value={p.id}>
                  {maskPatientName(p.name, p.id, isPrivacyMode)} (#{p.id})
                </option>
              ))}
            </select>
          )}

          {/* Metric View Selector */}
          <div
            role="group"
            aria-label="Filter vital sign series"
            className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl"
          >
            {(
              [
                { id: 'all', label: 'All Vitals' },
                { id: 'hr', label: 'Heart Rate' },
                { id: 'bp', label: 'Blood Pressure' },
                { id: 'spo2', label: 'SpO2 %' },
              ] as Array<{ id: VitalMetricFilter; label: string }>
            ).map((tab) => {
              const isSelected = metricFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`Show ${tab.label} on 24-hour vital signs chart`}
                  onClick={() => handleSelectMetric(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            aria-pressed={streamPaused}
            aria-label={
              streamPaused
                ? 'Resume live vital signs telemetry stream'
                : 'Pause live vital signs telemetry stream'
            }
            onClick={() => setStreamPaused((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {streamPaused ? (
              <>
                <Play aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resume Live</span>
              </>
            ) : (
              <>
                <Pause aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
                <span>Live Feed</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-label={`Export 24-hour vital signs CSV for ${maskedPatientLabel}`}
            onClick={handleExportVitalsCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download aria-hidden="true" className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Live Vital Sign KPI Cards */}
      <div
        role="region"
        aria-label="Current Vital Sign Summary Readings"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div
          role="group"
          aria-label={`Heart Rate ${inspected.heartRate} beats per minute`}
          className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-rose-300">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Heart Rate (HR)
            </span>
            <Heart aria-hidden="true" className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{inspected.heartRate}</span>
            <span className="text-xs text-slate-400 font-mono">bpm</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            24h Range: {hrMin}–{hrMax} bpm
          </div>
        </div>

        <div
          role="group"
          aria-label={`Blood Pressure ${inspected.systolicBp} over ${inspected.diastolicBp} millimeters of mercury`}
          className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-indigo-300">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              Blood Pressure (SBP/DBP)
            </span>
            <Gauge aria-hidden="true" className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">
              {inspected.systolicBp}/{inspected.diastolicBp}
            </span>
            <span className="text-xs text-slate-400 font-mono">mmHg</span>
          </div>
          <div className="text-[11px] text-indigo-300 mt-1">
            Mean Arterial Pressure (MAP):{' '}
            {Math.round((inspected.systolicBp + 2 * inspected.diastolicBp) / 3)} mmHg
          </div>
        </div>

        <div
          role="group"
          aria-label={`Oxygen Saturation ${inspected.spo2} percent`}
          className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
              Oxygen Saturation (SpO2)
            </span>
            <Wind aria-hidden="true" className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{inspected.spo2}%</span>
            <span className="text-xs text-slate-400 font-mono">SpO2</span>
          </div>
          <div className="text-[11px] text-cyan-300 mt-1">
            Target &ge; 94% on Room Air
          </div>
        </div>
      </div>

      {/* Interactive Hover & Keyboard Readout Bar */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Inspected hourly vital sign reading"
        className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono font-bold text-white">
            Time: {inspected.timeLabel} ({inspected.hourOffset === 0 ? 'Live' : `${inspected.hourOffset}h`})
          </span>
          <span className="text-rose-300">
            HR: <strong>{inspected.heartRate} bpm</strong>
          </span>
          <span className="text-indigo-300">
            BP: <strong>{inspected.systolicBp}/{inspected.diastolicBp} mmHg</strong>
          </span>
          <span className="text-cyan-300">
            SpO2: <strong>{inspected.spo2}%</strong>
          </span>
        </div>
        {inspected.clinicalNote && (
          <span className="text-[11px] font-medium text-emerald-300">
            {inspected.clinicalNote}
          </span>
        )}
      </div>

      {/* D3 Multi-Line Chart Canvas */}
      <div
        ref={containerRef}
        role="region"
        aria-label="Interactive D3 24-hour vital signs graph canvas"
        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 overflow-hidden"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          role="img"
          aria-labelledby={`vitals-d3-title-${selectedPatientId}`}
          aria-describedby={`vitals-d3-desc-${selectedPatientId}`}
          aria-label="D3 24-hour vital signs line chart for heart rate, blood pressure, and oxygen saturation"
          className="w-full h-[290px] block select-none"
        />

        {/* Visually-hidden data table for assistive technologies */}
        <table className="sr-only" aria-label={`24-hour vital signs tabular summary for ${maskedPatientLabel}`}>
          <caption>Hourly vital signs over the last 24 hours</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Heart Rate (bpm)</th>
              <th scope="col">Blood Pressure (mmHg)</th>
              <th scope="col">SpO2 (%)</th>
            </tr>
          </thead>
          <tbody>
            {seriesData
              .filter((pt) => pt.hourOffset % 6 === 0)
              .map((pt) => (
                <tr key={pt.hourOffset}>
                  <td>{pt.timeLabel}</td>
                  <td>{pt.heartRate} bpm</td>
                  <td>
                    {pt.systolicBp}/{pt.diastolicBp} mmHg
                  </td>
                  <td>{pt.spo2}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
