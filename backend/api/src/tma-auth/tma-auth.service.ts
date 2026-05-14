import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { optionalString, requireNonEmptyString } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import { TmaLoginDto } from './dto/tma-login.dto';
import { TmaJwtPayload } from './tma-auth.types';

type TelegramUserPayload = {
  id?: unknown;
  username?: unknown;
  first_name?: unknown;
  last_name?: unknown;
};

type ValidatedTelegramUser = {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

@Injectable()
export class TmaAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async login(dto: TmaLoginDto) {
    const initData = optionalString(dto.initData);
    const telegramUser = initData
      ? this.validateTelegramInitData(initData)
      : this.getDevelopmentUser();

    const user = await this.prisma.user.upsert({
      where: { telegramId: telegramUser.telegramId },
      update: {
        username: telegramUser.username,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName
      },
      create: {
        telegramId: telegramUser.telegramId,
        username: telegramUser.username,
        firstName: telegramUser.firstName,
        lastName: telegramUser.lastName,
        balance: new Prisma.Decimal(1000)
      }
    });

    const payload: TmaJwtPayload = {
      sub: user.id,
      telegramId: user.telegramId,
      scope: 'tma'
    };

    const tokenOptions: JwtSignOptions = {
      secret: this.getJwtSecret(),
      expiresIn: this.getTokenExpiresIn() as JwtSignOptions['expiresIn']
    };

    return {
      accessToken: await this.jwtService.signAsync(payload, tokenOptions),
      tokenType: 'Bearer',
      expiresIn: this.getTokenExpiresIn(),
      user
    };
  }

  getJwtSecret() {
    return this.getRequiredConfig('TMA_JWT_SECRET');
  }

  private validateTelegramInitData(initData: string): ValidatedTelegramUser {
    const botToken = this.getRequiredConfig('TELEGRAM_BOT_TOKEN');
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');

    if (!receivedHash) {
      throw new UnauthorizedException('Telegram initData hash is missing');
    }

    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (!this.hashesMatch(calculatedHash, receivedHash)) {
      throw new UnauthorizedException('Telegram initData signature is invalid');
    }

    this.assertFreshAuthDate(params.get('auth_date'));

    const rawUser = params.get('user');

    if (!rawUser) {
      throw new UnauthorizedException('Telegram initData user is missing');
    }

    return this.parseTelegramUser(rawUser);
  }

  private parseTelegramUser(rawUser: string): ValidatedTelegramUser {
    let user: TelegramUserPayload;

    try {
      user = JSON.parse(rawUser) as TelegramUserPayload;
    } catch {
      throw new UnauthorizedException('Telegram initData user is invalid');
    }

    if (
      (typeof user.id !== 'number' && typeof user.id !== 'string') ||
      String(user.id).trim().length === 0
    ) {
      throw new UnauthorizedException('Telegram initData user id is missing');
    }

    return {
      telegramId: String(user.id),
      username: optionalString(user.username),
      firstName: optionalString(user.first_name),
      lastName: optionalString(user.last_name)
    };
  }

  private assertFreshAuthDate(authDateValue: string | null) {
    if (!authDateValue || !/^\d+$/.test(authDateValue)) {
      throw new UnauthorizedException('Telegram initData auth_date is missing');
    }

    const authDateSeconds = Number(authDateValue);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxAgeSeconds = this.getInitDataMaxAgeSeconds();

    if (authDateSeconds > nowSeconds + 60) {
      throw new UnauthorizedException('Telegram initData auth_date is invalid');
    }

    if (nowSeconds - authDateSeconds > maxAgeSeconds) {
      throw new UnauthorizedException('Telegram initData is stale');
    }
  }

  private getDevelopmentUser(): ValidatedTelegramUser {
    if (this.configService.get<string>('TMA_DEV_AUTH_ENABLED') !== 'true') {
      throw new UnauthorizedException('Telegram initData is required');
    }

    return {
      telegramId: this.getRequiredConfig('TMA_DEV_TELEGRAM_ID'),
      username: this.getOptionalConfig('TMA_DEV_USERNAME'),
      firstName: this.getOptionalConfig('TMA_DEV_FIRST_NAME'),
      lastName: this.getOptionalConfig('TMA_DEV_LAST_NAME')
    };
  }

  private hashesMatch(calculatedHash: string, receivedHash: string) {
    const calculated = Buffer.from(calculatedHash, 'hex');
    const received = Buffer.from(receivedHash, 'hex');

    if (calculated.length !== received.length) {
      return false;
    }

    return timingSafeEqual(calculated, received);
  }

  private getInitDataMaxAgeSeconds() {
    const configuredValue = this.configService.get<string>(
      'TMA_INIT_DATA_MAX_AGE_SECONDS'
    );

    if (!configuredValue) {
      return 86400;
    }

    const parsedValue = Number(configuredValue);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
      throw new InternalServerErrorException(
        'TMA_INIT_DATA_MAX_AGE_SECONDS must be a positive integer'
      );
    }

    return parsedValue;
  }

  private getTokenExpiresIn() {
    return this.configService.get<string>('TMA_JWT_EXPIRES_IN') ?? '15m';
  }

  private getOptionalConfig(name: string) {
    return optionalString(this.configService.get<string>(name));
  }

  private getRequiredConfig(name: string) {
    const value = this.configService.get<string>(name);

    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured`);
    }

    return requireNonEmptyString(value, name);
  }
}
