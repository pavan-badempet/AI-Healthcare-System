import React, { useState } from 'react';
import { Server, X, Zap, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from '@/lib/toast';

interface InfrastructureFailoverModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onFailoverComplete?: (region: string) => void;
}

export function InfrastructureFailoverModal({
  isOpen = true,
  onClose,
  onFailoverComplete,
}: InfrastructureFailoverModalProps) {
  const [selectedTarget, setSelectedTarget] = useState('eu-west-secondary');
  const [isSimulating, setIsSimulating] = useState(false);
  const [step, setStep] = useState<'idle' | 'draining' | 'promoting' | 'complete'>('idle');

  if (!isOpen) return null;

  const handleStartFailover = () => {
    setIsSimulating(true);
    setStep('draining');

    setTimeout(() => {
      setStep('promoting');
      setTimeout(() => {
        setStep('complete');
        setIsSimulating(false);
        toast.success(`Active ingress shifted to ${selectedTarget}. 0 dropped transactions.`);
        if (onFailoverComplete) onFailoverComplete(selectedTarget);
      }, 1200);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              High Availability Chaos Engineering
            </div>
            <h3 className="text-xl font-bold text-white mt-1">Multi-Region Disaster Recovery Simulation</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {step === 'idle' && (
            <>
              <p className="text-xs text-slate-300 leading-relaxed">
                Triggering a simulated region evacuation will drain ingress traffic from <code className="text-rose-400">us-east-primary</code>, verify Raft consensus and Delta Lake snapshot isolation, and promote the replica cluster to primary status with zero downtime.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">Target Failover Replica</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget('eu-west-secondary')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedTarget === 'eu-west-secondary'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">EU-West (Frankfurt)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Sync Lag: 18 ms</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedTarget('ap-south-tertiary')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedTarget === 'ap-south-tertiary'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">AP-South (Mumbai)</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">Sync Lag: 34 ms</div>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Automated Clinical State Safety</span>
                  In-flight TabICLv2 model inferences and bedside telemetry buffers are retained via distributed CRDT log queues.
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartFailover}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/25 flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Initiate Failover
                </button>
              </div>
            </>
          )}

          {(step === 'draining' || step === 'promoting') && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 text-rose-500 animate-spin mx-auto" />
              <div>
                <h4 className="text-base font-bold text-white">
                  {step === 'draining'
                    ? 'Draining Ingress from us-east-primary...'
                    : `Promoting ${selectedTarget} to Authoritative Primary...`}
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Checking Delta Lake Commit Protocol v7 &bull; Shifting DNS Anycast Route
                </p>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Failover Completed Seamlessly</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Active cluster is now serving from <span className="font-mono text-emerald-400 font-bold">{selectedTarget}</span>. Total cutover duration: 1.84s (RTO Target: &lt; 5s).
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Dismiss & Return to Console
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default InfrastructureFailoverModal;
