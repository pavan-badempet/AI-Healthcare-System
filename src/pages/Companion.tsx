import React, { useState } from 'react';
import {
  Heart, Activity, CheckCircle2, Calendar,
  Bell, Plus, ShieldCheck, Sparkles, User
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth';

export default function CompanionPage() {
  const { user } = useAuthStore();
  const [systolic, setSystolic] = useState<number>(120);
  const [diastolic, setDiastolic] = useState<number>(80);
  const [glucose, setGlucose] = useState<number>(104);
  const [pulse, setPulse] = useState<number>(72);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [medications, setMedications] = useState([
    { name: 'Metformin 500mg', time: '8:00 AM & 8:00 PM', taken: true },
    { name: 'Empagliflozin 10mg', time: 'Morning with water', taken: true },
    { name: 'Atorvastatin 20mg', time: 'At bedtime', taken: false },
  ]);

  const toggleMed = (index: number) => {
    setMedications((prev) =>
      prev.map((m, i) => (i === index ? { ...m, taken: !m.taken } : m))
    );
  };

  const handleLogVitals = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Heart className="w-4 h-4" />
              Patient Health Companion & Adherence Tracker
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Personal Health Companion</h1>
            <p className="text-sm text-slate-400 mt-1">
              Daily vital signs logging, medication schedule adherence, and proactive symptom guidance.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-full text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Adherence: 88% Weekly Target
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 mt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Vitals Logger */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              Log Bedside Vital Signs
            </h2>
            <p className="text-xs text-slate-400 mb-6">Recorded metrics automatically sync to your attending physician's EMR.</p>

            <form onSubmit={handleLogVitals} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Systolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Diastolic BP (mmHg)</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1">Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    value={glucose}
                    onChange={(e) => setGlucose(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Heart Rate (bpm)</label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20"
              >
                Sync Vitals to Care Team
              </button>

              {submitted && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center font-semibold text-xs">
                  Vitals recorded successfully and synced to EMR!
                </div>
              )}
            </form>
          </div>

          {/* Active Medication Schedule */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                Prescribed Medication Schedule
              </h2>
              <p className="text-xs text-slate-400 mb-6">Check off medications once taken to update adherence telemetry.</p>

              <div className="space-y-3">
                {medications.map((m, i) => (
                  <div
                    key={i}
                    onClick={() => toggleMed(i)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                      m.taken
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-200'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className={`font-bold ${m.taken ? 'line-through text-slate-400' : 'text-white'}`}>
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{m.time}</div>
                    </div>

                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                      m.taken ? 'bg-emerald-500 text-white border-emerald-400' : 'border-slate-700'
                    }`}>
                      {m.taken && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-500">
              Prescription data provided by Clinical Pharmacy Service via FHIR MedicationStatement.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
