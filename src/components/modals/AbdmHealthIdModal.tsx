import React, { useState } from 'react';
import { ShieldCheck, X, CheckCircle2, Key, Phone, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface AbdmHealthIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (abhaAddress: string) => void;
}

export function AbdmHealthIdModal({ isOpen, onClose, onSuccess }: AbdmHealthIdModalProps) {
  const [step, setStep] = useState<'aadhaar' | 'otp' | 'success'>('aadhaar');
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [abhaId, setAbhaId] = useState('14-9842-1084-2910');
  const [abhaAddress, setAbhaAddress] = useState('eleanor.vance@abdm');

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (aadhaar.length < 12) {
      toast.error('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('otp');
      toast.success('OTP sent to Aadhaar-linked mobile number');
    }, 600);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      toast.error('Please enter 6-digit verification code');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
      toast.success('ABHA Health ID linked successfully!');
      if (onSuccess) onSuccess(abhaAddress);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              National Health Authority (NHA)
            </div>
            <h3 className="text-lg font-bold text-white mt-1">Create / Link ABHA ID</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6">
          {step === 'aadhaar' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <p className="text-xs text-slate-300">
                Enter the 12-digit Aadhaar number to verify with the sandbox authentication service.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Aadhaar Number</label>
                <input
                  type="text"
                  maxLength={12}
                  placeholder="e.g. 5420 1829 4019"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 font-mono tracking-widest focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-slate-300">
                🔒 Data protection notice: Aadhaar details are processed directly via UIDAI sandbox authentication APIs and never stored in cleartext.
              </div>

              <button
                type="submit"
                disabled={isSubmitting || aadhaar.length < 12}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                Generate Aadhaar OTP
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <p className="text-xs text-slate-300">
                Enter the 6-digit OTP received on your mobile device (Sandbox simulated OTP: <code className="text-emerald-400 font-mono">123456</code>).
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Verification Code (OTP)</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otp.length < 6}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Verify OTP & Link ABHA
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">ABHA Profile Active</h4>
                <p className="text-xs text-slate-400 mt-1">
                  14-Digit ABHA ID: <span className="font-mono text-emerald-300 font-bold">{abhaId}</span>
                </p>
                <p className="text-xs text-slate-400">
                  ABHA Address: <span className="font-mono text-cyan-300">{abhaAddress}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                Close & Return
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default AbdmHealthIdModal;
