/**
 * AI Healthcare System — Patient Care Events Helpers & Event Bus
 */
import type { CareEvent } from './apiHospital';

export const PATIENT_CARE_EVENTS_UPDATED = 'patient-care-events-updated';

export function notifyPatientCareEventsUpdated(detail?: { patientId?: number; [key: string]: any }): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(PATIENT_CARE_EVENTS_UPDATED, {
        detail,
      })
    );
  }
}

export function patientCareEventMatches(event: Event, patientId: number): boolean {
  if (!(event instanceof CustomEvent)) return true;
  const detail = event.detail;
  if (!detail || typeof detail.patientId === 'undefined') return true;
  return Number(detail.patientId) === Number(patientId);
}

export function formatEventSeverity(severity: string): {
  color: string;
  bg: string;
  border: string;
  badge: string;
} {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return {
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        badge: 'CRITICAL',
      };
    case 'warning':
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        badge: 'WARNING',
      };
    case 'info':
    default:
      return {
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        border: 'border-sky-500/30',
        badge: 'INFO',
      };
  }
}

export function sortCareEventsByDate(events: CareEvent[]): CareEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
