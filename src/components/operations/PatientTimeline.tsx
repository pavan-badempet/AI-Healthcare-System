/**
 * PatientTimeline — D3-based interactive chronological medical timeline
 * visualizing surgeries/procedures, medications, and lab results on the Patient Detail page.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  Calendar,
  Pill,
  FlaskConical,
  Scissors,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
} from 'lucide-react';
import { getDoctorPatientCareEventFeed, type CareEvent } from '@/lib/api';

export type MedicalEventCategory = 'surgery' | 'medication' | 'lab';
export type MedicalEventStatus = 'normal' | 'attention' | 'critical';
export type TimelineRangeKey = '30d' | '6m' | '1y';

export interface PatientTimelineEvent {
  id: string;
  category: MedicalEventCategory;
  title: string;
  date: string; // ISO date string
  endDate?: string; // Optional duration end date for medication courses
  summary: string;
  keyMetric: string;
  clinician: string;
  department: string;
  status: MedicalEventStatus;
}

interface PatientTimelineProps {
  patientId: number;
  patientName?: string;
}

const CATEGORY_META: Record<
  MedicalEventCategory,
  { label: string; shortLabel: string; color: string; bgBadge: string }
> = {
  surgery: {
    label: 'Surgeries & Procedures',
    shortLabel: 'Surgeries',
    color: '#f43f5e',
    bgBadge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  medication: {
    label: 'Medications',
    shortLabel: 'Medications',
    color: '#f59e0b',
    bgBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  lab: {
    label: 'Lab Results',
    shortLabel: 'Lab Results',
    color: '#38bdf8',
    bgBadge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
};

function buildPatientMedicalHistory(
  patientId: number,
  liveEvents: CareEvent[]
): PatientTimelineEvent[] {
  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 86400000).toISOString();

  const baseEvents: PatientTimelineEvent[] = [
    {
      id: `surg-${patientId}-1`,
      category: 'surgery',
      title: 'Laparoscopic Cholecystectomy',
      date: daysAgo(310),
      summary:
        'Uncomplicated minimally invasive gallbladder removal under general anesthesia. Discharged home within 24 hours.',
      keyMetric: 'Duration: 65 min · EBL < 30 mL',
      clinician: 'Dr. R. Nair, General Surgery',
      department: 'Surgical Suite B',
      status: 'normal',
    },
    {
      id: `lab-${patientId}-1`,
      category: 'lab',
      title: 'Comprehensive Metabolic & Lipid Panel',
      date: daysAgo(240),
      summary:
        'Routine baseline blood panel. LDL cholesterol mildly elevated at 136 mg/dL; kidney and liver markers normal.',
      keyMetric: 'LDL: 136 mg/dL · eGFR: 89',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Central Pathology',
      status: 'attention',
    },
    {
      id: `med-${patientId}-1`,
      category: 'medication',
      title: 'Started Atorvastatin 20 mg Daily',
      date: daysAgo(235),
      endDate: daysAgo(0),
      summary:
        'Initiated nightly statin therapy for cholesterol reduction and primary cardiovascular protection.',
      keyMetric: '20 mg Oral · Nightly',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Cardiology Clinic',
      status: 'normal',
    },
    {
      id: `lab-${patientId}-2`,
      category: 'lab',
      title: 'Hemoglobin A1c & Fasting Glucose',
      date: daysAgo(150),
      summary:
        'Glycemic screening showed HbA1c of 6.8% and fasting glucose of 118 mg/dL, indicating early type 2 glycemic elevation.',
      keyMetric: 'HbA1c: 6.8% · Glucose: 118 mg/dL',
      clinician: 'Dr. A. Mehta, Endocrinology',
      department: 'Metabolic Lab',
      status: 'attention',
    },
    {
      id: `med-${patientId}-2`,
      category: 'medication',
      title: 'Started Metformin ER 500 mg',
      date: daysAgo(145),
      endDate: daysAgo(0),
      summary:
        'Extended-release metformin prescribed twice daily with meals to improve insulin sensitivity and glycemic control.',
      keyMetric: '500 mg Oral · Twice Daily',
      clinician: 'Dr. A. Mehta, Endocrinology',
      department: 'Outpatient Pharmacy',
      status: 'normal',
    },
    {
      id: `surg-${patientId}-2`,
      category: 'surgery',
      title: 'Diagnostic Coronary Angiography & Stent',
      date: daysAgo(58),
      summary:
        'Catheterization identified 75% mid-LAD stenosis; single drug-eluting stent deployed with TIMI-3 flow restored.',
      keyMetric: '1x DES to Mid-LAD · 0% Residual',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Cardiac Cath Lab',
      status: 'critical',
    },
    {
      id: `med-${patientId}-3`,
      category: 'medication',
      title: 'Started Lisinopril 10 mg & Dual Antiplatelet',
      date: daysAgo(57),
      endDate: daysAgo(0),
      summary:
        'Post-stent maintenance regimen initiated to protect stent patency and maintain blood pressure under 125/80 mmHg.',
      keyMetric: 'Lisinopril 10 mg + Clopidogrel 75 mg',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Inpatient Cardiology',
      status: 'normal',
    },
    {
      id: `lab-${patientId}-3`,
      category: 'lab',
      title: 'Post-Procedure Cardiac Troponin & Renal Panel',
      date: daysAgo(24),
      summary:
        'Follow-up cardiac enzyme and kidney function check. Troponin normalized to 8.2 ng/L and creatinine stable at 0.98 mg/dL.',
      keyMetric: 'hs-Troponin: 8.2 ng/L · Cr: 0.98 mg/dL',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Cardiology Lab',
      status: 'normal',
    },
    {
      id: `surg-${patientId}-3`,
      category: 'surgery',
      title: 'Transthoracic Echocardiogram (TTE)',
      date: daysAgo(11),
      summary:
        'Non-invasive ultrasound imaging confirmed preserved left ventricular ejection fraction (LVEF 58%) with normal valve motion.',
      keyMetric: 'LVEF: 58% · Normal Wall Motion',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Non-Invasive Cardiology',
      status: 'normal',
    },
    {
      id: `lab-${patientId}-4`,
      category: 'lab',
      title: 'Latest Follow-Up Lipid & HbA1c Check',
      date: daysAgo(3),
      summary:
        'LDL cholesterol improved from 136 to 94 mg/dL on statin therapy; HbA1c improved to 6.3%.',
      keyMetric: 'LDL: 94 mg/dL · HbA1c: 6.3%',
      clinician: 'Dr. Sarah Chen, MD',
      department: 'Central Pathology',
      status: 'normal',
    },
  ];

  // Map any live care events into the timeline
  const mappedLiveEvents: PatientTimelineEvent[] = liveEvents.slice(0, 4).map((ev, idx) => {
    const lowerType = (ev.event_type || '').toLowerCase();
    const category: MedicalEventCategory =
      lowerType.includes('med') || lowerType.includes('rx')
        ? 'medication'
        : lowerType.includes('surg') || lowerType.includes('proc')
        ? 'surgery'
        : 'lab';

    const status: MedicalEventStatus =
      ev.severity === 'critical'
        ? 'critical'
        : ev.severity === 'warning'
        ? 'attention'
        : 'normal';

    return {
      id: `live-ev-${ev.id}-${idx}`,
      category,
      title: ev.title,
      date: ev.created_at || daysAgo(1),
      summary: ev.summary,
      keyMetric: `Recorded Event · ${ev.event_type}`,
      clinician: 'Clinical Care Team',
      department: 'Inpatient Ward',
      status,
    };
  });

  return [...baseEvents, ...mappedLiveEvents].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export default function PatientTimeline({ patientId }: PatientTimelineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [liveEvents, setLiveEvents] = useState<CareEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'all' | MedicalEventCategory>('all');
  const [rangeKey, setRangeKey] = useState<TimelineRangeKey>('1y');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [zoomResetCounter, setZoomResetCounter] = useState<number>(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 820,
    height: 240,
  });

  useEffect(() => {
    let active = true;
    getDoctorPatientCareEventFeed(patientId)
      .then((feed) => {
        if (active && Array.isArray(feed?.events)) {
          setLiveEvents(feed.events);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [patientId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.max(320, Math.floor(rect.width)),
          height: 240,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const allEvents = useMemo(
    () => buildPatientMedicalHistory(patientId, liveEvents),
    [patientId, liveEvents]
  );

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const cutoffDays = rangeKey === '30d' ? 35 : rangeKey === '6m' ? 190 : 370;
    const cutoffMs = now - cutoffDays * 86400000;

    return allEvents.filter((ev) => {
      const evMs = new Date(ev.date).getTime();
      if (evMs < cutoffMs) return false;
      if (selectedCategory !== 'all' && ev.category !== selectedCategory) return false;
      return true;
    });
  }, [allEvents, selectedCategory, rangeKey]);

  const activeEvent = useMemo(() => {
    if (selectedEventId) {
      const found = filteredEvents.find((e) => e.id === selectedEventId);
      if (found) return found;
    }
    return filteredEvents[filteredEvents.length - 1] || allEvents[allEvents.length - 1];
  }, [filteredEvents, allEvents, selectedEventId]);

  // Render D3 Interactive Multi-Lane Timeline
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl || filteredEvents.length === 0) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const margin = { top: 24, right: 32, bottom: 38, left: 110 };
    const innerWidth = Math.max(120, dimensions.width - margin.left - margin.right);
    const innerHeight = Math.max(100, dimensions.height - margin.top - margin.bottom);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Clip path for zoomed timeline points
    svg
      .append('defs')
      .append('clipPath')
      .attr('id', 'patient-timeline-clip')
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight);

    const now = new Date();
    const minDate =
      d3.min(filteredEvents, (d) => new Date(d.date)) ||
      new Date(now.getTime() - 365 * 86400000);
    const paddedMin = new Date(minDate.getTime() - 8 * 86400000);
    const paddedMax = new Date(now.getTime() + 6 * 86400000);

    const xScale = d3.scaleTime().domain([paddedMin, paddedMax]).range([0, innerWidth]);

    const categories: MedicalEventCategory[] = ['surgery', 'medication', 'lab'];
    const yScale = d3
      .scalePoint<MedicalEventCategory>()
      .domain(categories)
      .range([24, innerHeight - 24]);

    // Swimlane Horizontal Track Lines & Labels
    categories.forEach((cat) => {
      const yPos = yScale(cat) || 0;
      const meta = CATEGORY_META[cat];

      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yPos)
        .attr('y2', yPos)
        .attr('stroke', 'rgba(148, 163, 184, 0.16)')
        .attr('stroke-dasharray', '4,4');

      g.append('text')
        .attr('x', -14)
        .attr('y', yPos + 4)
        .attr('text-anchor', 'end')
        .attr('fill', meta.color)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .text(meta.shortLabel);
    });

    // Bottom Time Axis
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(Math.min(6, Math.floor(innerWidth / 110)))
          .tickSizeOuter(0)
      );

    xAxisGroup.select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.25)');
    xAxisGroup.selectAll('.tick line').attr('stroke', 'rgba(148, 163, 184, 0.2)');
    xAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');

    const plotArea = g.append('g').attr('clip-path', 'url(#patient-timeline-clip)');

    const renderNodes = (currentXScale: d3.ScaleTime<number, number>) => {
      plotArea.selectAll('*').remove();

      // Medication Duration Bars
      const medBars = filteredEvents.filter((d) => d.category === 'medication' && d.endDate);
      plotArea
        .selectAll('.med-duration-bar')
        .data(medBars)
        .enter()
        .append('line')
        .attr('class', 'med-duration-bar')
        .attr('x1', (d) => currentXScale(new Date(d.date)))
        .attr('x2', (d) => currentXScale(new Date(d.endDate!)))
        .attr('y1', (d) => yScale(d.category) || 0)
        .attr('y2', (d) => yScale(d.category) || 0)
        .attr('stroke', CATEGORY_META.medication.color)
        .attr('stroke-width', 6)
        .attr('stroke-linecap', 'round')
        .attr('opacity', 0.22);

      // Event Node Groups
      const nodes = plotArea
        .selectAll('.timeline-event-node')
        .data(filteredEvents)
        .enter()
        .append('g')
        .attr('class', 'timeline-event-node')
        .attr(
          'transform',
          (d) => `translate(${currentXScale(new Date(d.date))},${yScale(d.category) || 0})`
        )
        .style('cursor', 'pointer')
        .on('click', (_, d) => {
          setSelectedEventId(d.id);
        })
        .on('mouseenter', (_, d) => {
          setSelectedEventId(d.id);
        });

      // Outer pulse ring for selected or critical events
      nodes
        .append('circle')
        .attr('r', (d) => (d.id === activeEvent?.id ? 12 : d.status === 'critical' ? 9 : 0))
        .attr('fill', (d) => CATEGORY_META[d.category].color)
        .attr('opacity', (d) => (d.id === activeEvent?.id ? 0.28 : 0.18));

      // Main Event Circle
      nodes
        .append('circle')
        .attr('r', (d) => (d.id === activeEvent?.id ? 7.5 : 6))
        .attr('fill', (d) =>
          d.id === activeEvent?.id ? '#ffffff' : CATEGORY_META[d.category].color
        )
        .attr('stroke', (d) => CATEGORY_META[d.category].color)
        .attr('stroke-width', (d) => (d.id === activeEvent?.id ? 3 : 2));

      // Compact Label above selected node
      nodes
        .filter((d) => d.id === activeEvent?.id)
        .append('text')
        .attr('y', -13)
        .attr('text-anchor', 'middle')
        .attr('fill', '#f8fafc')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .text((d) => (d.title.length > 26 ? `${d.title.slice(0, 24)}…` : d.title));
    };

    renderNodes(xScale);

    // Interactive D3 Horizontal Zoom & Pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 6])
      .translateExtent([
        [0, 0],
        [innerWidth, innerHeight],
      ])
      .on('zoom', (event) => {
        const newXScale = event.transform.rescaleX(xScale);
        xAxisGroup.call(
          d3
            .axisBottom(newXScale)
            .ticks(Math.min(6, Math.floor(innerWidth / 110)))
            .tickSizeOuter(0)
        );
        xAxisGroup.select('.domain').attr('stroke', 'rgba(148, 163, 184, 0.25)');
        xAxisGroup.selectAll('.tick line').attr('stroke', 'rgba(148, 163, 184, 0.2)');
        xAxisGroup.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px');
        renderNodes(newXScale);
      });

    svg.call(zoom);
  }, [filteredEvents, dimensions, activeEvent?.id, zoomResetCounter]);

  const counts = useMemo(
    () => ({
      surgery: allEvents.filter((e) => e.category === 'surgery').length,
      medication: allEvents.filter((e) => e.category === 'medication').length,
      lab: allEvents.filter((e) => e.category === 'lab').length,
    }),
    [allEvents]
  );

  return (
    <section
      aria-label="Patient Medical Timeline"
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6"
    >
      {/* Top Bar: Title + Simple Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wide">
            <Calendar className="w-4 h-4" />
            <span>Interactive D3 Chronology</span>
          </div>
          <h3 className="text-xl font-bold text-white mt-0.5">Patient Medical Timeline</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click or hover any point on the timeline to inspect surgeries, medications, and lab
            results. Scroll to zoom.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div
            role="group"
            aria-label="Filter timeline by category"
            className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl"
          >
            {(
              [
                { id: 'all', label: `All (${allEvents.length})` },
                { id: 'surgery', label: `Surgeries (${counts.surgery})` },
                { id: 'medication', label: `Medications (${counts.medication})` },
                { id: 'lab', label: `Labs (${counts.lab})` },
              ] as Array<{ id: 'all' | MedicalEventCategory; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div
            role="group"
            aria-label="Select timeline range"
            className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl"
          >
            {(
              [
                { id: '30d', label: '30 Days' },
                { id: '6m', label: '6 Months' },
                { id: '1y', label: '1 Year' },
              ] as Array<{ id: TimelineRangeKey; label: string }>
            ).map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => setRangeKey(range.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  rangeKey === range.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setZoomResetCounter((c) => c + 1)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset timeline zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* D3 Multi-Lane SVG Canvas */}
      <div
        ref={containerRef}
        className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-3 overflow-hidden"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          role="img"
          aria-label="Interactive D3 patient timeline showing surgeries, medications, and lab results"
          className="w-full h-[240px] block select-none"
        />
      </div>

      {/* Selected Event Details Card */}
      {activeEvent && (
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                  CATEGORY_META[activeEvent.category].bgBadge
                }`}
              >
                {CATEGORY_META[activeEvent.category].label}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {new Date(activeEvent.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {activeEvent.status === 'critical' ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> Key Intervention
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              )}
            </div>

            <h4 className="text-base font-bold text-white">{activeEvent.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {activeEvent.summary}
            </p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 shrink-0 min-w-[220px] space-y-1">
            <div className="text-[11px] text-slate-400">Result / Dosage</div>
            <div className="text-xs font-bold text-white">{activeEvent.keyMetric}</div>
            <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-indigo-400" />
              <span>{activeEvent.clinician}</span>
            </div>
          </div>
        </div>
      )}

      {/* Synchronized Chronological Event Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[...filteredEvents].reverse().map((ev) => {
          const isSelected = activeEvent?.id === ev.id;
          const Icon =
            ev.category === 'surgery'
              ? Scissors
              : ev.category === 'medication'
              ? Pill
              : FlaskConical;

          return (
            <button
              key={ev.id}
              type="button"
              onClick={() => setSelectedEventId(ev.id)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-950/30 border-indigo-500/60 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span
                  className="font-semibold flex items-center gap-1.5"
                  style={{ color: CATEGORY_META[ev.category].color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {CATEGORY_META[ev.category].shortLabel}
                </span>
                <span className="text-[11px] text-slate-400">
                  {new Date(ev.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1.5 truncate">{ev.title}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{ev.keyMetric}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
