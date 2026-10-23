import React from 'react';
import { Link } from 'react-router-dom';
import { useToastStore } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  FlaskConical,
  CalendarClock,
  HeartPulse,
  ArrowUpRight,
} from 'lucide-react';

export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon =
            t.category === 'CRITICAL_LAB'
              ? FlaskConical
              : t.category === 'PENDING_APPOINTMENT'
              ? CalendarClock
              : t.category === 'PATIENT_STATUS'
              ? HeartPulse
              : t.type === 'success'
              ? CheckCircle2
              : t.type === 'error'
              ? AlertCircle
              : t.type === 'warning'
              ? AlertTriangle
              : Info;

          const categoryLabel =
            t.category === 'CRITICAL_LAB'
              ? 'Critical Lab Alert'
              : t.category === 'PENDING_APPOINTMENT'
              ? 'Pending Appointment'
              : t.category === 'PATIENT_STATUS'
              ? 'Patient Status Update'
              : null;

          const theme =
            t.type === 'success'
              ? {
                  border: 'border-emerald-500/40',
                  bg: 'bg-slate-950/95',
                  accent: 'text-emerald-400',
                  iconBg: 'bg-emerald-500/15 border-emerald-500/30',
                }
              : t.type === 'error'
              ? {
                  border: 'border-rose-500/50',
                  bg: 'bg-slate-950/95',
                  accent: 'text-rose-400',
                  iconBg: 'bg-rose-500/15 border-rose-500/30',
                }
              : t.type === 'warning'
              ? {
                  border: 'border-amber-500/45',
                  bg: 'bg-slate-950/95',
                  accent: 'text-amber-400',
                  iconBg: 'bg-amber-500/15 border-amber-500/30',
                }
              : {
                  border: 'border-indigo-500/40',
                  bg: 'bg-slate-950/95',
                  accent: 'text-indigo-400',
                  iconBg: 'bg-indigo-500/15 border-indigo-500/30',
                };

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.75)]`}
            >
              <div
                className={`w-9 h-9 rounded-xl border ${theme.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <Icon className={theme.accent} size={17} />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                {categoryLabel && (
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
                    <span className={`font-bold ${theme.accent}`}>{categoryLabel}</span>
                    {t.department && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-slate-400">{t.department}</span>
                      </>
                    )}
                  </div>
                )}

                {t.title && (
                  <p className="text-xs font-extrabold text-white leading-snug">
                    {t.title}
                  </p>
                )}

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {t.message}
                </p>

                {t.actionHref && (
                  <div className="pt-1.5">
                    <Link
                      to={t.actionHref}
                      onClick={() => removeToast(t.id)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold ${theme.accent} hover:underline`}
                    >
                      <span>{t.actionLabel || 'Open Record'}</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(t.id)}
                className="text-slate-500 hover:text-slate-200 transition-colors shrink-0 cursor-pointer p-1"
              >
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
