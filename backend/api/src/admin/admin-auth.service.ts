import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { requireNonEmptyString } from '../common/validation';
import { MetricsService } from '../observability/metrics.service';
import { ObservabilityLogger } from '../observability/observability-logger.service';
import { AdminLoginDto } from './dto/admin-login.dto';

type AdminJwtPayload = {
  sub: string;
  login: string;
};

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly logger: ObservabilityLogger,
    private readonly metrics: MetricsService
  ) {}

  async login(dto: AdminLoginDto) {
    const login = requireNonEmptyString(dto.login, 'login');
    const password = requireNonEmptyString(dto.password, 'password');
    const adminLogin = this.getRequiredConfig('ADMIN_LOGIN');
    const adminPassword = this.getRequiredConfig('ADMIN_PASSWORD');

    if (login !== adminLogin || password !== adminPassword) {
      this.metrics.increment('locker_auth_failures_total', {
        actorType: 'admin',
        reason: 'invalid_credentials'
      });
      this.logger.warn('admin_login_failure', {
        actorType: 'admin',
        login,
        reason: 'invalid_credentials'
      });
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload: AdminJwtPayload = {
      sub: 'admin',
      login: adminLogin
    };

    const response = {
      accessToken: await this.jwtService.signAsync(payload, {
        secret: this.getJwtSecret(),
        expiresIn: '8h'
      }),
      tokenType: 'Bearer'
    };

    this.logger.info('admin_login_success', {
      actorType: 'admin',
      actorId: adminLogin
    });

    return response;
  }

  getMe(login: string) {
    return {
      login
    };
  }

  getJwtSecret() {
    return this.getRequiredConfig('JWT_SECRET');
  }

  private getRequiredConfig(name: string) {
    const value = this.configService.get<string>(name);

    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured`);
    }

    return value;
  }
}
