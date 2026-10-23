import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Stethoscope, Lock, User, ArrowRight,
  ShieldCheck, Sparkles, CheckCircle2
} from 'lucide-react';
import { login as apiLogin } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState<string>('dr_sarah');
  const [password, setPassword] = useState<string>('ClinOS2026!');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiLogin(username, password);
      login(
        {
          id: username === 'admin' ? 1 : 7,
          username,
          email: `${username}@clinos.ai`,
          full_name: username === 'admin' ? 'System Administrator' : 'Dr. Sarah Chen, MD',
          role: username === 'admin' ? 'admin' : username === 'patient' ? 'patient' : 'doctor',
        },
        res.access_token || 'demo-token'
      );
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (role: 'doctor' | 'admin' | 'patient') => {
    if (role === 'doctor') {
      setUsername('dr_sarah');
      setPassword('ClinOS2026!');
    } else if (role === 'admin') {
      setUsername('admin');
      setPassword('Admin2026!');
    } else {
      setUsername('patient_james');
      setPassword('Patient2026!');
    }
  };

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400 mb-3 shadow-lg shadow-indigo-600/10">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Healthcare System</h1>
          <p className="text-xs text-slate-400 mt-1">
            Clinical Decision Support & Sovereign Tabular Intelligence
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 block mb-1 font-medium">Username</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="clinician_user"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-medium">Password</label>
              <Link to="/reset-password" className="text-[11px] text-indigo-400 hover:text-indigo-300">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Clinical Workstation'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Demo Roles */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <span className="text-[11px] text-slate-400 block text-center mb-2 font-medium">
            Quick Demo Login Profiles:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDemoRole('doctor')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-semibold transition-colors"
            >
              Attending MD
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('admin')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-semibold transition-colors"
            >
              Administrator
            </button>
            <button
              type="button"
              onClick={() => setDemoRole('patient')}
              className="py-1.5 px-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-semibold transition-colors"
            >
              Patient Portal
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Create Clinician Account
          </Link>
        </div>
      </div>
    </div>
  );
}
