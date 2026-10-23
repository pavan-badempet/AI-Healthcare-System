/**
 * RoleScopedWorkspaceCard — Simple, intuitive role-based workspace on the Dashboard.
 * Lets users switch roles in one click and shows only the tasks relevant to that role.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope, ShieldCheck, BedDouble, Pill, Activity,
  FileCheck, Video, Sparkles, Users, ArrowRight
} from 'lucide-react';
import { useSessionPermissions } from '@/lib/useSessionPermissions';
import type { AclRoleId } from '@/lib/acl';
import { toast } from '@/lib/toast';

const SIMPLE_ROLES: Array<{ id: AclRoleId; label: string; summary: string }> = [
  {
    id: 'doctor',
    label: 'Doctor',
    summary: 'Full access to patient charts, lab approvals, recovery trends, and AI risk tools.',
  },
  {
    id: 'nurse',
    label: 'Nurse',
    summary: 'Focused on bedside vitals, ward bed assignments, and patient status updates.',
  },
  {
    id: 'admin',
    label: 'Admin',
    summary: 'Manage staff roles, access permissions, bed capacity, and security logs.',
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    summary: 'Verify prescriptions, check medication safety, and review lab results.',
  },
  {
    id: 'patient',
    label: 'Patient',
    summary: 'View your personal health summary, upcoming video visits, and care assistant.',
  },
];

export default function RoleScopedWorkspaceCard() {
  const { role, switchRole } = useSessionPermissions();

  const currentRoleMeta =
    SIMPLE_ROLES.find((r) => r.id === role) ||
    (role === 'super_admin'
      ? {
          id: 'super_admin' as AclRoleId,
          label: 'Super Admin',
          summary: 'Full access to all clinical, operational, and administrative modules.',
        }
      : {
          id: 'auditor' as AclRoleId,
          label: 'Auditor',
          summary: 'Read-only access to security audit logs and compliance reports (no patient PHI).',
        });

  const handleSelectRole = (targetRole: AclRoleId, label: string) => {
    switchRole(targetRole);
    toast.info(`Switched to ${label} view`);
  };

  return (
    <section
      role="region"
      aria-label="Role-Scoped Clinical Workspace"
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5"
    >
      {/* Simple Role Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
              Current View: {currentRoleMeta.label}
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">{currentRoleMeta.summary}</p>
        </div>

        <div
          role="group"
          aria-label="Switch active clinical role view"
          className="flex flex-wrap items-center gap-1.5"
        >
          <span className="text-xs text-slate-400 mr-1">Switch Role:</span>
          {SIMPLE_ROLES.map((item) => {
            const active = role === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                aria-label={`Switch workspace view to ${item.label} role`}
                onClick={() => handleSelectRole(item.id, item.label)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Role-Specific Quick Tasks (3 Simple Cards) */}
      {(role === 'doctor' || role === 'super_admin') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/patients"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> Patient Charts
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Review Patients & Export PDF</div>
            <p className="text-xs text-slate-400 mt-1">
              Open patient quick-view cards, check vitals, and download medical reports.
            </p>
          </Link>

          <Link
            to="/predict"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Health AI Check
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Run Disease Risk Screening</div>
            <p className="text-xs text-slate-400 mt-1">
              Check heart, kidney, and diabetes risk scores from recent lab values.
            </p>
          </Link>

          <Link
            to="/telemedicine"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-rose-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4" /> Video Visits
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Start Telehealth Consult</div>
            <p className="text-xs text-slate-400 mt-1">
              Connect with waiting patients for scheduled video follow-ups.
            </p>
          </Link>
        </div>
      )}

      {role === 'nurse' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/patients"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-sky-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-sky-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Bedside Vitals
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Update Patient Vitals</div>
            <p className="text-xs text-slate-400 mt-1">
              Check blood pressure, heart rate, and oxygen levels for your ward.
            </p>
          </Link>

          <Link
            to="/capacity"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-4 h-4" /> Ward Beds
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Manage Bed Availability</div>
            <p className="text-xs text-slate-400 mt-1">
              View open beds, assign new admissions, and coordinate patient transfers.
            </p>
          </Link>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Pill className="w-4 h-4" /> Medication Rounds
              </span>
              <span>Due Soon</span>
            </div>
            <div className="text-sm font-bold text-white mt-2">3 Scheduled Doses Ready</div>
            <p className="text-xs text-slate-400 mt-1">
              Verified by pharmacy and ready for bedside administration.
            </p>
          </div>
        </div>
      )}

      {(role === 'admin' || role === 'auditor') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/admin"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Access Control
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Manage Roles & Permissions</div>
            <p className="text-xs text-slate-400 mt-1">
              Control which modules Doctors, Nurses, and Staff can view or edit.
            </p>
          </Link>

          <Link
            to="/capacity"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-cyan-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <BedDouble className="w-4 h-4" /> Hospital Capacity
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Bed Occupancy Overview</div>
            <p className="text-xs text-slate-400 mt-1">
              Monitor department occupancy rates and available ICU beds.
            </p>
          </Link>

          <Link
            to="/admin"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> Security Audit
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">View Activity Logs</div>
            <p className="text-xs text-slate-400 mt-1">
              Inspect recent sign-ins, permission changes, and emergency access logs.
            </p>
          </Link>
        </div>
      )}

      {role === 'pharmacist' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/patients"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Pill className="w-4 h-4" /> Prescriptions
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Review Medication Orders</div>
            <p className="text-xs text-slate-400 mt-1">
              Verify dosages and check patient charts for drug interactions.
            </p>
          </Link>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5">
              <FileCheck className="w-4 h-4" /> Safety Check
            </div>
            <div className="text-sm font-bold text-white mt-2">No Drug Conflicts Found</div>
            <p className="text-xs text-slate-400 mt-1">
              All active inpatient prescriptions passed automated interaction checks.
            </p>
          </div>

          <Link
            to="/predict"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Lab & Organ Trends
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Kidney & Liver Function</div>
            <p className="text-xs text-slate-400 mt-1">
              Check organ risk scores to guide safe medication dosing.
            </p>
          </Link>
        </div>
      )}

      {role === 'patient' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/telemedicine"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-teal-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-teal-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4" /> Upcoming Visit
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Join Video Appointment</div>
            <p className="text-xs text-slate-400 mt-1">
              Meet with Dr. Sarah Chen online for your scheduled checkup.
            </p>
          </Link>

          <Link
            to="/patients"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" /> My Health Record
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">View Summary & Download PDF</div>
            <p className="text-xs text-slate-400 mt-1">
              Check your recent vitals, lab results, and download a PDF copy.
            </p>
          </Link>

          <Link
            to="/chat"
            className="bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-4 transition-all group"
          >
            <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" /> Care Assistant
              </span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-2">Ask a Health Question</div>
            <p className="text-xs text-slate-400 mt-1">
              Get easy-to-understand answers about your care plan and medications.
            </p>
          </Link>
        </div>
      )}
    </section>
  );
}
