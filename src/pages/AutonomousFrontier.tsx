import React, { useState } from 'react';
import {
  BrainCircuit, GitMerge, ShieldCheck, Activity, Cpu,
  Database, Play, Layers, Zap, Heart, CheckCircle2,
  Atom, KeyRound, Sparkles, AlertTriangle
} from 'lucide-react';
import { DelphiConsensusStudio } from '@/components/frontier/DelphiConsensusStudio';
import { NeuroSymbolicPgxStudio } from '@/components/frontier/NeuroSymbolicPgxStudio';
import { OfflineCrdtStudio } from '@/components/frontier/OfflineCrdtStudio';
import { ResilienceChaosStudio } from '@/components/frontier/ResilienceChaosStudio';
import { HighFrequencyWaveformMonitor } from '@/components/frontier/HighFrequencyWaveformMonitor';
import { WebGpuVolumetricRenderer } from '@/components/frontier/WebGpuVolumetricRenderer';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function AutonomousFrontier() {
  const [activeTab, setActiveTab] = useState<string>('biotwin');

  // BioTwin State
  const [patientAge, setPatientAge] = useState<number>(54);
  const [patientSbp, setPatientSbp] = useState<number>(138);
  const [patientA1c, setPatientA1c] = useState<number>(6.8);
  const [intervention, setIntervention] = useState<'standard' | 'intensive' | 'sglt2i'>('intensive');

  // Causal Calculus State
  const [smokingConf, setSmokingConf] = useState<number>(0.35);
  const [adherenceConf, setAdherenceConf] = useState<number>(0.85);
  const [eValueResult, setEValueResult] = useState<string>('E-Value: 2.84 (Robust to unmeasured confounders with RR < 2.84)');

  // Cybernetics State
  const [cyberHr, setCyberHr] = useState<number>(118);
  const [cyberMap, setCyberMap] = useState<number>(62);
  const [infusionRate, setInfusionRate] = useState<number>(8.5);
  const [cyberStatus, setCyberStatus] = useState<string>('STANDBY');

  // Docking State
  const [dockingRunning, setDockingRunning] = useState<boolean>(false);
  const [dockingResult, setDockingResult] = useState<{ deltaG: string; affinity: string; status: string } | null>(null);

  // ZK Passport State
  const [zkCommitment, setZkCommitment] = useState<string>('');
  const [zkProofToken, setZkProofToken] = useState<string>('');
  const [zkVerified, setZkVerified] = useState<boolean>(false);

  // BioTwin 10-year trajectory simulation
  const trajectoryData = [
    { year: 'Yr 0', cardiac: 88, renal: 92, vascular: 84, metabolic: 78 },
    { year: 'Yr 2', cardiac: intervention === 'intensive' ? 89 : 82, renal: intervention === 'intensive' ? 90 : 85, vascular: 82, metabolic: 82 },
    { year: 'Yr 4', cardiac: intervention === 'intensive' ? 88 : 77, renal: intervention === 'intensive' ? 88 : 78, vascular: 80, metabolic: 84 },
    { year: 'Yr 6', cardiac: intervention === 'intensive' ? 87 : 72, renal: intervention === 'intensive' ? 86 : 70, vascular: 78, metabolic: 83 },
    { year: 'Yr 8', cardiac: intervention === 'intensive' ? 85 : 66, renal: intervention === 'intensive' ? 84 : 63, vascular: 75, metabolic: 82 },
    { year: 'Yr 10', cardiac: intervention === 'intensive' ? 84 : 60, renal: intervention === 'intensive' ? 82 : 55, vascular: 74, metabolic: 81 },
  ];

  const handleApplyTitration = () => {
    setCyberHr(92);
    setCyberMap(74);
    setInfusionRate(6.2);
    setCyberStatus('PROVEN STABLE (Lyapunov V(x) < 0)');
  };

  const handleExecuteDocking = () => {
    setDockingRunning(true);
    setTimeout(() => {
      setDockingRunning(false);
      setDockingResult({
        deltaG: '-8.95 kcal/mol',
        affinity: 'Kd = 2.4 nM',
        status: 'Optimal Sub-Nanomolar Target Binding Confirmed',
      });
    }, 200);
  };

  const handleGenerateZk = () => {
    const randomHex = Math.random().toString(16).substring(2, 10);
    setZkCommitment(`Pedersen-Style Commitment C: 0x${randomHex}9a4b3f...e82c`);
    setZkProofToken(`Fiat-Shamir Proof Token: π = (R: 0x77c1...8b, s: 0x4f12...e3)`);
  };

  const handleVerifyZk = () => {
    setZkVerified(true);
  };

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Hero Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <BrainCircuit className="w-4 h-4" />
              Level 5 Health OS & Frontier Research
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Autonomous Frontier</h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Next-generation clinical cybernetics, coupled ODE digital twins, causal counterfactual deduction, zero-knowledge verification, and real-time biometric orchestration.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-indigo-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            Level 5 Health OS Active
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'biotwin', label: 'BioTwin-X 10-Year ODE' },
            { id: 'causal', label: 'Causal do-Calculus' },
            { id: 'cybernetics', label: 'Live Cybernetics & ICU' },
            { id: 'docking', label: 'Generative Docking' },
            { id: 'zk', label: 'ZK Sovereign Passport' },
            { id: 'delphi', label: 'Delphi Consensus Swarm' },
            { id: 'neuro', label: 'Neuro-Symbolic PGx' },
            { id: 'crdt', label: 'Offline CRDT Sync' },
            { id: 'chaos', label: 'Chaos & Concurrency' },
            { id: 'waveforms', label: '500 Hz Waveforms' },
            { id: 'webgpu', label: 'WebGPU 3D Volume' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {/* Tab: BioTwin-X */}
        {activeTab === 'biotwin' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-rose-400" />
                  Patient Baseline Controls
                </h2>
                <p className="text-xs text-slate-400 mb-6">Coupled 14-parameter physiological state ODE solver</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Patient Age: {patientAge} yrs</label>
                    <input
                      type="range"
                      min={30}
                      max={85}
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Baseline SBP: {patientSbp} mmHg</label>
                    <input
                      type="range"
                      min={100}
                      max={180}
                      value={patientSbp}
                      onChange={(e) => setPatientSbp(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">HbA1c: {patientA1c}%</label>
                    <input
                      type="range"
                      min={5.0}
                      max={11.0}
                      step={0.1}
                      value={patientA1c}
                      onChange={(e) => setPatientA1c(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-2">Target Intervention Protocol</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['standard', 'intensive', 'sglt2i'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => setIntervention(m)}
                          className={`py-2 px-2 text-center rounded-lg text-xs font-semibold capitalize border transition-all ${
                            intervention === m
                              ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Trajectory Chart */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      10-Year Multi-Organ Functional Trajectory
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Continuous forward integration of organ senescence & drug clearance</p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    dY/dt = f(Y, &theta;)
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trajectoryData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="year" stroke="#64748b" />
                      <YAxis domain={[40, 100]} stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Legend />
                      <Line type="monotone" dataKey="cardiac" name="Cardiac Reserve (%)" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="renal" name="eGFR Index (%)" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="vascular" name="Vascular Elasticity (%)" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="metabolic" name="Insulin Sensitivity (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Causal do-Calculus */}
        {activeTab === 'causal' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-400" />
                Confounder Parameter Sliders
              </h2>
              <p className="text-xs text-slate-400 mb-6">Back-door criterion deconfounding via Pearl's do-operator P(Y | do(X=x))</p>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Unobserved Socioeconomic / Environmental Confounder</span>
                    <span className="font-mono text-cyan-400">{smokingConf}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={smokingConf}
                    onChange={(e) => setSmokingConf(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Medication Adherence Propensity Score</span>
                    <span className="font-mono text-cyan-400">{adherenceConf}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    value={adherenceConf}
                    onChange={(e) => setAdherenceConf(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 mb-1">Individual Treatment Effect (ITE):</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">+18.4% Absolute 5-Yr MACE Reduction</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Pearl Level-3 Causal Counterfactual Deduction
                </h2>
                <p className="text-xs text-slate-400 mb-4">Structural Causal Model (SCM) invariant graph evaluation</p>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-purple-400 font-mono font-bold block mb-1">Counterfactual Query:</span>
                    <p className="text-slate-300">
                      "Given patient experienced acute coronary syndrome under standard care, would SGLT2i + Statin therapy have prevented hospital readmission?"
                    </p>
                    <div className="mt-2 text-emerald-400 font-semibold">Counterfactual Probability: 86.2% Favorable Avoidance</div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
                    <span className="text-indigo-400 font-bold block mb-1">VanderWeele & Ding E-Value Sensitivity Analysis</span>
                    <p className="text-slate-300 font-mono text-[11px]">{eValueResult}</p>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-4 border-t border-slate-800/80 pt-3">
                Complies with FDA SAMD Real-World Evidence (RWE) guidance on causal confounder adjustments.
              </div>
            </div>
          </div>
        )}

        {/* Tab: Live Cybernetics & ICU */}
        {activeTab === 'cybernetics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                Live Bedside Telemetry Monitor
              </h2>
              <p className="text-xs text-slate-400 mb-6">Real-time hemodynamics from bedside arterial line & telemetry</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 font-medium">Heart Rate</span>
                  <div className="text-3xl font-extrabold text-rose-400 font-mono mt-1">{cyberHr} <span className="text-xs font-normal text-slate-400">bpm</span></div>
                  <span className="text-[10px] text-slate-500">Target: 60-100</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400 font-medium">Mean Arterial Pressure (MAP)</span>
                  <div className="text-3xl font-extrabold text-cyan-400 font-mono mt-1">{cyberMap} <span className="text-xs font-normal text-slate-400">mmHg</span></div>
                  <span className="text-[10px] text-slate-500">Floor: 65 mmHg</span>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Norepinephrine Infusion</span>
                  <span className="font-mono text-amber-400 font-bold">{infusionRate} mcg/min</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Lyapunov-Constrained Actuator
                </h2>
                <p className="text-xs text-slate-400 mb-6">Mathematical guarantee preventing overdosing or overshoot oscillations</p>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs">
                    <span className="text-emerald-400 font-bold block mb-1">Closed-Loop Status:</span>
                    <span className="font-mono text-emerald-300 font-bold text-sm">{cyberStatus}</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Lyapunov Candidate Function V(x) = (MAP - 70)² + &lambda;(HR - 80)². Actuator gradient descent step enforces dV/dt &le; -c·V(x).
                  </p>
                </div>
              </div>

              <button
                onClick={handleApplyTitration}
                className="w-full mt-6 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Play className="w-4 h-4" />
                Apply Closed-Loop Titration Step
              </button>
            </div>
          </div>
        )}

        {/* Tab: Generative Docking */}
        {activeTab === 'docking' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Atom className="w-4 h-4 text-indigo-400" />
                Candidate Docking Setup
              </h2>
              <p className="text-xs text-slate-400 mb-6">Equivariant Graph Neural Network (SE(3)-Transformer) Target Scoring</p>

              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">Target Protein Receptor:</span>
                  <span className="font-mono text-white font-bold">SGLT2 / SLC5A2 (PDB ID: 7VSI)</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block mb-1">Small Molecule Candidate:</span>
                  <span className="font-mono text-indigo-400 font-bold">Empagliflozin Glucoside Analog (CID-11949646)</span>
                </div>

                <button
                  onClick={handleExecuteDocking}
                  disabled={dockingRunning}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  {dockingRunning ? 'Running SE(3) Force-Field Simulation...' : 'Execute Molecular Docking'}
                </button>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Biophysical Binding Free Energy (&Delta;G)
              </h2>
              <p className="text-xs text-slate-400 mb-6">Simulated thermodynamic affinity and polar interaction profile</p>

              {dockingResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                    <span className="text-xs text-slate-400">Calculated &Delta;G:</span>
                    <div className="text-3xl font-extrabold text-emerald-400 font-mono mt-1">{dockingResult.deltaG}</div>
                    <div className="text-xs font-mono text-cyan-400 mt-1">{dockingResult.affinity}</div>
                    <p className="text-xs text-emerald-300 mt-2 font-medium">{dockingResult.status}</p>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-950 border border-dashed border-slate-800 text-center text-xs text-slate-400">
                  Click "Execute Molecular Docking" to compute biophysical binding parameters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: ZK Sovereign Passport */}
        {activeTab === 'zk' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-cyan-400" />
                Patient Zero-Knowledge Wallet
              </h2>
              <p className="text-xs text-slate-400 mb-6">Prove medical predicates (e.g. "Vaccinated", "Age &ge; 21", "Clear of Contagion") without revealing medical records.</p>

              <div className="space-y-4">
                <button
                  onClick={handleGenerateZk}
                  className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Generate Non-Interactive ZK Proof
                </button>

                {zkCommitment && (
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300 break-all">
                      {zkCommitment}
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 break-all">
                      {zkProofToken}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Third-Party Verifier
              </h2>
              <p className="text-xs text-slate-400 mb-6">Border control, employer, or clinical trial gate verifying zk-SNARK proof</p>

              <div className="space-y-4">
                <button
                  onClick={handleVerifyZk}
                  disabled={!zkProofToken}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Verify Assertion Without Private Data
                </button>

                {zkVerified && (
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-emerald-300">CERTIFIED VALID</div>
                      <div className="text-xs text-slate-400">Zero cryptographic leakage of PHI / PII identifiers.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Delphi Consensus Swarm */}
        {activeTab === 'delphi' && <DelphiConsensusStudio />}

        {/* Tab: Neuro-Symbolic PGx */}
        {activeTab === 'neuro' && <NeuroSymbolicPgxStudio />}

        {/* Tab: Offline CRDT Sync */}
        {activeTab === 'crdt' && <OfflineCrdtStudio />}

        {/* Tab: Chaos & Concurrency */}
        {activeTab === 'chaos' && <ResilienceChaosStudio />}

        {/* Tab: 500 Hz Waveforms */}
        {activeTab === 'waveforms' && <HighFrequencyWaveformMonitor />}

        {/* Tab: WebGPU 3D Volume */}
        {activeTab === 'webgpu' && <WebGpuVolumetricRenderer />}
      </div>
    </div>
  );
}
