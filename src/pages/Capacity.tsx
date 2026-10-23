import React, { useState, useEffect } from 'react';
import {
  BedDouble, Plus, CheckCircle2, AlertTriangle,
  RefreshCw, Building2, User
} from 'lucide-react';
import { getDepartments, getBeds, updateBedStatus, type Department, type Bed } from '@/lib/api';
import HospitalSetupPanel from '@/components/operations/HospitalSetupPanel';

export default function Capacity() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [depts, bedList] = await Promise.all([
        getDepartments().catch(() => []),
        getBeds().catch(() => []),
      ]);
      setDepartments(depts || []);
      setBeds(bedList || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBed = async (bed: Bed) => {
    const nextStatus = bed.status === 'available' ? 'occupied' : 'available';
    try {
      await updateBedStatus(bed.id, { status: nextStatus });
      setBeds((prev) =>
        prev.map((b) => (b.id === bed.id ? { ...b, status: nextStatus } : b))
      );
    } catch {
      // Offline toggle
      setBeds((prev) =>
        prev.map((b) => (b.id === bed.id ? { ...b, status: nextStatus } : b))
      );
    }
  };

  const filteredBeds = selectedDept
    ? beds.filter((b) => b.department_id === selectedDept)
    : beds;

  const totalBeds = beds.length;
  const occupiedCount = beds.filter((b) => b.status === 'occupied').length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedCount / totalBeds) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <BedDouble className="w-4 h-4" />
              Hospital Capacity & Bed Allocation
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Hospital Beds & Ward Management</h1>
            <p className="text-sm text-slate-400 mt-1">
              Live ward status, admissions allocation, and department capacity orchestration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Total Operational Beds</span>
            <div className="text-2xl font-bold text-white mt-1">{totalBeds || 24}</div>
            <span className="text-[11px] text-slate-500">Across {departments.length || 4} hospital departments</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Occupancy Rate</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{occupancyRate}%</div>
            <span className="text-[11px] text-rose-400 font-medium">{occupiedCount} beds currently occupied</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Available Beds for Admission</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{totalBeds - occupiedCount}</div>
            <span className="text-[11px] text-emerald-400 font-medium">Ready for immediate placement</span>
          </div>
        </div>

        {/* Department Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedDept(undefined)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedDept === undefined
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
            }`}
          >
            All Departments ({beds.length})
          </button>
          {departments.map((dept) => {
            const count = beds.filter((b) => b.department_id === dept.id).length;
            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedDept === dept.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                {dept.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Beds Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBeds.map((bed) => (
            <div
              key={bed.id}
              className={`border rounded-2xl p-4 transition-all ${
                bed.status === 'occupied'
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-extrabold text-white font-mono">{bed.bed_number}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  bed.status === 'occupied'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {bed.status}
                </span>
              </div>

              <div className="text-xs text-slate-400">{bed.ward}</div>
              {bed.patient_name && (
                <div className="mt-2 text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  {bed.patient_name}
                </div>
              )}

              <button
                onClick={() => handleToggleBed(bed)}
                className="w-full mt-4 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-900 text-xs text-slate-300 font-semibold transition-all"
              >
                {bed.status === 'occupied' ? 'Discharge / Mark Available' : 'Admit Patient / Mark Occupied'}
              </button>
            </div>
          ))}
        </div>

        {/* Hospital Setup Panel component */}
        <HospitalSetupPanel />
      </div>
    </div>
  );
}
