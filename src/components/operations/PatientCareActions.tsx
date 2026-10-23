import React, { useState } from 'react';
import {
  FileText, Plus, CheckCircle2, AlertCircle,
  Stethoscope, Send, BedDouble, ShieldCheck
} from 'lucide-react';
import { createClinicalOrder, createAdmission, dispatchCareEvent } from '@/lib/api';
import { toast } from '@/lib/toast';

interface PatientCareActionsProps {
  patientId: number;
}

export default function PatientCareActions({ patientId }: PatientCareActionsProps) {
  const [orderType, setOrderType] = useState('LAB');
  const [orderTitle, setOrderTitle] = useState('');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
  const [departmentId, setDepartmentId] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderTitle.trim()) {
      toast.error('Please specify an order description or test title.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createClinicalOrder({
        patient_id: patientId,
        encounter_id: 101,
        department_id: departmentId,
        order_type: orderType,
        title: orderTitle,
        priority,
      });

      await dispatchCareEvent({
        patient_id: patientId,
        event_type: 'CLINICAL_ORDER_CREATED',
        title: `Order: ${orderTitle}`,
        summary: `Placed ${priority.toUpperCase()} ${orderType} order for clinical processing.`,
        severity: priority === 'stat' ? 'critical' : priority === 'urgent' ? 'warning' : 'info',
      });

      toast.success('Clinical order submitted and dispatched to department.');
      setOrderTitle('');
    } catch (err) {
      toast.error('Failed to submit clinical order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Create Order Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
          <FileText className="w-4 h-4" />
          Clinical Requisitions
        </div>
        <h3 className="text-lg font-bold text-white">Place Clinical Order</h3>
        <p className="text-xs text-slate-400 mt-1">
          Issue orders for clinical diagnostics, pathology labs, or pharmacological review.
        </p>

        <form onSubmit={handleSubmitOrder} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Order Category</label>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="LAB">Pathology & Clinical Laboratory (CBC, CMP, Troponin)</option>
              <option value="IMAGING">Diagnostic Imaging (X-Ray, CT, Ultrasound)</option>
              <option value="PHARMACY">Pharmacotherapy & Infusion Order</option>
              <option value="CONSULT">Specialist Consult (Cardiology, Nephrology)</option>
              <option value="TELEMETRY">Telemetry Continuous Waveform Monitoring</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Requisition Title & Instructions</label>
            <input
              type="text"
              placeholder="e.g. Stat High-Sensitivity Troponin-I Panel"
              value={orderTitle}
              onChange={(e) => setOrderTitle(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="routine">Routine</option>
                <option value="urgent">Urgent (&lt; 2h)</option>
                <option value="stat">STAT Immediate (&lt; 15m)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Target Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>ICU / Critical Care</option>
                <option value={2}>Cardiology Ward</option>
                <option value={3}>Emergency Medicine</option>
                <option value={4}>General Inpatient</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Submitting Order...' : 'Dispatch Clinical Order'}
          </button>
        </form>
      </div>

      {/* Rapid Care Protocols & Bed Allocation */}
      <div className="space-y-6">
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-2">
            <BedDouble className="w-4 h-4" />
            Bed Allocation & Admission
          </div>
          <h3 className="text-lg font-bold text-white">Inpatient Admission Transfer</h3>
          <p className="text-xs text-slate-400 mt-1">
            Assign or transfer Patient #{patientId} to a monitored hospital ward bed.
          </p>

          <div className="mt-5 space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">ICU Monitored Telemetry Bed 04</div>
                <div className="text-[11px] text-slate-400">Cardiology & Hemodynamics Unit</div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Available
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Step-Down Unit Bed 12</div>
                <div className="text-[11px] text-slate-400">Intermediate Care Facility</div>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Reserved
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Guardrail Disclaimer */}
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white block mb-0.5">Dual-Signature Clinical Validation</span>
            Orders placed here are logged to the immutable ledger and verified by licensed clinical staff before execution.
          </div>
        </div>
      </div>
    </div>
  );
}
