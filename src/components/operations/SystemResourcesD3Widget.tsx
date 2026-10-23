/**
 * SystemResourcesD3Widget.tsx
 *
 * Real-time D3 System Resources widget for the Infrastructure page.
 * Visualizes Server Load (CPU/Memory %), API Latency (p95 ms), and
 * Database Query Throughput (QPS) over a rolling 60-second window with
 * full keyboard and screen-reader accessibility.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import {
  Activity,
  Cpu,
  Gauge,
  Database,
  Pause,
  Play,
  Flame,
  Download,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export type ResourceMetricFilter = 'all' | 'load' | 'latency' | 'throughput';

export interface SystemResourceTick {
  offsetSec: number; // -58 to 0 (0 = Now)
  timestampLabel: string;
  serverLoadPct: number; // 0 - 100 %
  apiLatencyMs: number; // e.g. 12 - 180 ms
  dbThroughputQps: number; // e.g. 300 - 1800 QPS
  activeConnections: number;
}

interface NodeClusterProfile {
  id: string;
  label: string;
  baseLoad: number;
  baseLatency: number;
  baseThroughput: number;
}

const CLUSTER_PROFILES: Record<string, NodeClusterProfile> = {
  'us-east-primary': {
    id: 'us-east-primary',
    label: 'us-east-primary (Primary Cluster)',
    baseLoad: 42,
    baseLatency: 24,
    baseThroughput: 940,
  },
  'eu-central-replica': {
    id: 'eu-central-replica',
    label: 'eu-central-replica (FHIR Read Replica)',
    baseLoad: 31,
    baseLatency: 34,
    baseThroughput: 680,
  },
  'ap-south-edge': {
    id: 'ap-south-edge',
    label: 'ap-south-edge (ABDM + Inference Edge)',
    baseLoad: 48,
    baseLatency: 29,
    baseThroughput: 820,
  },
};

/**
 * Generates an initial 30-point rolling window (60 seconds at 2s intervals)
 * for a given infrastructure cluster node.
 */
export function buildInitialResourceWindow(
  clusterId: string,
  stressMode: boolean
): SystemResourceTick[] {
  const profile = CLUSTER_PROFILES[clusterId] || CLUSTER_PROFILES['us-east-primary'];
  const now = Date.now();
  const points: SystemResourceTick[] = [];

  for (let i = 29; i >= 0; i--) {
    const offsetSec = -i * 2;
    const t = new Date(now + offsetSec * 1000);
    const wave = Math.sin(i * 0.45) * 6 + Math.cos(i * 0.25) * 4;
    const surgeBoost = stressMode && i <= 10 ? (11 - i) * 3.4 : 0;

    const serverLoadPct = Math.min(
      98,
      Math.max(12, Math.round(profile.baseLoad + wave + surgeBoost))
    );
    const apiLatencyMs = Math.min(
      220,
      Math.max(
        8,
        Math.round(
          profile.baseLatency + wave * 1.4 + (stressMode && i <= 10 ? (11 - i) * 6.5 : 0)
        )
      )
    );
    const dbThroughputQps = Math.min(
      2400,
      Math.max(
        180,
        Math.round(
          profile.baseThroughput +
            wave * 28 +
            (stressMode && i <= 10 ? (11 - i) * 65 : 0)
        )
      )
    );

    points.push({
      offsetSec,
      timestampLabel: t.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      serverLoadPct,
      apiLatencyMs,
      dbThroughputQps,
      activeConnections: Math.round(dbThroughputQps / 14),
    });
  }

  return points;
}

interface SystemResourcesD3WidgetProps {
  activeRegion?: string;
  onRegionChange?: (regionId: string) => void;
}

export default function SystemResourcesD3Widget({
  activeRegion = 'us-east-primary',
  onRegionChange,
}: SystemResourcesD3WidgetProps) {
  const [selectedCluster, setSelectedCluster] = useState<string>(activeRegion);
  const [metricFilter, setMetricFilter] = useState<ResourceMetricFilter>('all');
  const [streamPaused, setStreamPaused] = useState<boolean>(false);
  const [stressTestActive, setStressTestActive] = useState<boolean>(false);
  const [series, setSeries] = useState<SystemResourceTick[]>(() =>
    buildInitialResourceWindow(activeRegion, false)
  );
  const [hoveredTick, setHoveredTick] = useState<SystemResourceTick | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 860,
    height: 300,
  });

  useEffect(() => {
    setSelectedCluster(activeRegion);
  }, [activeRegion]);

  // Rebuild baseline window when cluster or stress test changes
  useEffect(() => {
    setSeries(buildInitialResourceWindow(selectedCluster, stressTestActive));
  }, [selectedCluster, stressTestActive]);

  // Real-time 2-second telemetry ticker
  useEffect(() => {
    if (streamPaused) return;

    const profile =
      CLUSTER_PROFILES[selectedCluster] || CLUSTER_PROFILES['us-east-primary'];

    const interval = window.setInterval(() => {
      const now = new Date();
      const jitter = (Math.random() - 0.48) * 7;
      const surgeLoad = stressTestActive ? 34 + Math.random() * 10 : 0;
      const surgeLatency = stressTestActive ? 62 + Math.random() * 22 : 0;
      const surgeQps = stressTestActive ? 640 + Math.random() * 180 : 0;

      const nextLoad = Math.min(
        99,
        Math.max(14, Math.round(profile.baseLoad + jitter + surgeLoad))
      );
      const nextLatency = Math.min(
        240,
        Math.max(9, Math.round(profile.baseLatency + jitter * 1.6 + surgeLatency))
      );
      const nextQps = Math.min(
        2500,
        Math.max(200, Math.round(profile.baseThroughput + jitter * 32 + surgeQps))
      );

      setSeries((prev) => {
        const shifted = prev.slice(1).map((pt, idx) => ({
          ...pt,
          offsetSec: -((28 - idx) * 2),
        }));
        shifted.push({
          offsetSec: 0,
          timestampLabel: now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          serverLoadPct: nextLoad,
          apiLatencyMs: nextLatency,
          dbThroughputQps: nextQps,
          activeConnections: Math.round(nextQps / 14),
        });
        return shifted;
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [selectedCluster, streamPaused, stressTestActive]);

  // Responsive container observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.max(320, Math.floor(rect.width)),
          height: 300,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const latestTick = series[series.length - 1] || {
    offsetSec: 0,
    timestampLabel: 'Live',
    serverLoadPct: 42,
    apiLatencyMs: 24,
    dbThroughputQps: 940,
    activeConnections: 67,
  };
  const inspected = hoveredTick || latestTick;

  const peakLoad = useMemo(
    () => Math.max(...series.map((d) => d.serverLoadPct)),
    [series]
  );
  const avgLatency = useMemo(
    () =>
      Math.round(
        series.reduce((acc, d) => acc + d.apiLatencyMs, 0) / Math.max(1, series.length)
      ),
    [series]
  );
  const peakThroughput = useMemo(
    () => Math.max(...series.map((d) => d.dbThroughputQps)),
    [series]
  );

  // Render D3 multi-line real-time telemetry chart
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || series.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    svg
      .append('title')
      .attr('id', 'sys-resources-d3-title')
      .text(`Real-Time System Resources D3 Telemetry Chart (${selectedCluster})`);
    svg
      .append('desc')
      .attr('id', 'sys-resources-d3-desc')
      .text(
        `Real-time 60-second D3 telemetry chart displaying Server Load (${latestTick.serverLoadPct}%), API p95 Latency (${latestTick.apiLatencyMs} ms), and Database Query Throughput (${latestTick.dbThroughputQps} QPS). Use Left and Right arrow keys on the chart to inspect individual 2-second intervals.`
      );

    const margin = { top: 20, right: 52, bottom: 32, left: 48 };
    const innerWidth = Math.max(140, dimensions.width - margin.left - margin.right);
    const innerHeight = Math.max(140, dimensions.height - margin.top - margin.bottom);

    const defs = svg.append('defs');
    const loadGrad = defs
      .append('linearGradient')
      .attr('id', 'sys-load-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    loadGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#6366f1')
      .attr('stop-opacity', 0.24);
    loadGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#6366f1')
      .attr('stop-opacity', 0.0);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('role', 'presentation');

    const xScale = d3.scaleLinear().domain([-58, 0]).range([0, innerWidth]);

    // Left Y-axis: Server Load (%) & API Latency (ms) [0..160], or specific metric domain
    const leftDomain: [number, number] =
      metricFilter === 'load'
        ? [0, 100]
        : metricFilter === 'latency'
        ? [0, 220]
        : metricFilter === 'throughput'
        ? [0, 2400]
        : [0, 140];

    const yLeftScale = d3.scaleLinear().domain(leftDomain).range([innerHeight, 0]);

    // Right Y-axis for DB Query Throughput (QPS) when viewing 'all'
    const yRightScale = d3.scaleLinear().domain([0, 2200]).range([innerHeight, 0]);

    const yTicks = yLeftScale.ticks(5);

    g.selectAll('.sys-grid')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yLeftScale(d))
      .attr('y2', (d) => yLeftScale(d))
      .attr('stroke', 'rgba(148, 163, 184, 0.12)')
      .attr('stroke-dasharray', '3,3')
      .attr('aria-hidden', 'true');

    const xAxis = d3
      .axisBottom(xScale)
      .tickValues([-58, -45, -30, -15, 0])
      .tickFormat((d) => (Number(d) === 0 ? 'Now' : `${d}s`))
      .tickSizeOuter(0);

    const yLeftAxis = d3
      .axisLeft(yLeftScale)
      .ticks(5)
      .tickFormat((d) =>
        metricFilter === 'load'
          ? `${d}%`
          : metricFilter === 'latency'
          ? `${d}ms`
          : metricFilter === 'throughput'
          ? `${d}`
          : `${d}`
      )
      .tickSizeOuter(0);

    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .attr('aria-label', 'Rolling 60-second time window')
      .call(xAxis);
    xAxisGroup.select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.25)');
    xAxisGroup.selectAll('.tick line').remove();
    xAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');

    const yLeftAxisGroup = g
      .append('g')
      .attr('aria-label', 'Primary resource metric scale')
      .call(yLeftAxis);
    yLeftAxisGroup.select('.domain').remove();
    yLeftAxisGroup.selectAll('.tick line').remove();
    yLeftAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px');

    if (metricFilter === 'all') {
      const yRightAxis = d3
        .axisRight(yRightScale)
        .ticks(5)
        .tickFormat((d) => `${d} qps`)
        .tickSizeOuter(0);
      const yRightGroup = g
        .append('g')
        .attr('transform', `translate(${innerWidth},0)`)
        .attr('aria-label', 'Database throughput QPS scale')
        .call(yRightAxis);
      yRightGroup.select('.domain').remove();
      yRightGroup.selectAll('.tick line').remove();
      yRightGroup
        .selectAll('.tick text')
        .attr('fill', '#34d399')
        .attr('font-size', '10px');
    }

    // Helper to draw a metric curve + live points
    const drawCurve = (
      label: string,
      accessor: (d: SystemResourceTick) => number,
      scale: d3.ScaleLinear<number, number>,
      color: string,
      dashArray?: string,
      areaFill?: string
    ) => {
      if (areaFill) {
        const areaGen = d3
          .area<SystemResourceTick>()
          .x((d) => xScale(d.offsetSec))
          .y0(innerHeight)
          .y1((d) => scale(accessor(d)))
          .curve(d3.curveMonotoneX);

        g.append('path')
          .datum(series)
          .attr('fill', areaFill)
          .attr('aria-hidden', 'true')
          .attr('d', areaGen);
      }

      const lineGen = d3
        .line<SystemResourceTick>()
        .x((d) => xScale(d.offsetSec))
        .y((d) => scale(accessor(d)))
        .curve(d3.curveMonotoneX);

      const path = g
        .append('path')
        .datum(series)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.4)
        .attr('role', 'graphics-symbol')
        .attr('aria-label', `${label} real-time trend line`)
        .attr('d', lineGen);

      if (dashArray) {
        path.attr('stroke-dasharray', dashArray);
      }

      g.selectAll(null)
        .data(series.filter((_, idx) => idx % 3 === 0 || idx === series.length - 1))
        .enter()
        .append('circle')
        .attr('cx', (d) => xScale(d.offsetSec))
        .attr('cy', (d) => scale(accessor(d)))
        .attr('r', (d) => (d.offsetSec === 0 ? 4.5 : 2.6))
        .attr('fill', color)
        .attr('stroke', '#020617')
        .attr('stroke-width', 1.2)
        .attr('role', 'graphics-symbol')
        .attr('aria-label', (d) => `${label} at ${d.timestampLabel}: ${accessor(d)}`);
    };

    if (metricFilter === 'all' || metricFilter === 'load') {
      drawCurve(
        'Server Load Percentage',
        (d) => d.serverLoadPct,
        yLeftScale,
        '#6366f1',
        undefined,
        'url(#sys-load-grad)'
      );
    }

    if (metricFilter === 'all' || metricFilter === 'latency') {
      drawCurve(
        'API p95 Latency (ms)',
        (d) => d.apiLatencyMs,
        yLeftScale,
        '#f59e0b',
        metricFilter === 'all' ? '5,3' : undefined
      );
    }

    if (metricFilter === 'all' || metricFilter === 'throughput') {
      drawCurve(
        'Database Query Throughput (QPS)',
        (d) => d.dbThroughputQps,
        metricFilter === 'all' ? yRightScale : yLeftScale,
        '#10b981'
      );
    }

    // Interactive Pointer & Keyboard Scrubber Overlay
    const focusGroup = g.append('g').style('display', 'none').attr('aria-hidden', 'true');
    const focusLine = focusGroup
      .append('line')
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(226, 232, 240, 0.45)')
      .attr('stroke-dasharray', '3,3');

    const bisectSec = d3.bisector<SystemResourceTick, number>((d) => d.offsetSec).left;
    let keyboardIdx = series.length - 1;

    const updateInspectedPoint = (pt: SystemResourceTick, rectEl: SVGRectElement) => {
      const cx = xScale(pt.offsetSec);
      focusGroup.style('display', null);
      focusLine.attr('x1', cx).attr('x2', cx);
      setHoveredTick(pt);
      rectEl.setAttribute('aria-valuenow', String(pt.offsetSec));
      rectEl.setAttribute(
        'aria-valuetext',
        `${pt.timestampLabel} (${pt.offsetSec === 0 ? 'Live' : `${pt.offsetSec}s`}): Server Load ${pt.serverLoadPct}%, API Latency ${pt.apiLatencyMs} ms, DB Throughput ${pt.dbThroughputQps} QPS`
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
        'Interactive 60-second system resources timeline scrubber. Use Left and Right arrow keys to inspect server load, API latency, and database query throughput.'
      )
      .attr('aria-valuemin', '-58')
      .attr('aria-valuemax', '0')
      .attr('aria-valuenow', String(latestTick.offsetSec))
      .attr(
        'aria-valuetext',
        `Live (${latestTick.timestampLabel}): Server Load ${latestTick.serverLoadPct}%, API Latency ${latestTick.apiLatencyMs} ms, DB Throughput ${latestTick.dbThroughputQps} QPS`
      )
      .style('cursor', 'crosshair')
      .style('outline', 'none')
      .on('mouseenter', () => focusGroup.style('display', null))
      .on('focus', function () {
        const pt = series[keyboardIdx] || latestTick;
        updateInspectedPoint(pt, this);
      })
      .on('mousemove', function (event) {
        const [mx] = d3.pointer(event);
        const s0 = xScale.invert(mx);
        const idx = bisectSec(series, s0, 1);
        const d0 = series[idx - 1];
        const d1 = series[idx];
        const nearest =
          d1 && d0 ? (s0 - d0.offsetSec > d1.offsetSec - s0 ? d1 : d0) : d0 || d1;
        if (nearest) {
          keyboardIdx = series.indexOf(nearest);
          updateInspectedPoint(nearest, this);
        }
      })
      .on('keydown', function (event: KeyboardEvent) {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
          event.preventDefault();
          keyboardIdx = Math.max(0, keyboardIdx - 1);
          updateInspectedPoint(series[keyboardIdx], this);
        } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
          event.preventDefault();
          keyboardIdx = Math.min(series.length - 1, keyboardIdx + 1);
          updateInspectedPoint(series[keyboardIdx], this);
        } else if (event.key === 'Home') {
          event.preventDefault();
          keyboardIdx = 0;
          updateInspectedPoint(series[0], this);
        } else if (event.key === 'End') {
          event.preventDefault();
          keyboardIdx = series.length - 1;
          updateInspectedPoint(series[series.length - 1], this);
        }
      })
      .on('mouseleave', () => {
        focusGroup.style('display', 'none');
        setHoveredTick(null);
      })
      .on('blur', () => {
        focusGroup.style('display', 'none');
        setHoveredTick(null);
      });
  }, [series, dimensions, metricFilter, selectedCluster, latestTick]);

  const handleExportTelemetryCsv = () => {
    const headers = [
      'Offset_Sec',
      'Timestamp',
      'Cluster',
      'Server_Load_Pct',
      'API_p95_Latency_ms',
      'DB_Query_Throughput_QPS',
    ];
    const rows = series.map((d) =>
      [
        d.offsetSec,
        d.timestampLabel,
        selectedCluster,
        d.serverLoadPct,
        d.apiLatencyMs,
        d.dbThroughputQps,
      ].join(',')
    );
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-resources-${selectedCluster}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      aria-label="System Resources Real-Time D3 Telemetry Widget"
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5"
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Activity aria-hidden="true" className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>System Resources &bull; Real-Time D3 Telemetry Stream</span>
            {stressTestActive ? (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px]">
                Load Spike Active
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] inline-flex items-center gap-1">
                <CheckCircle2 aria-hidden="true" className="w-3 h-3" /> SLA Nominal
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-1">
            Server Load, API Latency &amp; Database Query Throughput
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live 2-second sampling across Rust Axum PID 1 proxy, FastAPI workers, and Cloud SQL / SQLite WAL engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cluster Node Selector */}
          <select
            aria-label="Select infrastructure cluster node"
            value={selectedCluster}
            onChange={(e) => {
              setSelectedCluster(e.target.value);
              if (onRegionChange) onRegionChange(e.target.value);
            }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {Object.values(CLUSTER_PROFILES).map((node) => (
              <option key={node.id} value={node.id} className="bg-slate-950 text-white">
                {node.label}
              </option>
            ))}
          </select>

          {/* Metric Filter Buttons */}
          <div
            role="group"
            aria-label="Filter system resource metrics"
            className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl"
          >
            {(
              [
                { id: 'all', label: 'All Metrics' },
                { id: 'load', label: 'Server Load' },
                { id: 'latency', label: 'API Latency' },
                { id: 'throughput', label: 'DB Throughput' },
              ] as Array<{ id: ResourceMetricFilter; label: string }>
            ).map((tab) => {
              const active = metricFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={active}
                  aria-label={`Display ${tab.label} on D3 system resources chart`}
                  onClick={() => setMetricFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Stress Test / Surge Simulator Button */}
          <button
            type="button"
            aria-pressed={stressTestActive}
            aria-label={
              stressTestActive
                ? 'Stop simulated API and database traffic spike'
                : 'Simulate high-concurrency API and database traffic spike'
            }
            onClick={() => setStressTestActive((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              stressTestActive
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Flame aria-hidden="true" className="w-3.5 h-3.5 text-rose-400" />
            <span>{stressTestActive ? 'Stop Load Spike' : 'Simulate Load Spike'}</span>
          </button>

          {/* Pause / Resume Stream */}
          <button
            type="button"
            aria-pressed={streamPaused}
            aria-label={
              streamPaused
                ? 'Resume real-time system resources telemetry stream'
                : 'Pause real-time system resources telemetry stream'
            }
            onClick={() => setStreamPaused((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            {streamPaused ? (
              <>
                <Play aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
                <span>Live</span>
              </>
            )}
          </button>

          {/* CSV Export */}
          <button
            type="button"
            aria-label="Export 60-second system resources telemetry as CSV"
            onClick={handleExportTelemetryCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <Download aria-hidden="true" className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* 3 Real-Time Resource KPI Summary Cards with Progress Bars */}
      <div
        role="region"
        aria-label="Real-time server load, API latency, and database query throughput metrics"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Card 1: Server Load */}
        <div
          role="group"
          aria-label={`Server Load ${inspected.serverLoadPct} percent`}
          className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              Server Load (CPU / Mem)
            </span>
            <Cpu aria-hidden="true" className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white font-mono">
                {inspected.serverLoadPct}%
              </span>
              <span className="text-xs text-slate-400 font-mono">utilization</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              60s Peak: {peakLoad}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Server CPU and memory load utilization"
            aria-valuenow={inspected.serverLoadPct}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"
          >
            <div
              className={`h-full transition-all duration-300 ${
                inspected.serverLoadPct >= 80 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${inspected.serverLoadPct}%` }}
            />
          </div>
        </div>

        {/* Card 2: API Latency */}
        <div
          role="group"
          aria-label={`API p95 Latency ${inspected.apiLatencyMs} milliseconds`}
          className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              API Gateway p95 Latency
            </span>
            <Gauge aria-hidden="true" className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white font-mono">
                {inspected.apiLatencyMs}
              </span>
              <span className="text-xs text-slate-400 font-mono">ms (p95)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              60s Avg: {avgLatency} ms
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="API p95 latency against 200ms SLA ceiling"
            aria-valuenow={Math.min(100, Math.round((inspected.apiLatencyMs / 200) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"
          >
            <div
              className={`h-full transition-all duration-300 ${
                inspected.apiLatencyMs >= 90 ? 'bg-rose-500' : 'bg-amber-400'
              }`}
              style={{
                width: `${Math.min(100, Math.round((inspected.apiLatencyMs / 200) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Card 3: Database Query Throughput */}
        <div
          role="group"
          aria-label={`Database Query Throughput ${inspected.dbThroughputQps} queries per second`}
          className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
              <span aria-hidden="true" className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              Database Query Throughput
            </span>
            <Database aria-hidden="true" className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-extrabold text-white font-mono">
                {inspected.dbThroughputQps.toLocaleString()}
              </span>
              <span className="text-xs text-slate-400 font-mono">QPS</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Peak: {peakThroughput.toLocaleString()} QPS
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Database query throughput utilization"
            aria-valuenow={Math.min(100, Math.round((inspected.dbThroughputQps / 2200) * 100))}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${Math.min(100, Math.round((inspected.dbThroughputQps / 2200) * 100))}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Interactive Hover & Keyboard Readout Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label="Inspected real-time system resource reading"
        className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono font-bold text-white">
            Sample: {inspected.timestampLabel} (
            {inspected.offsetSec === 0 ? 'Live' : `${inspected.offsetSec}s`})
          </span>
          <span className="text-indigo-300">
            Server Load: <strong>{inspected.serverLoadPct}%</strong>
          </span>
          <span className="text-amber-300">
            API p95 Latency: <strong>{inspected.apiLatencyMs} ms</strong>
          </span>
          <span className="text-emerald-300">
            DB Throughput: <strong>{inspected.dbThroughputQps.toLocaleString()} QPS</strong>
          </span>
        </div>
        <span className="font-mono text-[11px] text-slate-400">
          Active Pool: {inspected.activeConnections} DB conns &bull; Node: {selectedCluster}
        </span>
      </div>

      {/* D3 Multi-Line Real-Time Chart Canvas */}
      <div
        ref={containerRef}
        role="region"
        aria-label="Interactive D3 system resources chart canvas"
        className="w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 overflow-hidden"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          role="img"
          aria-labelledby="sys-resources-d3-title"
          aria-describedby="sys-resources-d3-desc"
          aria-label="D3 real-time system resources chart showing server load, API latency, and database query throughput"
          className="w-full h-[300px] block select-none"
        />
      </div>
    </section>
  );
}
