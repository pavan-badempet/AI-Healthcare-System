import React, { useState, useEffect } from 'react';
import {
  Activity, Clock, AlertTriangle, FileText,
  CheckCircle2, Stethoscope, RefreshCw, Filter
} from 'lucide-react';
import { getDoctorPatientCareEventFeed, type CareEvent } from '@/lib/api';

interface PatientCareTimelineProps {
  patientId: number;
}

export default function PatientCareTimeline({ patientId }: PatientCareTimelineProps) {
  const [events, setEvents] = useState<CareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const feed = await getDoctorPatientCareEventFeed(patientId);
      setEvents(feed.events || []);
    } catch (err) {
      console.error('Failed to load care timeline', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
  }, [patientId]);

  const filteredEvents = events.filter((ev) => {
    if (filterSeverity === 'all') return true;
    return ev.severity === filterSeverity;
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            Longitudinal Trajectory
          </div>
          <h3 className="text-xl font-bold text-white mt-1">Patient Care Event Feed</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time auditable stream of clinical orders, vital alerts, and multidisciplinary notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warnings</option>
            <option value="info">Routine Info</option>
          </select>

          <button
            onClick={loadTimeline}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
            title="Refresh Timeline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mt-6">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            No care events recorded matching the selected filter.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {filteredEvents.map((event) => {
              const isWarning = event.severity === 'warning';
              const isCritical = event.severity === 'critical';

              return (
                <div key={event.id} className="relative group">
                  {/* Dot */}
                  <span
                    className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-slate-950 transition-transform group-hover:scale-125 ${
                      isCritical
                        ? 'bg-rose-500 ring-4 ring-rose-500/20'
                        : isWarning
                        ? 'bg-amber-400 ring-4 ring-amber-400/20'
                        : 'bg-indigo-500 ring-4 ring-indigo-500/20'
                    }`}
                  />

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 transition-colors hover:border-slate-700">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{event.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                            isCritical
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : isWarning
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                          }`}
                        >
                          {event.event_type}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {event.summary}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
