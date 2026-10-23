import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  AlertTriangle,
  Check,
  UserCheck,
  Building2,
  ShieldAlert,
  Ban,
} from 'lucide-react';
import {
  useAclStore,
  ROLE_CLEARANCE_LEVELS,
  ACL_RESOURCES,
  type AclRoleId,
  type AclResourceId,
  type AclAction,
} from '@/lib/acl';
import { useAuthStore } from '@/lib/auth';
import { toast } from '@/lib/toast';

const ALL_ACTIONS: Array<{ id: AclAction; label: string; description: string }> = [
  { id: 'read', label: 'READ', description: 'View records & telemetry' },
  { id: 'write', label: 'WRITE', description: 'Create & modify entries' },
  { id: 'approve', label: 'APPROVE', description: 'Sign orders & verify results' },
  { id: 'export_pdf', label: 'EXPORT PDF', description: 'Download signed medical reports' },
  { id: 'break_glass', label: 'BREAK-GLASS', description: 'Emergency unsealing override' },
];

export default function AccessControlPanel() {
  const { user, switchRole } = useAuthStore();
  const {
    matrix,
    breakGlassGrants,
    fetchAclMatrix,
    togglePermission,
    triggerBreakGlass,
    revokeBreakGlass,
  } = useAclStore();

  const [selectedRole, setSelectedRole] = useState<AclRoleId>('doctor');
  const [bgPatientId, setBgPatientId] = useState<string>('43');
  const [bgResource, setBgResource] = useState<AclResourceId>('patient_emr');
  const [bgJustification, setBgJustification] = useState<string>(
    'Acute hemodynamic instability requiring cross-department chart unsealing.'
  );

  useEffect(() => {
    fetchAclMatrix();
  }, [fetchAclMatrix]);

  const activeRoleMeta =
    ROLE_CLEARANCE_LEVELS.find((r) => r.id === selectedRole) || ROLE_CLEARANCE_LEVELS[2];

  const handleBreakGlassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgJustification.trim()) return;
    await triggerBreakGlass({
      actor_username: user?.username || 'dr_sarah',
      actor_role: (user?.role as string) || 'doctor',
      target_resource: bgResource,
      patient_id: Number(bgPatientId) || 43,
      justification: bgJustification.trim(),
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. Multi-Level Security Clearance Hierarchy (L0 - L5) */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <KeyRound className="w-4 h-4" />
              <span>Multi-Level Security Clearance Hierarchy (L0 – L5)</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Role-Based & Attribute-Based Access Control (RBAC / ABAC)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any clearance tier below to inspect its ACL resource rules or switch your active
              session to test role enforcement across the platform.
            </p>
          </div>

          <div className="text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-300">
            Active Session:{' '}
            <strong className="text-emerald-400 uppercase">{user?.role || 'doctor'}</strong> ·{' '}
            <span>{user?.department_scope || 'Cardiology & ICU'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {ROLE_CLEARANCE_LEVELS.map((tier) => {
            const isSelected = selectedRole === tier.id;
            const isCurrentSession = user?.role === tier.id;
            return (
              <div
                key={tier.id}
                onClick={() => setSelectedRole(tier.id)}
                className={`rounded-2xl border p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-indigo-950/35 border-indigo-500/60 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-extrabold text-indigo-400">
                      {tier.code} · Level {tier.level}
                    </span>
                    {isCurrentSession && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        ACTIVE SESSION
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white">{tier.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {tier.description}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400 truncate flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                    {tier.defaultDepartmentScope}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      switchRole(tier.id);
                      setSelectedRole(tier.id);
                      toast.info(`Switched active session clearance to ${tier.title} (${tier.code})`);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 ${
                      isCurrentSession
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white'
                    }`}
                  >
                    {isCurrentSession ? 'In Use' : 'Assume Role'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Interactive Granular Resource × Action ACL Matrix */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Granular Access Control List (ACL) Policy Editor</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Permissions Matrix for {activeRoleMeta.title} ({activeRoleMeta.code})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any permission cell to grant or revoke granular access rights in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="acl-role-picker" className="text-xs text-slate-400 font-mono">
              Inspecting Role:
            </label>
            <select
              id="acl-role-picker"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as AclRoleId)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {ROLE_CLEARANCE_LEVELS.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-950 text-white">
                  {r.code} — {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/90 text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-3.5 px-4">Protected Clinical Resource</th>
                {ALL_ACTIONS.map((act) => (
                  <th key={act.id} className="py-3.5 px-4 text-center">
                    <div>{act.label}</div>
                    <div className="text-[9px] text-slate-500 font-normal normal-case mt-0.5">
                      {act.description}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ACL_RESOURCES.map((res) => {
                const grantedActions = matrix[selectedRole]?.[res.id] || [];
                return (
                  <tr key={res.id} className="hover:bg-slate-800/25 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-xs">{res.label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{res.description}</div>
                    </td>

                    {ALL_ACTIONS.map((act) => {
                      const isGranted = grantedActions.includes(act.id);
                      return (
                        <td key={act.id} className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => togglePermission(selectedRole, res.id, act.id)}
                            aria-label={`${isGranted ? 'Revoke' : 'Grant'} ${act.label} on ${
                              res.label
                            } for ${activeRoleMeta.title}`}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold border transition-all cursor-pointer ${
                              isGranted
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            {isGranted ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>ALLOW</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span>DENY</span>
                              </>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Emergency "Break-Glass" Privilege Elevation & Audit Log */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Break-Glass Trigger Form */}
        <form
          onSubmit={handleBreakGlassSubmit}
          className="lg:col-span-5 bg-slate-900/60 border border-rose-500/30 rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency Break-Glass Protocol</span>
          </div>
          <h3 className="text-lg font-bold text-white">
            Unseal Restricted Patient Chart / Resource
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Grants temporary 60-minute emergency L4/L5 override access during acute clinical life
            safety events. Every Break-Glass invocation is immutably recorded in the HIPAA security
            audit ledger.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Target Resource
              </label>
              <select
                value={bgResource}
                onChange={(e) => setBgResource(e.target.value as AclResourceId)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {ACL_RESOURCES.map((r) => (
                  <option key={r.id} value={r.id} className="bg-slate-950 text-white">
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono text-slate-400 block mb-1">
                Patient ID (Optional)
              </label>
              <input
                type="number"
                value={bgPatientId}
                onChange={(e) => setBgPatientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-mono text-slate-400 block mb-1">
              Mandatory Clinical Justification
            </label>
            <textarea
              rows={2}
              required
              value={bgJustification}
              onChange={(e) => setBgJustification(e.target.value)}
              placeholder="Document clinical emergency requiring immediate ACL override..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/20"
          >
            <Unlock className="w-4 h-4" />
            Invoke Break-Glass Emergency Override
          </button>
        </form>

        {/* Active & Historical Break-Glass Grants */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase text-amber-400 font-semibold">
                HIPAA Emergency Elevation Ledger
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Break-Glass Access Grants ({breakGlassGrants.filter((g) => g.active).length} Active)
              </h3>
            </div>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {breakGlassGrants.map((grant) => (
              <div
                key={grant.id}
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  grant.active
                    ? 'bg-rose-950/20 border-rose-500/35'
                    : 'bg-slate-950/50 border-slate-800 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono font-bold text-white">
                    @{grant.actor_username} ({grant.actor_role.toUpperCase()}) →{' '}
                    <span className="text-rose-300">{grant.target_resource}</span>
                    {grant.patient_id ? ` (Patient #${grant.patient_id})` : ''}
                  </div>

                  <span
                    className={`font-mono text-[10px] font-bold uppercase ${
                      grant.active ? 'text-rose-400' : 'text-slate-500'
                    }`}
                  >
                    {grant.active ? 'ACTIVE OVERRIDE' : 'REVOKED / EXPIRED'}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed">{grant.justification}</p>

                <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
                  <span>
                    Granted {new Date(grant.granted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Expires{' '}
                    {new Date(grant.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {grant.active && (
                    <button
                      type="button"
                      onClick={() => revokeBreakGlass(grant.id)}
                      className="inline-flex items-center gap-1 text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                    >
                      <Ban className="w-3 h-3" />
                      Revoke Override
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
