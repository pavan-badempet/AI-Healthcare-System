/**
 * AuditPanel – System Security & Access Audit Logs + Local IndexedDB Offline Audit Logger tab.
 */
import React, { useMemo, useState, useEffect } from "react";
import {
  Search,
  Calendar,
  Terminal,
  FileSpreadsheet,
  Database,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  PlusCircle,
} from "lucide-react";
import { getAdminAuditLogs, downloadAuditLogsCsv, type AuditLogEntry } from "@/lib/api";
import { useOfflineAuditStore } from "@/lib/offlineAuditLogger";
import { toast } from "@/lib/toast";

export default function AuditPanel() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [idbFilter, setIdbFilter] = useState<"ALL" | "UNSYNCED" | "SYNCED">("ALL");

  const {
    logs: idbLogs,
    unsyncedCount,
    syncingAudit,
    lastAuditSyncAt,
    loadOfflineAuditLogs,
    syncOfflineAuditLogsToServer,
    recordSampleOfflineAuditEvents,
  } = useOfflineAuditStore();

  const fetchServerAuditLogs = () => {
    setAuditLoading(true);
    getAdminAuditLogs()
      .then(setAuditLogs)
      .catch((err) => console.error("Failed to load audit logs", err))
      .finally(() => setAuditLoading(false));
  };

  useEffect(() => {
    fetchServerAuditLogs();
    void loadOfflineAuditLogs();
  }, [loadOfflineAuditLogs]);

  const handleSyncIndexedDBLogs = async () => {
    const count = await syncOfflineAuditLogsToServer();
    if (count > 0) {
      fetchServerAuditLogs();
    } else if (unsyncedCount === 0) {
      toast.info("All IndexedDB offline audit logs are already synced with the server.");
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await downloadAuditLogsCsv();
      toast.success("Sanitized audit log exported to CSV!");
    } catch {
      toast.error("Failed to export audit log CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredIdbLogs = useMemo(() => {
    return idbLogs.filter((entry) => {
      if (idbFilter === "UNSYNCED" && entry.synced) return false;
      if (idbFilter === "SYNCED" && !entry.synced) return false;
      return true;
    });
  }, [idbLogs, idbFilter]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const search = auditSearch.toLowerCase();
      return (
        log.action.toLowerCase().includes(search) ||
        (log.actor_user_id !== null && log.actor_user_id.toString().includes(search)) ||
        (log.target_user_id !== null && log.target_user_id.toString().includes(search)) ||
        (log.details && log.details.toLowerCase().includes(search))
      );
    });
  }, [auditLogs, auditSearch]);

  return (
    <div className="space-y-6">
      {/* Local IndexedDB Offline Clinical Audit Logger Card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
              <Database className="w-4 h-4" />
              <span>IndexedDB Offline Audit Logger • clinos_hipaa_audit_db</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Offline Clinical Data Access &amp; Modification Ledger
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks every offline patient chart read (<code className="text-indigo-300">DATA_ACCESS</code>) and clinical record edit (<code className="text-amber-300">DATA_MODIFICATION</code>) in browser IndexedDB with cryptographic FNV-1a checksums, syncing automatically once connectivity is restored.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => void recordSampleOfflineAuditEvents()}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>Record Offline Access &amp; Edit</span>
            </button>

            <button
              type="button"
              disabled={syncingAudit}
              onClick={handleSyncIndexedDBLogs}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingAudit ? "animate-spin" : ""}`} />
              <span>
                {syncingAudit
                  ? "Syncing IndexedDB..."
                  : `Sync to Server (${unsyncedCount} Pending)`}
              </span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: "ALL", label: `All IndexedDB Entries (${idbLogs.length})` },
                { id: "UNSYNCED", label: `Pending Sync (${unsyncedCount})` },
                {
                  id: "SYNCED",
                  label: `Synced (${idbLogs.length - unsyncedCount})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setIdbFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  idbFilter === tab.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {lastAuditSyncAt
                ? `Last Server Sync: ${new Date(lastAuditSyncAt).toLocaleTimeString()}`
                : "Auto-syncs on network reconnect"}
            </span>
          </div>
        </div>

        {/* IndexedDB Entries Table */}
        {filteredIdbLogs.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs text-slate-400">
            No offline clinical audit entries in this view. Click{" "}
            <strong className="text-slate-200">&ldquo;Record Offline Access &amp; Edit&rdquo;</strong>{" "}
            or use the app in Offline Mode to populate the IndexedDB ledger.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Event Type</th>
                  <th className="py-2.5 px-3">Action &amp; Resource</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Integrity Hash</th>
                  <th className="py-2.5 px-3 text-right">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredIdbLogs.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          entry.eventType === "DATA_MODIFICATION"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                        }`}
                      >
                        {entry.eventType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-200">{entry.action}</div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {entry.details}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {entry.targetPatientId ? `ID #${entry.targetPatientId}` : "System"}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 text-[10px]">
                      {entry.integrityChecksum}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {entry.synced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Synced
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                          <Clock className="w-3.5 h-3.5" /> Pending Offline
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Main Server Security & Access Audit Logs */}
      <div className="panel overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[rgba(15,15,17,0.5)]">
          <div>
            <h2 className="section-title">System Security &amp; Access Audit Logs</h2>
            <p className="text-[10px] text-[var(--text-dim)] font-mono uppercase mt-0.5">
              Sanitized HIPAA Compliance Access Logs (Includes Synced IndexedDB Offline Records)
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase py-1.5 px-3 rounded flex items-center gap-1.5 transition-all shrink-0 disabled:opacity-50"
            >
              <FileSpreadsheet size={13} />
              {isExporting ? "Exporting..." : "Export CSV"}
            </button>

            <div className="relative w-full sm:w-64">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
              />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="input-clinical pl-9 text-xs py-1.5 w-full"
              />
            </div>
          </div>
        </div>

        {auditLoading ? (
          <div className="p-12 text-center text-xs text-[var(--text-dim)] font-mono uppercase tracking-wide">
            <span className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin inline-block mr-2 align-middle" />
            Syncing Audit Trail Logs...
          </div>
        ) : filteredAuditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              className="w-full text-left border-collapse"
              aria-label="System security audit logs table"
            >
              <thead className="text-[10px] font-bold uppercase tracking-wider bg-[rgba(15,15,17,0.85)] text-[var(--text-dim)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-3 border-r border-[var(--border)]" scope="col">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 border-r border-[var(--border)]" scope="col">
                    Action Code
                  </th>
                  <th className="px-4 py-3 border-r border-[var(--border)]" scope="col">
                    Actor ID
                  </th>
                  <th className="px-4 py-3 border-r border-[var(--border)]" scope="col">
                    Target ID
                  </th>
                  <th className="px-4 py-3" scope="col">
                    PHI-Safe Details Payload
                  </th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono">
                {filteredAuditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border)] hover:bg-[rgba(255,255,255,0.015)] transition-colors"
                  >
                    <td className="px-4 py-3 border-r border-[var(--border)] text-[var(--text-secondary)] whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={11} className="text-[var(--text-dim)]" />
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : "--"}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-[var(--border)]">
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider border ${
                          log.action.includes("DELETE") ||
                          log.action.includes("FAIL") ||
                          log.action.includes("WARN")
                            ? "bg-[var(--danger-muted)] text-[var(--danger)] border-[var(--danger-border)]"
                            : log.action.includes("UPDATE") ||
                              log.action.includes("MODIFY") ||
                              log.action.includes("CREATE")
                            ? "bg-[var(--warning-muted)] text-[var(--warning)] border-[var(--warning-border)]"
                            : "bg-[var(--success-muted)] text-[var(--success)] border-[var(--success-border)]"
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-[var(--border)] text-[var(--text-primary)]">
                      {log.actor_user_id ? `#${log.actor_user_id}` : "SYSTEM"}
                    </td>
                    <td className="px-4 py-3 border-r border-[var(--border)] text-[var(--text-secondary)]">
                      {log.target_user_id ? `#${log.target_user_id}` : "N/A"}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 bg-white/[0.01] border border-white/[0.03] px-2 py-1 rounded max-w-lg overflow-x-auto">
                        <Terminal size={11} className="text-[var(--text-dim)] shrink-0" />
                        <code className="text-[10px] text-[var(--text-secondary)] whitespace-nowrap">
                          {log.details || "{}"}
                        </code>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-[var(--text-dim)] font-mono uppercase tracking-wide">
            No audit log entries matched search criteria
          </div>
        )}

        {/* HIPAA Safety Notice footer */}
        <div className="p-3 bg-white/[0.01] border-t border-[var(--border)] text-center">
          <p className="text-[10px] leading-relaxed text-gray-500 font-medium italic">
            Note: System audit logs are captured under HIPAA §164.312(b) and GDPR Article 30. Details are automatically sanitized inside the database layer to strip any clinical raw values, patient names, credentials, or PII.
          </p>
        </div>
      </div>
    </div>
  );
}
