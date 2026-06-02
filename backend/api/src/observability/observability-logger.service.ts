import { Injectable } from '@nestjs/common';
import { LogContext, LogLevel } from './observability.types';

const redactedKeys = new Set([
  'authorization',
  'cookie',
  'password',
  'token',
  'accessToken',
  'jwt',
  'initData',
  'telegramBotToken',
  'databaseUrl',
  'DATABASE_URL',
  'JWT_SECRET',
  'TMA_JWT_SECRET',
  'TELEGRAM_BOT_TOKEN'
]);

@Injectable()
export class ObservabilityLogger {
  debug(event: string, context: LogContext = {}) {
    this.write('debug', event, context);
  }

  info(event: string, context: LogContext = {}) {
    this.write('info', event, context);
  }

  warn(event: string, context: LogContext = {}) {
    this.write('warn', event, context);
  }

  error(event: string, context: LogContext = {}) {
    this.write('error', event, context);
  }

  private write(level: LogLevel, event: string, context: LogContext) {
    const redactedContext = this.redact(context) as LogContext;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...redactedContext
    };
    const line = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(`${line}\n`);
      return;
    }

    process.stdout.write(`${line}\n`);
  }

  private redact(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        redactedKeys.has(key) ? '[REDACTED]' : this.redact(item)
      ])
    );
  }
}
