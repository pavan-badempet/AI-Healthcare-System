/**
 * AI Healthcare System — Error Definitions & Helpers
 */

export class ApiConnectionError extends Error {
  public endpoint: string;

  constructor(endpoint: string, message = 'Connection failed') {
    super(`Failed to connect to ${endpoint}: ${message}`);
    this.name = 'ApiConnectionError';
    this.endpoint = endpoint;
    Object.setPrototypeOf(this, ApiConnectionError.prototype);
  }
}

export function safeApiMessage(error: unknown): string {
  if (!error) {
    return 'Unable to load this clinical operations view.';
  }

  if (error instanceof ApiConnectionError) {
    return 'Backend connection unavailable. Demo data may be incomplete.';
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    if (!trimmed) {
      return 'Unable to load this clinical operations view.';
    }
    return trimmed;
  }

  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed) {
      return 'Unable to load this clinical operations view.';
    }
    return trimmed;
  }

  return 'Unable to load this clinical operations view.';
}
