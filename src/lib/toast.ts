/**
 * AI Healthcare System — Toast Notification Store & Service (Zustand)
 */
import { create } from 'zustand';

export type ToastCategory =
  | 'CRITICAL_LAB'
  | 'PENDING_APPOINTMENT'
  | 'PATIENT_STATUS'
  | 'SYSTEM';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
  category?: ToastCategory;
  patientId?: number;
  patientName?: string;
  department?: string;
  actionLabel?: string;
  actionHref?: string;
  duration?: number;
}

export interface ClinicalToastOptions {
  id?: string;
  patientId?: number;
  patientName?: string;
  department?: string;
  actionLabel?: string;
  actionHref?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'> & { id?: string }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (t) => {
    const id = t.id || Math.random().toString(36).substring(2, 9);
    const item: ToastItem = { ...t, id };

    set((state) => {
      // Idempotency guard: prevent duplicate toast IDs
      if (state.toasts.some((existing) => existing.id === id)) {
        return state;
      }
      return { toasts: [item, ...state.toasts].slice(0, 5) };
    });

    const duration = t.duration ?? 6000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((x) => x.id !== id) }));
      }, duration);
    }
    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((x) => x.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

export const toast = {
  show(
    type: ToastItem['type'],
    message: string,
    duration = 5000,
    extra?: Partial<Omit<ToastItem, 'type' | 'message' | 'duration'>>
  ) {
    return useToastStore.getState().addToast({
      type,
      message,
      duration,
      ...extra,
    });
  },
  success(message: string, duration?: number) {
    return toast.show('success', message, duration);
  },
  error(message: string, duration?: number) {
    return toast.show('error', message, duration);
  },
  info(message: string, duration?: number) {
    return toast.show('info', message, duration);
  },
  warning(message: string, duration?: number) {
    return toast.show('warning', message, duration);
  },
  criticalLab(title: string, message: string, options?: ClinicalToastOptions) {
    return useToastStore.getState().addToast({
      id: options?.id,
      type: 'error',
      category: 'CRITICAL_LAB',
      title,
      message,
      patientId: options?.patientId,
      patientName: options?.patientName,
      department: options?.department,
      actionLabel: options?.actionLabel || 'Open Patient Chart',
      actionHref:
        options?.actionHref ||
        (options?.patientId ? `/patients/${options.patientId}` : '/patients'),
      duration: options?.duration ?? 8000,
    });
  },
  appointment(title: string, message: string, options?: ClinicalToastOptions) {
    return useToastStore.getState().addToast({
      id: options?.id,
      type: 'warning',
      category: 'PENDING_APPOINTMENT',
      title,
      message,
      patientId: options?.patientId,
      patientName: options?.patientName,
      department: options?.department,
      actionLabel: options?.actionLabel || 'Open Telemedicine',
      actionHref: options?.actionHref || '/telemedicine',
      duration: options?.duration ?? 6500,
    });
  },
  patientStatus(title: string, message: string, options?: ClinicalToastOptions) {
    return useToastStore.getState().addToast({
      id: options?.id,
      type: 'info',
      category: 'PATIENT_STATUS',
      title,
      message,
      patientId: options?.patientId,
      patientName: options?.patientName,
      department: options?.department,
      actionLabel: options?.actionLabel || 'View Patient Chart',
      actionHref:
        options?.actionHref ||
        (options?.patientId ? `/patients/${options.patientId}` : '/patients'),
      duration: options?.duration ?? 6000,
    });
  },
  dismiss(id: string) {
    useToastStore.getState().removeToast(id);
  },
};
