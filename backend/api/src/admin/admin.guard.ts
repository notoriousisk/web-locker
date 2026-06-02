import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MetricsService } from '../observability/metrics.service';
import { ObservabilityLogger } from '../observability/observability-logger.service';
import { AdminAuthService } from './admin-auth.service';

type RequestWithHeaders = {
  headers: {
    authorization?: string;
  };
  admin?: {
    login: string;
  };
};

type AdminJwtPayload = {
  sub?: string;
  login?: string;
};

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly jwtService: JwtService,
    private readonly logger: ObservabilityLogger,
    private readonly metrics: MetricsService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      this.logFailure('missing_token');
      throw new UnauthorizedException('Missing admin token');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      this.logFailure('missing_token');
      throw new UnauthorizedException('Missing admin token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AdminJwtPayload>(
        token,
        {
          secret: this.adminAuthService.getJwtSecret()
        }
      );

      if (payload.sub !== 'admin' || !payload.login) {
        this.logFailure('invalid_claims');
        throw new UnauthorizedException('Invalid admin token');
      }

      request.admin = {
        login: payload.login
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logFailure('invalid_token');
      throw new UnauthorizedException('Invalid admin token');
    }
  }

  private logFailure(reason: string) {
    this.metrics.increment('locker_auth_failures_total', {
      actorType: 'admin',
      reason
    });
    this.logger.warn('admin_auth_failure', {
      actorType: 'admin',
      reason
    });
  }
}
