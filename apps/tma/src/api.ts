import { LockerSize, StorageSession, User } from './types';

const apiBaseUrl = import.meta.env.VITE_TMA_API_BASE_URL ?? '/api';

async function apiRequest<T>(
  path: string,
  accessToken?: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

export type TmaLoginResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
};

export function loginWithTelegram(initData: string) {
  return apiRequest<TmaLoginResponse>('/tma/auth/login', undefined, {
    method: 'POST',
    body: JSON.stringify({ initData })
  });
}

export function getUser(accessToken: string) {
  return apiRequest<User>('/tma/me', accessToken);
}

export function getActiveSessions(accessToken: string) {
  return apiRequest<StorageSession[]>('/tma/me/sessions/active', accessToken);
}

export function getHistorySessions(accessToken: string) {
  return apiRequest<StorageSession[]>('/tma/me/sessions/history', accessToken);
}

export function startSession(accessToken: string, requestedSize: LockerSize) {
  return apiRequest<StorageSession>('/tma/sessions', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      requestedSize
    })
  });
}

export function finishSession(sessionId: string, accessToken: string) {
  return apiRequest<StorageSession>(
    `/tma/sessions/${sessionId}/finish`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({})
    }
  );
}
