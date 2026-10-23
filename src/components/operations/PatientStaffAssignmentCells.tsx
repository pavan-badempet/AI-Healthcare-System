import React from 'react';
import {
  UserCheck,
  Clock,
  RefreshCw,
  Stethoscope,
} from 'lucide-react';
import {
  CLINICAL_STAFF_ROSTER,
  type PatientStaffAssignment,
  type StaffLoadSummary,
} from '@/lib/patientAssignmentEngine';

interface StaffShiftLoadBannerProps {
  summaries: StaffLoadSummary[];
  onRebalance: () => void;
  hasManualOverrides: boolean;
  onResetOverrides: () => void;
}

/**
 * Displays the real-time Clinical Staff Shift & Department Load distribution strip
 * above the Patients Registry table, with a 1-click Auto-Rebalance trigger.
 */
export function StaffShiftLoadBanner({
  summaries,
  onRebalance,
  hasManualOverrides,
  onResetOverrides,
}: StaffShiftLoadBannerProps) {
  return (
    <section
      aria-label="Automated Staff Assignment and Shift Load Balancing"
      className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3.5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wide">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Automated Staff Assignment Engine · Specialty, Load &amp; Shift Balancing</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Incoming and active patients are automatically distributed across on-shift clinicians based on specialty alignment, shift schedule, and real-time caseload headroom.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasManualOverrides && (
            <button
              type="button"
              aria-label="Reset manual staff assignment overrides to automated load balancing"
              onClick={onResetOverrides}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Reset Manual Overrides
            </button>
          )}
          <button
            type="button"
            aria-label="Auto-rebalance patient assignments across on-shift clinical staff"
            onClick={onRebalance}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
            <span>Auto-Rebalance Shift Load</span>
          </button>
        </div>
      </div>

      <div
        role="list"
        aria-label="On-shift clinician caseload utilization summary"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2.5"
      >
        {summaries.map((item) => {
          const loadBarColor =
            item.loadStatus === 'near_capacity'
              ? 'bg-rose-500'
              : item.loadStatus === 'moderate'
                ? 'bg-amber-500'
                : 'bg-emerald-500';

          const loadTextColor =
            item.loadStatus === 'near_capacity'
              ? 'text-rose-400'
              : item.loadStatus === 'moderate'
                ? 'text-amber-300'
                : 'text-emerald-400';

          return (
            <div
              key={item.staff.id}
              role="listitem"
              aria-label={`${item.staff.name}, ${item.staff.primarySpecialty}, ${item.staff.shiftType}, caseload ${item.totalCaseload} of ${item.staff.maxCapacity} (${item.utilizationPct}%)`}
              className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400">
                <span className="font-semibold text-indigo-300 truncate">
                  {item.staff.primarySpecialty}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  {item.staff.shiftWindow}
                </span>
              </div>

              <div className="text-xs font-bold text-white truncate">
                {item.staff.name}
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">{item.staff.shiftType}</span>
                <span className={`font-semibold ${loadTextColor}`}>
                  {item.totalCaseload}/{item.staff.maxCapacity} ({item.utilizationPct}%)
                </span>
              </div>

              <div
                role="progressbar"
                aria-label={`${item.staff.name} shift caseload utilization`}
                aria-valuenow={item.utilizationPct}
                aria-valuemin={0}
                aria-valuemax={100}
                className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"
              >
                <div
                  className={`h-full transition-all ${loadBarColor}`}
                  style={{ width: `${item.utilizationPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface PatientAssignedStaffCellProps {
  assignment?: PatientStaffAssignment;
  patientId: number;
  onOverrideStaff: (patientId: number, staffId: string) => void;
}

/**
 * Renders the "Assigned Staff (Load · Specialty · Shift)" column cell inside the Patients Registry table.
 */
export function PatientAssignedStaffCell({
  assignment,
  patientId,
  onOverrideStaff,
}: PatientAssignedStaffCellProps) {
  if (!assignment) {
    return <span className="text-slate-500 font-mono text-xs">Unassigned</span>;
  }

  const { staff, assignedCount, maxCapacity, utilizationPct, loadStatus, assignmentScore } =
    assignment;

  const loadColor =
    loadStatus === 'near_capacity'
      ? 'text-rose-400'
      : loadStatus === 'moderate'
        ? 'text-amber-300'
        : 'text-emerald-400';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="space-y-1 min-w-[220px]"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
          <Stethoscope className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{staff.name}</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">
          Match {assignmentScore}%
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
        <span className="font-semibold text-indigo-300">{staff.primarySpecialty}</span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className="inline-flex items-center gap-1 text-slate-400 font-mono">
          <Clock className="w-3 h-3 text-slate-500" />
          {staff.shiftType} ({staff.shiftWindow})
        </span>
        <span aria-hidden="true" className="text-slate-600">
          ·
        </span>
        <span className={`font-mono font-semibold ${loadColor}`}>
          Load {assignedCount}/{maxCapacity} ({utilizationPct}%)
        </span>
      </div>

      <div className="pt-0.5 flex items-center gap-1.5">
        <label
          htmlFor={`assign-staff-select-${patientId}`}
          className="text-[10px] font-mono text-slate-500"
        >
          Route:
        </label>
        <select
          id={`assign-staff-select-${patientId}`}
          aria-label={`Reassign staff for patient #${patientId}`}
          value={staff.id}
          onChange={(e) => onOverrideStaff(patientId, e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {CLINICAL_STAFF_ROSTER.map((member) => (
            <option key={member.id} value={member.id} className="bg-slate-950 text-white">
              {member.name} ({member.primarySpecialty} · {member.shiftWindow})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
