import React from 'react';
import { Activity, Heart, Zap, Sparkles } from 'lucide-react';
import { SotaTelemetryDashboard } from '@/components/operations/SotaTelemetryDashboard';

export default function TelemetryPage() {
  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Activity className="w-4 h-4" />
              Real-Time ICU Physiological Signals
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">500 Hz Waveform Telemetry</h1>
            <p className="text-sm text-slate-400 mt-1">
              Rayon multi-threaded DSP filtering, real-time arrhythmia detection, and ST-segment displacement monitoring.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        <SotaTelemetryDashboard />
      </div>
    </div>
  );
}
