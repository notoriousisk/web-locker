import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ObservabilityLogger } from './observability-logger.service';

type RequestLike = {
  method?: string;
  originalUrl?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  requestId?: string;
};

type ResponseLike = {
  status(statusCode: number): ResponseLike;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
};

@Catch()
export class ErrorLoggingFilter implements ExceptionFilter {
  constructor(private readonly logger: ObservabilityLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const requestId = this.getRequestId(request);
    const message =
      exception instanceof Error ? exception.message : 'Unexpected error';

    response.setHeader('x-request-id', requestId);

    this.logger.error('api_error', {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode,
      message,
      stack: exception instanceof Error ? exception.stack : undefined
    });

    if ((request.originalUrl ?? request.url ?? '').startsWith('/api/public')) {
      this.logger.warn('public_api_failure', {
        requestId,
        actorType: 'public',
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
        message
      });
    }

    response.status(statusCode).json({
      statusCode,
      message: statusCode >= 500 ? 'Internal server error' : message,
      error: statusCode >= 500 ? 'Internal Server Error' : undefined,
      requestId
    });
  }

  private getRequestId(request: RequestLike) {
    if (request.requestId) {
      return request.requestId;
    }

    const value = request.headers?.['x-request-id'];
    const requestId = Array.isArray(value) ? value[0] : value;

    if (requestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(requestId)) {
      return requestId;
    }

    return randomUUID();
  }
}
