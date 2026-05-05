import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
    private readonly jwtService: JwtService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing admin token');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
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

      throw new UnauthorizedException('Invalid admin token');
    }
  }
}
