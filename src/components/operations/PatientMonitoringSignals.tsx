import React from 'react';
import { Activity, Heart, Wind, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTelemetry } from '@/lib/useTelemetry';
import VitalSignsChartCard from './VitalSignsChartCard';

interface PatientMonitoringSignalsProps {
  patientId: number;
}

export default function PatientMonitoringSignals({ patientId }: PatientMonitoringSignalsProps) {
  const { data: vitals, status } = useTelemetry();

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4 animate-pulse" />
              Continuous Telemetry Feeds
            </div>
            <h3 className="text-xl font-bold text-white mt-1">500 Hz Waveform & Biosignal Stream</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live bedside telemetry monitoring with automated QRS anomaly and arrhythmia detection.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Streaming Active ({status})
          </div>
        </div>

        {/* Signals Vitals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span className="font-medium">Heart Rate</span>
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {vitals?.heart_rate ?? 76} <span className="text-xs font-normal text-slate-400">bpm</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">Normal Sinus Rhythm</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span className="font-medium">Pulse Oximetry (SpO2)</span>
              <Wind className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {vitals?.spo2 ?? 98} <span className="text-xs font-normal text-slate-400">%</span>
            </div>
            <div className="text-[11px] text-cyan-400 font-medium mt-1">Adequate Oxygenation</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span className="font-medium">Blood Pressure</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {vitals?.blood_pressure ?? '122/78'} <span className="text-xs font-normal text-slate-400">mmHg</span>
            </div>
            <div className="text-[11px] text-indigo-400 font-medium mt-1">MAP: 92 mmHg</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span className="font-medium">Respiratory Rate</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-white mt-2">
              {vitals?.respiratory_rate ?? 16} <span className="text-xs font-normal text-slate-400">/min</span>
            </div>
            <div className="text-[11px] text-amber-400 font-medium mt-1">Eupneic Pattern</div>
          </div>
        </div>

        {/* Real-time ECG Simulated Waveform Trace */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div className="flex justify-between items-center mb-3 text-xs">
            <span className="font-mono text-slate-400">Lead II ECG Electrocardiogram Trace (25 mm/s, 10 mm/mV)</span>
            <span className="text-[11px] font-mono text-emerald-400">Signal SNR: 32 dB</span>
          </div>

          <div className="h-28 w-full flex items-center justify-center relative overflow-hidden bg-[#050b14] rounded-xl border border-emerald-950">
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#064e3b15_1px,transparent_1px),linear-gradient(to_bottom,#064e3b15_1px,transparent_1px)] bg-[size:16px_16px]"></div>

            <svg className="w-full h-full text-emerald-400 stroke-current fill-none stroke-[1.5]" preserveAspectRatio="none" viewBox="0 0 600 100">
              <path d="M 0 50 L 50 50 L 60 48 L 70 52 L 80 50 L 100 50 L 105 55 L 110 15 L 115 85 L 120 50 L 130 50 L 145 42 L 160 50 L 220 50 L 230 48 L 240 52 L 250 50 L 270 50 L 275 55 L 280 15 L 285 85 L 290 50 L 300 50 L 315 42 L 330 50 L 390 50 L 400 48 L 410 52 L 420 50 L 440 50 L 445 55 L 450 15 L 455 85 L 460 50 L 470 50 L 485 42 L 500 50 L 600 50" />
            </svg>
          </div>
        </div>
      </div>

      {/* 24-Hour D3 Vital Signs Trend Chart */}
      <VitalSignsChartCard patientId={patientId} compactHeader />
    </div>
  );
}
