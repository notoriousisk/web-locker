import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { catchError, tap } from 'rxjs';
import { ObservabilityLogger } from './observability-logger.service';
import { MetricsService } from './metrics.service';
import { RequestActor } from './observability.types';

type RequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  route?: {
    path?: string;
  };
  headers?: Record<string, string | string[] | undefined>;
  admin?: {
    login?: string;
  };
  tmaUser?: {
    userId?: string;
    telegramId?: string;
  };
  requestId?: string;
};

type ResponseLike = {
  statusCode?: number;
  setHeader(name: string, value: string): void;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: ObservabilityLogger,
    private readonly metrics: MetricsService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const requestId = this.getRequestId(request);
    const startTime = process.hrtime.bigint();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap(() => {
        this.logRequest(request, response.statusCode ?? 200, requestId, startTime);
      }),
      catchError((error: unknown) => {
        const statusCode = this.getErrorStatusCode(error);
        this.logRequest(request, statusCode, requestId, startTime);
        throw error;
      })
    );
  }

  private logRequest(
    request: RequestLike,
    statusCode: number,
    requestId: string,
    startTime: bigint
  ) {
    const latencyMs = Number(process.hrtime.bigint() - startTime) / 1_000_000;
    const method = request.method ?? 'UNKNOWN';
    const route = this.getRoute(request);
    const actor = this.getActor(request);

    this.metrics.observeRequest(
      { method, route, statusCode },
      Math.round(latencyMs)
    );

    this.logger.info('api_request', {
      requestId,
      method,
      route,
      path: request.originalUrl ?? request.url,
      statusCode,
      latencyMs: Math.round(latencyMs),
      ...actor
    });
  }

  private getRequestId(request: RequestLike) {
    const value = request.headers?.['x-request-id'];
    const requestId = Array.isArray(value) ? value[0] : value;

    if (requestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(requestId)) {
      return requestId;
    }

    return randomUUID();
  }

  private getRoute(request: RequestLike) {
    return request.route?.path ?? request.originalUrl ?? request.url ?? 'unknown';
  }

  private getActor(request: RequestLike): RequestActor {
    if (request.admin?.login) {
      return {
        actorType: 'admin',
        actorId: request.admin.login
      };
    }

    if (request.tmaUser?.userId) {
      return {
        actorType: 'tma-user',
        actorId: request.tmaUser.userId,
        telegramId: request.tmaUser.telegramId
      };
    }

    const path = request.originalUrl ?? request.url ?? '';

    if (path.startsWith('/api/public')) {
      return {
        actorType: 'public'
      };
    }

    return {
      actorType: 'anonymous'
    };
  }

  private getErrorStatusCode(error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'getStatus' in error &&
      typeof error.getStatus === 'function'
    ) {
      return Number(error.getStatus());
    }

    return 500;
  }
}
