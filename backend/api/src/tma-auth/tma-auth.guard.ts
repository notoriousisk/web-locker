import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MetricsService } from '../observability/metrics.service';
import { ObservabilityLogger } from '../observability/observability-logger.service';
import { TmaAuthService } from './tma-auth.service';
import { TmaJwtPayload, TmaRequest } from './tma-auth.types';

@Injectable()
export class TmaAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tmaAuthService: TmaAuthService,
    private readonly logger: ObservabilityLogger,
    private readonly metrics: MetricsService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<TmaRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      this.logFailure('missing_token');
      throw new UnauthorizedException('Missing TMA token');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      this.logFailure('missing_token');
      throw new UnauthorizedException('Missing TMA token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TmaJwtPayload>(token, {
        secret: this.tmaAuthService.getJwtSecret()
      });

      if (payload.scope !== 'tma' || !payload.sub || !payload.telegramId) {
        this.logFailure('invalid_claims');
        throw new UnauthorizedException('Invalid TMA token');
      }

      request.tmaUser = {
        userId: payload.sub,
        telegramId: payload.telegramId
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logFailure('invalid_token');
      throw new UnauthorizedException('Invalid TMA token');
    }
  }

  private logFailure(reason: string) {
    this.metrics.increment('locker_auth_failures_total', {
      actorType: 'tma-user',
      reason
    });
    this.logger.warn('tma_auth_failure', {
      actorType: 'tma-user',
      reason
    });
  }
}
