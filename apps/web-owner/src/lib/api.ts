const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('oasys_owner_token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options.headers },
  });

  if (response.status === 401) {
    localStorage.removeItem('oasys_owner_token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      (body as Record<string, string> | null)?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'DELETE' });
}
