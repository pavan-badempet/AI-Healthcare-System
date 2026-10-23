import React, { useState } from 'react';
import {
  ShieldCheck,
  Users,
  FileText,
  KeyRound,
  BarChart2,
} from 'lucide-react';
import UsersPanel from '@/components/admin/UsersPanel';
import AccessControlPanel from '@/components/admin/AccessControlPanel';
import AuditPanel from '@/components/admin/AuditPanel';
import AnalyticsPanel from '@/components/admin/AnalyticsPanel';
import { useAuthStore } from '@/lib/auth';
import { getRoleClearanceInfo } from '@/lib/acl';

export default function Admin() {
  const { user } = useAuthStore();
  const clearance = getRoleClearanceInfo(user?.role);
  const [activeTab, setActiveTab] = useState<'acl' | 'users' | 'audit' | 'analytics'>('acl');

  return (
    <div className="min-h-screen bg-[#020204] text-slate-100 pb-20">
      {/* Header */}
      <div className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wide mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Administration & Security</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Access Control & Staff Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage staff roles, module permissions, and emergency access logs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-indigo-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Current Role: <strong>{clearance.title}</strong>
            </span>
          </div>
        </div>

        {/* Simple Tab Switcher */}
        <div className="max-w-7xl mx-auto mt-5 flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'acl', label: 'Role Permissions', icon: KeyRound },
            { id: 'users', label: 'Staff Directory', icon: Users },
            { id: 'audit', label: 'Activity Logs', icon: FileText },
            { id: 'analytics', label: 'Hospital Reports', icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        {activeTab === 'acl' && <AccessControlPanel />}
        {activeTab === 'users' && <UsersPanel />}
        {activeTab === 'audit' && <AuditPanel />}
        {activeTab === 'analytics' && <AnalyticsPanel />}
      </div>
    </div>
  );
}
