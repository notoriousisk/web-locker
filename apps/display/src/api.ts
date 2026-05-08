import { Locker, PublicStats } from './types';

const apiBaseUrl = import.meta.env.VITE_DISPLAY_API_BASE_URL ?? '/api';

async function apiRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getPublicLockers() {
  return apiRequest<Locker[]>('/public/lockers');
}

export function getPublicStats() {
  return apiRequest<PublicStats>('/public/stats');
}
