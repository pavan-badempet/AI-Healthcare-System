import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Heart, Wind, Zap, ShieldCheck,
  AlertTriangle, CheckCircle2, Play, Pause, RefreshCw, Volume2, VolumeX
} from 'lucide-react';
import { useTelemetry } from '@/lib/useTelemetry';

export function SotaTelemetryDashboard() {
  const { data: telemetry, status } = useTelemetry();
  const [isPlaying, setIsPlaying] = useState(true);
  const [lead, setLead] = useState<'II' | 'V1' | 'V5'>('II');
  const [sweepSpeed, setSweepSpeed] = useState<number>(25);
  const [filterMode, setFilterMode] = useState<'diagnostic' | 'monitoring'>('diagnostic');
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Animated sweep canvas for ECG trace
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 200);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 200;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      if (!isPlaying) {
        animFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Draw standard 1mm grid
      ctx.strokeStyle = '#064e3b25';
      ctx.lineWidth = 1;
      const gridSize = 16;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw ECG wave
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 4;
      ctx.beginPath();

      offsetRef.current = (offsetRef.current + 2) % 600;
      const baseMid = height / 2;

      for (let x = 0; x < width; x += 2) {
        const t = (x + offsetRef.current) % 300;
        let dy = 0;

        // P wave
        if (t > 30 && t < 60) dy = -Math.sin(((t - 30) / 30) * Math.PI) * 12;
        // Q wave
        else if (t >= 75 && t < 85) dy = 6;
        // R wave (peak)
        else if (t >= 85 && t < 95) dy = -65;
        // S wave
        else if (t >= 95 && t < 105) dy = 16;
        // T wave
        else if (t >= 140 && t < 190) dy = -Math.sin(((t - 140) / 50) * Math.PI) * 22;

        const y = baseMid + dy;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="space-y-6">
      {/* Vitals Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Heart Rate</span>
            <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {telemetry?.heart_rate ?? 76}{' '}
            <span className="text-xs font-normal text-slate-400">bpm</span>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">Normal Sinus Rhythm</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Oxygen Saturation (SpO2)</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {telemetry?.spo2 ?? 98}{' '}
            <span className="text-xs font-normal text-slate-400">%</span>
          </div>
          <div className="text-[11px] text-cyan-400 font-medium mt-1">Plethysmograph PI: 4.8%</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Non-Invasive BP (NIBP)</span>
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {telemetry?.blood_pressure ?? '122/78'}{' '}
            <span className="text-xs font-normal text-slate-400">mmHg</span>
          </div>
          <div className="text-[11px] text-indigo-400 font-medium mt-1">Mean Arterial: 92 mmHg</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400">Core Temp & EtCO2</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            36.8°C <span className="text-xs font-normal text-slate-400">/ 38 mmHg</span>
          </div>
          <div className="text-[11px] text-amber-400 font-medium mt-1">Normothermic</div>
        </div>
      </div>

      {/* Main Real-time Waveform Monitor */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              Lead {lead} Electrocardiogram (500 Samples/sec)
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">Rayon Multi-Threaded Biosignal Pipeline</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Resume'}
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-colors"
              title="Toggle QRS Beep"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Sweep Canvas */}
        <div className="mt-4 rounded-2xl overflow-hidden border border-emerald-950 bg-black relative">
          <div className="absolute top-3 left-4 flex gap-4 text-[11px] font-mono text-emerald-400 z-10 bg-black/60 px-3 py-1 rounded-lg backdrop-blur-sm">
            <span>Sweep: {sweepSpeed} mm/s</span>
            <span>Gain: 10 mm/mV</span>
            <span>Filter: 0.5 - 40 Hz (Bandpass + 60Hz Notch)</span>
          </div>

          <canvas ref={canvasRef} className="w-full block" />
        </div>

        {/* QRS Interval Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">PR Interval</span>
            <span className="text-white font-bold text-sm">162 ms</span>
            <span className="text-[10px] text-emerald-400 block">Normal (120-200)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">QRS Duration</span>
            <span className="text-white font-bold text-sm">88 ms</span>
            <span className="text-[10px] text-emerald-400 block">Normal (&lt; 100)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">QT / QTc (Bazett)</span>
            <span className="text-white font-bold text-sm">392 / 418 ms</span>
            <span className="text-[10px] text-emerald-400 block">Normal (&lt; 440)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">ST Displacement</span>
            <span className="text-white font-bold text-sm">+0.02 mV</span>
            <span className="text-[10px] text-emerald-400 block">Isoelectric</span>
          </div>
        </div>
      </div>
    </div>
  );
}
export default SotaTelemetryDashboard;
