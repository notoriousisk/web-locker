import {
  Dashboard,
  Locker,
  LockerStatus,
  SessionFilter,
  StorageSession,
  User
} from './types';

const apiBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL ?? '/api';

async function apiRequest<T>(
  path: string,
  token: string | null,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(body.message)) {
      return body.message.join(', ');
    }

    return body.message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export async function login(loginValue: string, password: string) {
  return apiRequest<{ accessToken: string; tokenType: string }>(
    '/admin/auth/login',
    null,
    {
      method: 'POST',
      body: JSON.stringify({
        login: loginValue,
        password
      })
    }
  );
}

export function getMe(token: string) {
  return apiRequest<{ login: string }>('/admin/auth/me', token);
}

export function getDashboard(token: string) {
  return apiRequest<Dashboard>('/admin/dashboard', token);
}

export function getUsers(token: string) {
  return apiRequest<User[]>('/admin/users', token);
}

export function getLockers(token: string) {
  return apiRequest<Locker[]>('/admin/lockers', token);
}

export function updateLockerStatus(
  token: string,
  lockerId: string,
  status: Extract<LockerStatus, 'AVAILABLE' | 'MAINTENANCE'>
) {
  return apiRequest<Locker>(`/admin/lockers/${lockerId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export function getSessions(token: string, filter: SessionFilter) {
  const path =
    filter === 'all' ? '/admin/sessions' : `/admin/sessions/${filter}`;

  return apiRequest<StorageSession[]>(path, token);
}
