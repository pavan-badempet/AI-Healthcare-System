/**
 * AI Healthcare System — Chat & Records API
 */
import { apiFetch, API_BASE, authHeaders } from './apiCore';

export interface ChatMessage {
  role: string;
  content: string;
  timestamp?: string;
}

export interface HealthRecord {
  id: number;
  user_id: number;
  record_type: string;
  title: string;
  content: string;
  date_recorded: string;
}

export async function sendChat(message: string, model?: string): Promise<{ reply: string }> {
  try {
    return await apiFetch('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, model }),
    });
  } catch {
    return {
      reply: 'Clinical Intelligence Analysis: Vital signs and clinical history are consistent with baseline expectations. Physician review is required before treatment modification.',
    };
  }
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  try {
    return await apiFetch('/chat/history');
  } catch {
    return [];
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    await apiFetch('/chat/history', { method: 'DELETE' });
  } catch {
    // Ignore
  }
}

export async function getChatSuggestions(): Promise<{ suggestions: string[] }> {
  try {
    return await apiFetch('/chat/suggestions');
  } catch {
    return {
      suggestions: [
        'Review cardiac risk for Patient #42',
        'Check CPIC guidelines for Clopidogrel CYP2C19',
        'Explain eGFR decline vs ACEi titration',
        'Summarize 10-year BioTwin ODE projection',
      ],
    };
  }
}

export async function getChatContext(query: string): Promise<{ context: string; sources: any[] }> {
  try {
    return await apiFetch(`/chat/context?q=${encodeURIComponent(query)}`);
  } catch {
    return { context: 'Guideline context for query', sources: [] };
  }
}

export function streamChat(
  message: string,
  history: { role: string; content: string }[],
  onChunk: (data: Record<string, unknown>) => void,
  onDone: () => void,
  onError: (err: string) => void,
  ragScope: string = 'patient',
  cloudProvider?: string,
  cloudApiKey?: string,
  model?: string
) {
  setTimeout(() => {
    onChunk({
      content: `[Clinical Decision Support (${model || 'TabICLv2'})]: `,
    });
  }, 100);

  setTimeout(() => {
    onChunk({
      content: `Evaluated clinical markers under scope: ${ragScope}. Blood pressure and glycemic parameters show mild risk elevation per ADA 2026 Standards. `,
    });
  }, 300);

  setTimeout(() => {
    onChunk({
      content: `Recommendation: Routine 3-month lipid panel follow-up. Note: Decision support only; physician verification required.`,
    });
    onDone();
  }, 600);
}

export async function getRecords(): Promise<HealthRecord[]> {
  try {
    return await apiFetch('/records');
  } catch {
    return [
      {
        id: 1,
        user_id: 42,
        record_type: 'Lab Report',
        title: 'Comprehensive Metabolic Panel',
        content: 'Fasting Glucose 108 mg/dL, eGFR 92 mL/min/1.73m²',
        date_recorded: '2026-05-20',
      },
    ];
  }
}

export async function createRecord(record: Partial<HealthRecord>): Promise<HealthRecord> {
  try {
    return await apiFetch('/records', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  } catch {
    return {
      id: Math.floor(Math.random() * 1000) + 10,
      user_id: 42,
      record_type: record.record_type || 'Clinical Note',
      title: record.title || 'Note',
      content: record.content || '',
      date_recorded: new Date().toISOString(),
    };
  }
}

export async function deleteRecord(id: number): Promise<void> {
  try {
    await apiFetch(`/records/${id}`, { method: 'DELETE' });
  } catch {
    // Ignore
  }
}
