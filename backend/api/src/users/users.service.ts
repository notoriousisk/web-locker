import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { optionalString, requireNonEmptyString } from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertUserDto } from './dto/upsert-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  upsertTelegramUser(dto: UpsertUserDto) {
    const telegramId = requireNonEmptyString(dto.telegramId, 'telegramId');
    const username = optionalString(dto.username);
    const firstName = optionalString(dto.firstName);
    const lastName = optionalString(dto.lastName);

    return this.prisma.user.upsert({
      where: { telegramId },
      update: {
        username,
        firstName,
        lastName
      },
      create: {
        telegramId,
        username,
        firstName,
        lastName,
        balance: new Prisma.Decimal(0)
      }
    });
  }

  async getByTelegramId(telegramIdValue: unknown) {
    const telegramId = requireNonEmptyString(telegramIdValue, 'telegramId');
    const user = await this.prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
