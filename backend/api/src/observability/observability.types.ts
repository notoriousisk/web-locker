export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = Record<string, unknown>;

export type RequestActor = {
  actorType: 'admin' | 'tma-user' | 'public' | 'anonymous';
  actorId?: string;
  telegramId?: string;
};

