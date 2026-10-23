import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  FlaskConical,
  CalendarClock,
  HeartPulse,
  CheckCheck,
  ArrowUpRight,
  Check,
  Radio,
} from 'lucide-react';
import {
  useNotificationStore,
  subscribeToNotificationStream,
  acknowledgeClinicalNotification,
  acknowledgeAllClinicalNotifications,
  dispatchClinicalNotification,
} from '@/lib/notificationService';
import type { ToastCategory } from '@/lib/toast';

type FilterTab = 'ALL' | 'CRITICAL_LAB' | 'PENDING_APPOINTMENT' | 'PATIENT_STATUS';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const notifications = useNotificationStore((s) => s.notifications);
  const connected = useNotificationStore((s) => s.connected);

  useEffect(() => {
    const unsubscribe = subscribeToNotificationStream();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.acknowledged).length;

  const filtered = notifications.filter((n) =>
    activeTab === 'ALL' ? true : n.category === activeTab
  );

  const handleQuickBroadcast = async (category: ToastCategory) => {
    if (category === 'CRITICAL_LAB') {
      await dispatchClinicalNotification({
        category: 'CRITICAL_LAB',
        severity: 'error',
        title: 'STAT Potassium Critical High (6.1 mEq/L)',
        message:
          'Marcus Vance (ID #43 • ER-01): Serum K+ 6.1 mEq/L verified on repeat metabolic panel. Order 12-lead ECG and hyperkalemia protocol.',
        patient_id: 43,
        patient_name: 'Marcus Vance',
        department: 'Clinical Pathology Lab',
        action_href: '/patients/43',
        action_label: 'Open Patient Chart',
      });
    } else if (category === 'PENDING_APPOINTMENT') {
      await dispatchClinicalNotification({
        category: 'PENDING_APPOINTMENT',
        severity: 'warning',
        title: 'Patient Checked Into Telemedicine Waiting Room',
        message:
          'Assigned Patient (ID #42 • Cardiology): Connected to WebRTC video bridge for post-intervention follow-up.',
        patient_id: 42,
        patient_name: 'Assigned Patient',
        department: 'Telehealth Clinic',
        action_href: '/telemedicine',
        action_label: 'Join Video Session',
      });
    } else {
      await dispatchClinicalNotification({
        category: 'PATIENT_STATUS',
        severity: 'info',
        title: 'Patient Status Escalated: Continuous Telemetry',
        message:
          'David Kim (ID #45 • Emergency): Transferred from Triage to Acute Observation Bay with continuous SpO2 & ECG monitoring.',
        patient_id: 45,
        patient_name: 'David Kim',
        department: 'Emergency & Trauma',
        action_href: '/patients/45',
        action_label: 'View Patient Chart',
      });
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Clinical notifications (${unreadCount} unread)`}
        title="Clinical Notifications"
        className="relative p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)] transition-all cursor-pointer flex items-center justify-center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-extrabold flex items-center justify-center shadow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] sm:w-[420px] rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio
                className={`w-3.5 h-3.5 ${
                  connected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'
                }`}
              />
              <span className="text-xs font-extrabold text-[var(--text-primary)]">
                Real-Time Clinical Alerts
              </span>
              <span className="text-[11px] font-mono text-[var(--text-dim)]">
                ({unreadCount} unread)
              </span>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => acknowledgeAllClinicalNotifications()}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-primary)] flex items-center gap-1 overflow-x-auto">
            {(
              [
                { id: 'ALL', label: 'All' },
                { id: 'CRITICAL_LAB', label: 'Critical Labs' },
                { id: 'PENDING_APPOINTMENT', label: 'Appointments' },
                { id: 'PATIENT_STATUS', label: 'Patient Status' },
              ] as Array<{ id: FilterTab; label: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notification Items List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border)]">
            {filtered.length === 0 ? (
              <div className="py-10 px-4 text-center text-xs text-[var(--text-dim)]">
                No notifications in this category.
              </div>
            ) : (
              filtered.map((item) => {
                const Icon =
                  item.category === 'CRITICAL_LAB'
                    ? FlaskConical
                    : item.category === 'PENDING_APPOINTMENT'
                    ? CalendarClock
                    : HeartPulse;

                const accentColor =
                  item.category === 'CRITICAL_LAB'
                    ? 'text-rose-400'
                    : item.category === 'PENDING_APPOINTMENT'
                    ? 'text-amber-400'
                    : 'text-emerald-400';

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 transition-colors ${
                      item.acknowledged ? 'opacity-65 bg-transparent' : 'bg-[var(--bg-card)]/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 ${accentColor} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[10px] font-mono uppercase font-bold ${accentColor}`}>
                            {item.category.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-dim)]">
                            {new Date(item.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                          {item.message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          {item.action_href ? (
                            <Link
                              to={item.action_href}
                              onClick={() => {
                                acknowledgeClinicalNotification(item.id);
                                setOpen(false);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--accent)] hover:underline"
                            >
                              <span>{item.action_label || 'View Record'}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span />
                          )}

                          {!item.acknowledged && (
                            <button
                              type="button"
                              onClick={() => acknowledgeClinicalNotification(item.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Live Broadcast Trigger Bar */}
          <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-card)] space-y-2">
            <div className="text-[10px] font-mono uppercase text-[var(--text-dim)]">
              Dispatch Live Alert Toast
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickBroadcast('CRITICAL_LAB')}
                className="px-2 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-[10px] font-bold transition-colors cursor-pointer"
              >
                + Critical Lab
              </button>
              <button
                type="button"
                onClick={() => handleQuickBroadcast('PENDING_APPOINTMENT')}
                className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-bold transition-colors cursor-pointer"
              >
                + Appointment
              </button>
              <button
                type="button"
                onClick={() => handleQuickBroadcast('PATIENT_STATUS')}
                className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-bold transition-colors cursor-pointer"
              >
                + Status Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
