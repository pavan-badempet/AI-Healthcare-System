import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  FlaskConical,
  CalendarClock,
  HeartPulse,
  CheckCircle2,
  ArrowUpRight,
  CheckCheck,
} from 'lucide-react';
import {
  useNotificationStore,
  dispatchClinicalNotification,
  acknowledgeClinicalNotification,
  acknowledgeAllClinicalNotifications,
} from '@/lib/notificationService';
import type { ToastCategory } from '@/lib/toast';
import { usePrivacyStore, maskFreeTextPii } from '@/lib/privacy';

export default function RealtimeNotificationPanel() {
  const notifications = useNotificationStore((s) => s.notifications);
  const { isPrivacyMode } = usePrivacyStore();
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ToastCategory>('ALL');
  const [dispatching, setDispatching] = useState<ToastCategory | null>(null);

  const unreadCount = notifications.filter((n) => !n.acknowledged).length;

  const visibleNotifications = notifications
    .filter((n) => (selectedCategory === 'ALL' ? true : n.category === selectedCategory))
    .slice(0, 3);

  const triggerRealtimeAlert = async (category: ToastCategory) => {
    setDispatching(category);
    try {
      if (category === 'CRITICAL_LAB') {
        await dispatchClinicalNotification({
          category: 'CRITICAL_LAB',
          severity: 'error',
          title: 'Urgent Lab Result Ready',
          message:
            'Marcus Vance (Room ICU-01): Elevated cardiac troponin & lactate levels detected. Doctor review needed.',
          patient_id: 43,
          patient_name: 'Marcus Vance',
          department: 'Emergency Lab',
          action_href: '/patients/43',
          action_label: 'View Patient',
        });
      } else if (category === 'PENDING_APPOINTMENT') {
        await dispatchClinicalNotification({
          category: 'PENDING_APPOINTMENT',
          severity: 'warning',
          title: 'Patient Waiting in Video Room',
          message:
            'Assigned Patient (#42) has joined the Telehealth waiting room for their scheduled checkup.',
          patient_id: 42,
          patient_name: 'Assigned Patient',
          department: 'Telehealth',
          action_href: '/telemedicine',
          action_label: 'Join Video Call',
        });
      } else {
        await dispatchClinicalNotification({
          category: 'PATIENT_STATUS',
          severity: 'info',
          title: 'Patient Vitals Improved',
          message:
            'Elena Morales (Cardiology): Blood pressure and oxygen levels are stable. Ready for regular ward transfer.',
          patient_id: 44,
          patient_name: 'Elena Morales',
          department: 'Cardiology',
          action_href: '/patients/44',
          action_label: 'View Patient',
        });
      }
    } finally {
      setDispatching(null);
    }
  };

  return (
    <section
      aria-label="Recent Staff Alerts"
      className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4"
    >
      {/* Header & Simple Test Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase tracking-wide">
            <BellRing aria-hidden="true" className="w-4 h-4" />
            <span>Live Staff Notifications</span>
            {unreadCount > 0 && (
              <span
                role="status"
                aria-live="polite"
                aria-label={`${unreadCount} unread clinical alerts`}
                className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px]"
              >
                {unreadCount} New
              </span>
            )}
          </div>
          <h2 className="text-lg font-bold text-white mt-0.5">Recent Clinical Alerts</h2>
        </div>

        {/* Simple Test Buttons */}
        <div
          role="group"
          aria-label="Simulate real-time clinical alerts"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            disabled={dispatching !== null}
            aria-label="Dispatch urgent critical lab result alert"
            onClick={() => triggerRealtimeAlert('CRITICAL_LAB')}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <FlaskConical aria-hidden="true" className="w-3.5 h-3.5 text-rose-400" />
            <span>+ Lab Alert</span>
          </button>

          <button
            type="button"
            disabled={dispatching !== null}
            aria-label="Dispatch pending telehealth appointment alert"
            onClick={() => triggerRealtimeAlert('PENDING_APPOINTMENT')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <CalendarClock aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
            <span>+ Appointment Alert</span>
          </button>

          <button
            type="button"
            disabled={dispatching !== null}
            aria-label="Dispatch patient status improvement alert"
            onClick={() => triggerRealtimeAlert('PATIENT_STATUS')}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <HeartPulse aria-hidden="true" className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Status Update</span>
          </button>
        </div>
      </div>

      {/* Simple Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter clinical alerts by category"
          className="flex items-center gap-1.5 flex-wrap"
        >
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'CRITICAL_LAB', label: 'Lab Results' },
              { id: 'PENDING_APPOINTMENT', label: 'Appointments' },
              { id: 'PATIENT_STATUS', label: 'Patient Updates' },
            ] as Array<{ id: 'ALL' | ToastCategory; label: string }>
          ).map((tab) => {
            const isSelected = selectedCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={`Filter alerts by ${tab.label}`}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            aria-label="Acknowledge and mark all clinical notifications as done"
            onClick={() => acknowledgeAllClinicalNotifications()}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <CheckCheck aria-hidden="true" className="w-3.5 h-3.5" />
            Mark All Done
          </button>
        )}
      </div>

      {/* Clean Alert List */}
      <div
        role="list"
        aria-label="Clinical alert notifications list"
        className="grid grid-cols-1 md:grid-cols-3 gap-3.5"
      >
        {visibleNotifications.map((item) => {
          const Icon =
            item.category === 'CRITICAL_LAB'
              ? FlaskConical
              : item.category === 'PENDING_APPOINTMENT'
              ? CalendarClock
              : HeartPulse;

          const categoryText =
            item.category === 'CRITICAL_LAB'
              ? 'Lab Result'
              : item.category === 'PENDING_APPOINTMENT'
              ? 'Appointment'
              : 'Status Update';

          const accentClass =
            item.category === 'CRITICAL_LAB'
              ? 'text-rose-400 border-rose-500/30 bg-rose-950/15'
              : item.category === 'PENDING_APPOINTMENT'
              ? 'text-amber-400 border-amber-500/30 bg-amber-950/15'
              : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/15';

          const displayTitle = maskFreeTextPii(item.title, isPrivacyMode);

          return (
            <div
              key={item.id}
              role="listitem"
              aria-label={`${categoryText}: ${displayTitle}`}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                item.acknowledged
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-65'
                  : accentClass
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Icon aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    {categoryText}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-2">
                  {displayTitle}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {maskFreeTextPii(item.message, isPrivacyMode)}
                </p>
              </div>

              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800/70 text-xs">
                {item.action_href ? (
                  <Link
                    to={item.action_href}
                    aria-label={`${item.action_label || 'Open'} for ${displayTitle}`}
                    onClick={() => acknowledgeClinicalNotification(item.id)}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <span>{item.action_label || 'Open'}</span>
                    <ArrowUpRight aria-hidden="true" className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span />
                )}

                {item.acknowledged ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-emerald-400" />
                    Done
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Mark alert "${displayTitle}" as done`}
                    onClick={() => acknowledgeClinicalNotification(item.id)}
                    className="text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
                  >
                    Mark Done
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
