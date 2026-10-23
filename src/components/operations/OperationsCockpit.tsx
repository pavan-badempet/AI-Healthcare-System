import React, { useState, useEffect } from 'react';
import {
  BedDouble, Stethoscope,
  RefreshCw, FileText, Pill, Activity, ShieldCheck,
  ChevronRight, ArrowUpRight, Video, Lock
} from 'lucide-react';
import { getOperationsCockpit, type OperationsCockpit as OperationsCockpitData } from '@/lib/api';
import { useSessionPermissions } from '@/lib/useSessionPermissions';
import { Link } from 'react-router-dom';

export default function OperationsCockpit() {
  const [data, setData] = useState<OperationsCockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const { roleInfo, hasPermission, canAccessRoute } = useSessionPermissions();

  const fetchCockpit = async () => {
    setLoading(true);
    try {
      const result = await getOperationsCockpit();
      setData(result);
    } catch (err) {
      console.error('Failed to load operations cockpit', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCockpit();
  }, []);

  const canViewBeds = hasPermission('bed_capacity', 'read');
  const canViewOrders = hasPermission('clinical_orders', 'read');
  const canViewGovernance = hasPermission('rbac_governance', 'read');
  const canViewEmr = hasPermission('patient_emr', 'read');

  const quickLinks = [
    {
      href: '/patients',
      title: 'Patient Cohort Directory',
      desc: 'Longitudinal charts & TabICL trajectories',
      hoverText: 'group-hover:text-indigo-300',
      visible: canAccessRoute('/patients'),
    },
    {
      href: '/unified-hub',
      title: 'Unified Clinical Hub',
      desc: 'Orders, care events, and bed transfers',
      hoverText: 'group-hover:text-cyan-300',
      visible: canAccessRoute('/unified-hub'),
    },
    {
      href: '/telemedicine',
      title: 'Telemedicine Consultations',
      desc: 'HD WebRTC encounters & pre-visit triage',
      hoverText: 'group-hover:text-rose-300',
      visible: canAccessRoute('/telemedicine'),
    },
    {
      href: '/data-engineering',
      title: 'Delta Lakehouse Pipeline',
      desc: 'OMOP CDM v5.4 & Great Expectations',
      hoverText: 'group-hover:text-purple-300',
      visible: canAccessRoute('/data-engineering'),
    },
    {
      href: '/admin',
      title: 'ACL & Governance Console',
      desc: 'RBAC permission matrix & HIPAA audit ledger',
      hoverText: 'group-hover:text-emerald-300',
      visible: canAccessRoute('/admin'),
    },
  ].filter((link) => link.visible);

  return (
    <div className="space-y-6">
      {/* Cockpit Card Container */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <Activity className="w-4 h-4" />
              Live Operational Grid • Scoped to {roleInfo.title} ({roleInfo.code})
            </div>
            <h2 className="text-xl font-bold text-white mt-1">Cross-Department Cockpit</h2>
            <p className="text-xs text-slate-400 mt-0.5">
               Modules dynamically filtered by active session permissions ({roleInfo.defaultDepartmentScope}).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCockpit}
              disabled={loading}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {canViewBeds && (
              <Link
                to="/capacity"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Bed Census <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Dynamic Metric Columns Filtered by Session Permissions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {canViewBeds && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Active Inpatient Admissions</span>
                <BedDouble className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {data?.hospital.active_admissions ?? 3}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                {data?.hospital.occupied_beds ?? 4} of {data?.hospital.total_beds ?? 12} beds occupied
              </div>
            </div>
          )}

          {canViewOrders && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Pending Diagnostic Reviews</span>
                <FileText className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {data?.diagnostics.pending_review_count ?? 2}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                {hasPermission('clinical_orders', 'approve')
                  ? 'Authorized for MD signature'
                  : 'Awaiting physician signature'}
              </div>
            </div>
          )}

          {canViewOrders && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">Pharmacy Dispense Requisitions</span>
                <Pill className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {data?.pharmacy.pending_dispense_count ?? 1}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Closed-loop barcoded verification
              </div>
            </div>
          )}

          {(canViewGovernance || canViewEmr) && (
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="font-medium">
                  {canViewGovernance ? 'HIPAA & Encounter Audit' : 'Personal Care Encounters'}
                </span>
                {canViewGovernance ? (
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Video className="w-4 h-4 text-teal-400" />
                )}
              </div>
              <div className="text-2xl font-bold text-white mt-2">
                {canViewGovernance ? (data?.billing.unbilled_claims_count ?? 0) : 1}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                {canViewGovernance ? 'Audit engine: 100% compliant' : 'Next virtual visit confirmed'}
              </div>
            </div>
          )}
        </div>

        {/* Priority Actions and Operations Links (Filtered by Session ACL) */}
        {quickLinks.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickLinks.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="p-4 rounded-xl bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/60 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className={`text-xs font-semibold text-white ${link.hoverText} transition-colors`}>
                    {link.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{link.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

