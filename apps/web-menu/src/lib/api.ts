const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

function getSessionToken(): string | null {
  return sessionStorage.getItem('sessionToken');
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem('sessionToken', token);
}

export function clearSessionToken(): void {
  sessionStorage.removeItem('sessionToken');
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getSessionToken();
  if (token) {
    headers['X-Session-Token'] = token;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro de rede' }));
    throw new ApiError(response.status, error.message || 'Erro inesperado', error);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
