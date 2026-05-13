import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TmaAuthService } from './tma-auth.service';
import { TmaJwtPayload, TmaRequest } from './tma-auth.types';

@Injectable()
export class TmaAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly tmaAuthService: TmaAuthService
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<TmaRequest>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing TMA token');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Missing TMA token');
    }

    try {
      const payload = await this.jwtService.verifyAsync<TmaJwtPayload>(token, {
        secret: this.tmaAuthService.getJwtSecret()
      });

      if (payload.scope !== 'tma' || !payload.sub || !payload.telegramId) {
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

      throw new UnauthorizedException('Invalid TMA token');
    }
  }
}
