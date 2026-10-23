/**
 * AI Healthcare System — IndexedDB / Local CRDT Chart Store
 */

export interface LocalCrdtChart {
  patientId: string;
  allergies: string[];
  medications: string[];
  vitals: Record<string, { value: number; timestamp_us: number; node_id: string }>;
  vectorClock: Record<string, number>;
  updatedAt: number;
}

export interface OfflineMutation {
  id: string;
  patientId: string;
  nodeId: string;
  operation: string;
  entity: string;
  timestampUs: number;
  synced: boolean;
}

const memoryCharts: Map<string, LocalCrdtChart> = new Map();
const memoryMutations: Map<string, OfflineMutation> = new Map();

export async function saveLocalCrdtChart(chart: LocalCrdtChart): Promise<void> {
  memoryCharts.set(chart.patientId, { ...chart });
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`crdt_chart_${chart.patientId}`, JSON.stringify(chart));
    } catch {
      // Ignore quota errors
    }
  }
}

export async function getLocalCrdtChart(patientId: string): Promise<LocalCrdtChart | null> {
  if (memoryCharts.has(patientId)) {
    return { ...memoryCharts.get(patientId)! };
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(`crdt_chart_${patientId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
  }
  return null;
}

export async function queueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  memoryMutations.set(mutation.id, { ...mutation });
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(`crdt_mutation_${mutation.id}`, JSON.stringify(mutation));
    } catch {
      // Ignore
    }
  }
}

export async function getUnsyncedMutations(): Promise<OfflineMutation[]> {
  const result: OfflineMutation[] = [];
  memoryMutations.forEach((m) => {
    if (!m.synced) result.push({ ...m });
  });

  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('crdt_mutation_')) {
        try {
          const m = JSON.parse(localStorage.getItem(key) || '{}');
          if (m && m.id && !m.synced && !result.some((x) => x.id === m.id)) {
            result.push(m);
          }
        } catch {
          // Ignore
        }
      }
    }
  }
  return result;
}

export async function clearSyncedMutation(id: string): Promise<void> {
  memoryMutations.delete(id);
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(`crdt_mutation_${id}`);
  }
}
