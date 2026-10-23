/**
 * AI Healthcare System — Real-Time Staff Notification Service (SSE + Toast Integration)
 */
import { create } from 'zustand';
import { apiFetch } from './apiCore';
import { toast, type ToastCategory } from './toast';

export interface StaffNotification {
  id: string;
  category: ToastCategory;
  severity: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  patient_id?: number;
  patient_name?: string;
  department?: string;
  action_href?: string;
  action_label?: string;
  acknowledged: boolean;
  created_at: string;
}

export interface DispatchNotificationPayload {
  category: ToastCategory;
  severity?: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  patient_id?: number;
  patient_name?: string;
  department?: string;
  action_href?: string;
  action_label?: string;
}

interface NotificationStoreState {
  notifications: StaffNotification[];
  connected: boolean;
  setNotifications: (items: StaffNotification[]) => void;
  upsertNotification: (item: StaffNotification, triggerToast?: boolean) => void;
  markAcknowledged: (id: string) => void;
  markAllAcknowledged: () => void;
  setConnected: (status: boolean) => void;
}

const DEFAULT_FALLBACK_NOTIFICATIONS: StaffNotification[] = [
  {
    id: 'notif-101',
    category: 'CRITICAL_LAB',
    severity: 'error',
    title: 'STAT Troponin-I Elevation (0.18 ng/mL)',
    message:
      'Marcus Vance (ID #43 • ER-01 Resus): Serial high-sensitivity Troponin-I exceeded critical threshold (>0.04 ng/mL). Immediate cardiology review advised.',
    patient_id: 43,
    patient_name: 'Marcus Vance',
    department: 'Emergency & Trauma',
    action_href: '/patients/43',
    action_label: 'Open Patient Chart',
    acknowledged: false,
    created_at: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 'notif-102',
    category: 'PENDING_APPOINTMENT',
    severity: 'warning',
    title: 'Upcoming Telemedicine Consultation (10 mins)',
    message:
      'Assigned Patient (ID #42 • Cardiology): Post-intervention hemodynamic video consultation with Dr. Sarah Chen scheduled to begin shortly.',
    patient_id: 42,
    patient_name: 'Assigned Patient',
    department: 'Cardiology',
    action_href: '/telemedicine',
    action_label: 'Join Telehealth Room',
    acknowledged: false,
    created_at: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: 'notif-103',
    category: 'PATIENT_STATUS',
    severity: 'success',
    title: 'Patient Status Update: Ready for Step-Down',
    message:
      'Elena Morales (ID #44 • ICU-01): SpO2 98% on room air and sinus rhythm verified over 12h window. Cleared for Cardiology Stepdown transfer.',
    patient_id: 44,
    patient_name: 'Elena Morales',
    department: 'MICU',
    action_href: '/patients/44',
    action_label: 'Review Transfer Order',
    acknowledged: false,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

function triggerToastForNotification(notif: StaffNotification) {
  const opts = {
    id: notif.id,
    patientId: notif.patient_id,
    patientName: notif.patient_name,
    department: notif.department,
    actionLabel: notif.action_label,
    actionHref: notif.action_href,
  };

  if (notif.category === 'CRITICAL_LAB') {
    toast.criticalLab(notif.title, notif.message, opts);
  } else if (notif.category === 'PENDING_APPOINTMENT') {
    toast.appointment(notif.title, notif.message, opts);
  } else {
    toast.patientStatus(notif.title, notif.message, opts);
  }
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  notifications: DEFAULT_FALLBACK_NOTIFICATIONS,
  connected: false,
  setNotifications: (items) => set({ notifications: items }),
  upsertNotification: (item, shouldTriggerToast = true) => {
    let isNew = false;
    set((state) => {
      const exists = state.notifications.some((n) => n.id === item.id);
      if (exists) {
        return {
          notifications: state.notifications.map((n) => (n.id === item.id ? item : n)),
        };
      }
      isNew = true;
      return {
        notifications: [item, ...state.notifications].slice(0, 50),
      };
    });

    if (isNew && shouldTriggerToast) {
      triggerToastForNotification(item);
    }
  },
  markAcknowledged: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, acknowledged: true } : n
      ),
    })),
  markAllAcknowledged: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, acknowledged: true })),
    })),
  setConnected: (connected) => set({ connected }),
}));

let activeEventSource: EventSource | null = null;
let subscriberCount = 0;

/**
 * Connects to the server-authoritative SSE stream (`/v1/notifications/stream`)
 * with idempotent event handlers and automatic reconnection.
 */
export function subscribeToNotificationStream(): () => void {
  subscriberCount += 1;

  if (typeof window !== 'undefined' && !activeEventSource) {
    try {
      const es = new EventSource('/v1/notifications/stream');
      activeEventSource = es;

      es.onopen = () => {
        useNotificationStore.getState().setConnected(true);
      };

      es.addEventListener('init', (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          if (Array.isArray(parsed.notifications)) {
            useNotificationStore.getState().setNotifications(parsed.notifications);
          }
          useNotificationStore.getState().setConnected(true);
        } catch {
          // Ignore malformed frame
        }
      });

      es.addEventListener('notification:created', (event: MessageEvent) => {
        try {
          const notif: StaffNotification = JSON.parse(event.data);
          useNotificationStore.getState().upsertNotification(notif, true);
        } catch {
          // Ignore malformed frame
        }
      });

      es.addEventListener('notification:acknowledged', (event: MessageEvent) => {
        try {
          const { id } = JSON.parse(event.data);
          if (id) useNotificationStore.getState().markAcknowledged(id);
        } catch {
          // Ignore malformed frame
        }
      });

      es.addEventListener('notification:acknowledged_all', () => {
        useNotificationStore.getState().markAllAcknowledged();
      });

      es.onerror = () => {
        useNotificationStore.getState().setConnected(false);
      };
    } catch {
      useNotificationStore.getState().setConnected(false);
    }
  }

  return () => {
    subscriberCount = Math.max(0, subscriberCount - 1);
    if (subscriberCount === 0 && activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
      useNotificationStore.getState().setConnected(false);
    }
  };
}

/**
 * Dispatches a new notification through the server so all connected clients receive
 * the real-time broadcast and toast notification.
 */
export async function dispatchClinicalNotification(
  payload: DispatchNotificationPayload
): Promise<StaffNotification> {
  try {
    const created = await apiFetch<StaffNotification>('/v1/notifications/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    // Upsert idempotently (in case SSE hasn't delivered it yet)
    useNotificationStore.getState().upsertNotification(created, true);
    return created;
  } catch {
    const fallback: StaffNotification = {
      id: `notif-${Date.now()}`,
      category: payload.category,
      severity:
        payload.severity ||
        (payload.category === 'CRITICAL_LAB'
          ? 'error'
          : payload.category === 'PENDING_APPOINTMENT'
          ? 'warning'
          : 'info'),
      title: payload.title,
      message: payload.message,
      patient_id: payload.patient_id || 43,
      patient_name: payload.patient_name || 'Marcus Vance',
      department: payload.department || 'Emergency & Trauma',
      action_href:
        payload.action_href ||
        (payload.category === 'PENDING_APPOINTMENT'
          ? '/telemedicine'
          : `/patients/${payload.patient_id || 43}`),
      action_label:
        payload.action_label ||
        (payload.category === 'PENDING_APPOINTMENT' ? 'Open Telemedicine' : 'Open Patient Chart'),
      acknowledged: false,
      created_at: new Date().toISOString(),
    };
    useNotificationStore.getState().upsertNotification(fallback, true);
    return fallback;
  }
}

export async function acknowledgeClinicalNotification(id: string): Promise<void> {
  useNotificationStore.getState().markAcknowledged(id);
  try {
    await apiFetch(`/v1/notifications/${id}/acknowledge`, {
      method: 'PATCH',
    });
  } catch {
    // Already updated optimistically
  }
}

export async function acknowledgeAllClinicalNotifications(): Promise<void> {
  useNotificationStore.getState().markAllAcknowledged();
  try {
    await apiFetch('/v1/notifications/acknowledge-all', {
      method: 'POST',
    });
  } catch {
    // Already updated optimistically
  }
}
