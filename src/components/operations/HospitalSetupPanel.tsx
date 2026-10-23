import React, { useState } from 'react';
import { Building2, BedDouble, Plus, CheckCircle2, ShieldCheck } from 'lucide-react';
import { createDepartment, createBed } from '@/lib/api';
import { toast } from '@/lib/toast';

export default function HospitalSetupPanel() {
  const [deptName, setDeptName] = useState('');
  const [deptType, setDeptType] = useState('WARD');
  const [location, setLocation] = useState('');
  const [isSubmittingDept, setIsSubmittingDept] = useState(false);

  const [bedDeptId, setBedDeptId] = useState(1);
  const [bedNumber, setBedNumber] = useState('');
  const [ward, setWard] = useState('General Ward');
  const [isSubmittingBed, setIsSubmittingBed] = useState(false);

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) {
      toast.error('Please enter department name');
      return;
    }

    setIsSubmittingDept(true);
    try {
      await createDepartment({
        name: deptName,
        department_type: deptType,
        location: location || 'Building A, Floor 2',
      });
      toast.success(`Department '${deptName}' created successfully.`);
      setDeptName('');
      setLocation('');
    } catch (err) {
      toast.error('Failed to create department');
    } finally {
      setIsSubmittingDept(false);
    }
  };

  const handleCreateBed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bedNumber.trim()) {
      toast.error('Please enter bed identifier');
      return;
    }

    setIsSubmittingBed(true);
    try {
      await createBed({
        department_id: bedDeptId,
        bed_number: bedNumber,
        ward,
      });
      toast.success(`Bed '${bedNumber}' provisioned successfully.`);
      setBedNumber('');
    } catch (err) {
      toast.error('Failed to provision bed');
    } finally {
      setIsSubmittingBed(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl mt-8">
      <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
        <Building2 className="w-4 h-4" />
        Infrastructure Provisioning
      </div>
      <h3 className="text-xl font-bold text-white">Facility Capacity Configuration</h3>
      <p className="text-xs text-slate-400 mt-1">
        Provision clinical hospital departments and register new ward or telemetry beds.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Department Setup */}
        <form onSubmit={handleCreateDept} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Add Clinical Department
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Department Name</label>
            <input
              type="text"
              placeholder="e.g. Neurology & Stroke Unit"
              value={deptName}
              onChange={(e) => setDeptName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Type</label>
              <select
                value={deptType}
                onChange={(e) => setDeptType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="WARD">Inpatient Ward</option>
                <option value="ICU">Intensive Care Unit</option>
                <option value="OPD">Outpatient Clinic</option>
                <option value="EMERGENCY">Emergency Dept</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Location / Wing</label>
              <input
                type="text"
                placeholder="e.g. Tower 3, 4th Fl"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingDept}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {isSubmittingDept ? 'Creating...' : 'Register Department'}
          </button>
        </form>

        {/* Bed Setup */}
        <form onSubmit={handleCreateBed} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <BedDouble className="w-4 h-4 text-cyan-400" />
            Provision Hospital Bed
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
            <select
              value={bedDeptId}
              onChange={(e) => setBedDeptId(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value={1}>ICU / Critical Care</option>
              <option value={2}>Cardiology Ward</option>
              <option value={3}>Emergency Medicine</option>
              <option value={4}>General Inpatient</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Bed Number</label>
              <input
                type="text"
                placeholder="e.g. ICU-05"
                value={bedNumber}
                onChange={(e) => setBedNumber(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Ward Name</label>
              <input
                type="text"
                placeholder="e.g. North Monitored Wing"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingBed}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-cyan-600/20 flex items-center justify-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            {isSubmittingBed ? 'Provisioning...' : 'Provision Bed'}
          </button>
        </form>
      </div>
    </div>
  );
}
