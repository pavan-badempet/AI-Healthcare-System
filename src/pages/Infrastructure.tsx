import React, { useState } from 'react';
import {
  Server,
  Zap,
  Layers,
} from 'lucide-react';
import { InfrastructureFailoverModal } from '@/components/modals/InfrastructureFailoverModal';
import SystemResourcesD3Widget from '@/components/operations/SystemResourcesD3Widget';

export default function Infrastructure() {
  const [showFailoverModal, setShowFailoverModal] = useState<boolean>(false);
  const [activeRegion, setActiveRegion] = useState<string>('us-east-primary');

  return (
    <div
      role="region"
      aria-label="System Infrastructure and Real-Time Resources"
      className="min-h-screen bg-[#020204] text-slate-100 pb-20"
    >
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-xl px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
              <Server aria-hidden="true" className="w-4 h-4" />
              Multi-Cloud Mesh &amp; Low-Latency Edge Proxy
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              System Infrastructure &amp; Topology
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Rust Axum/Tokio PID 1 gateway, PyO3 FFI, Databricks Delta Lakehouse replication, and zero-downtime failover.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Simulate multi-region infrastructure failover"
              onClick={() => setShowFailoverModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Zap aria-hidden="true" className="w-3.5 h-3.5" /> Simulate Region Failover
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        {/* Architecture Grid */}
        <section
          aria-label="Infrastructure Topology KPIs"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Rust Edge Gateway</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">0.42 ms</div>
            <span className="text-[11px] text-emerald-400 font-medium">Axum + PyO3 Native FFI</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Databricks Delta Lakehouse</span>
            <div className="text-2xl font-bold text-white mt-1">OMOP v5.4</div>
            <span className="text-[11px] text-indigo-400 font-medium">Medallion Bronze/Silver/Gold</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Database Engine</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1 font-mono">Cloud SQL / SQLite</div>
            <span className="text-[11px] text-cyan-400 font-medium">Continuous WAL &amp; Immuto-Shield</span>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs text-slate-400">Active Routing Node</span>
            <div className="text-2xl font-bold text-white mt-1 capitalize">{activeRegion}</div>
            <span className="text-[11px] text-emerald-400 font-medium">Healthy &amp; Synced</span>
          </div>
        </section>

        {/* Real-Time D3 System Resources Widget */}
        <SystemResourcesD3Widget
          activeRegion={activeRegion}
          onRegionChange={setActiveRegion}
        />

        {/* Detailed Service Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Zap aria-hidden="true" className="w-4 h-4 text-amber-400" />
              Rust PID 1 Reverse Proxy &amp; Kernel Filters
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              High-throughput HTTP/WebSocket boundary proxy with zero-copy binary serialization.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Memory Allocator</span>
                <span className="font-mono text-emerald-400 font-bold">mimalloc v2.1.2</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Binary Serialization</span>
                <span className="font-mono text-cyan-400 font-bold">rkyv &amp; MessagePack (zero-copy)</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">In-Process Python Binding</span>
                <span className="font-mono text-indigo-400 font-bold">PyO3 0.22 (Direct Shared Memory)</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Layers aria-hidden="true" className="w-4 h-4 text-cyan-400" />
              Delta Lake Multi-Region Continuous WAL
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              WORM (Write Once, Read Many) immutability protection for electronic health records.
            </p>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Delta Transaction Protocol</span>
                <span className="font-mono text-white font-bold">Protocol v7 (Snapshot Isolation)</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">RPO / RTO Target</span>
                <span className="font-mono text-emerald-400 font-bold">RPO &lt; 1s &bull; RTO &lt; 5s</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-300">Differential Privacy Epsilon</span>
                <span className="font-mono text-purple-400 font-bold">&epsilon; = 1.25, &delta; = 10⁻⁵</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFailoverModal && (
        <InfrastructureFailoverModal
          onClose={() => setShowFailoverModal(false)}
        />
      )}
    </div>
  );
}
