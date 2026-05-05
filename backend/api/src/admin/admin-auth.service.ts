import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { requireNonEmptyString } from '../common/validation';
import { AdminLoginDto } from './dto/admin-login.dto';

type AdminJwtPayload = {
  sub: string;
  login: string;
};

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  async login(dto: AdminLoginDto) {
    const login = requireNonEmptyString(dto.login, 'login');
    const password = requireNonEmptyString(dto.password, 'password');
    const adminLogin = this.getRequiredConfig('ADMIN_LOGIN');
    const adminPassword = this.getRequiredConfig('ADMIN_PASSWORD');

    if (login !== adminLogin || password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    const payload: AdminJwtPayload = {
      sub: 'admin',
      login: adminLogin
    };

    return {
      accessToken: await this.jwtService.signAsync(payload, {
        secret: this.getJwtSecret(),
        expiresIn: '8h'
      }),
      tokenType: 'Bearer'
    };
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
