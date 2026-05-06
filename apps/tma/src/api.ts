import { LockerSize, StorageSession, User } from './types';

const apiBaseUrl = import.meta.env.VITE_TMA_API_BASE_URL ?? '/api';

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
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
    const message = body.message;

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message ?? `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

export type UpsertUserPayload = {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

export function upsertUser(payload: UpsertUserPayload) {
  return apiRequest<User>('/tma/users/upsert', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getUser(telegramId: string) {
  return apiRequest<User>(`/tma/me?telegramId=${encodeURIComponent(telegramId)}`);
}

export function getActiveSessions(telegramId: string) {
  return apiRequest<StorageSession[]>(
    `/tma/me/sessions/active?telegramId=${encodeURIComponent(telegramId)}`
  );
}

export function getHistorySessions(telegramId: string) {
  return apiRequest<StorageSession[]>(
    `/tma/me/sessions/history?telegramId=${encodeURIComponent(telegramId)}`
  );
}

export function startSession(telegramId: string, requestedSize: LockerSize) {
  return apiRequest<StorageSession>('/tma/sessions', {
    method: 'POST',
    body: JSON.stringify({
      telegramId,
      requestedSize
    })
  });
}

export function finishSession(sessionId: string, telegramId: string) {
  return apiRequest<StorageSession>(`/tma/sessions/${sessionId}/finish`, {
    method: 'POST',
    body: JSON.stringify({
      telegramId
    })
  });
}
