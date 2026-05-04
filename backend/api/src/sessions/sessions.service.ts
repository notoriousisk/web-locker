import {
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  LockerSize as PrismaLockerSize,
  LockerStatus as PrismaLockerStatus,
  Prisma,
  SessionStatus as PrismaSessionStatus
} from '@prisma/client';
import { LockerSize } from '../common/enums';
import {
  parseLockerSize,
  requireNonEmptyString
} from '../common/validation';
import { PrismaService } from '../prisma/prisma.service';
import { FinishSessionDto } from './dto/finish-session.dto';
import { StartSessionDto } from './dto/start-session.dto';

const suitableSizesByRequest: Record<LockerSize, PrismaLockerSize[]> = {
  [LockerSize.S]: [
    PrismaLockerSize.S,
    PrismaLockerSize.M,
    PrismaLockerSize.L,
    PrismaLockerSize.XL
  ],
  [LockerSize.M]: [
    PrismaLockerSize.M,
    PrismaLockerSize.L,
    PrismaLockerSize.XL
  ],
  [LockerSize.L]: [PrismaLockerSize.L, PrismaLockerSize.XL],
  [LockerSize.XL]: [PrismaLockerSize.XL]
};

const sessionInclude = {
  locker: true,
  user: true
} satisfies Prisma.StorageSessionInclude;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  startSession(dto: StartSessionDto) {
    const telegramId = requireNonEmptyString(dto.telegramId, 'telegramId');
    const requestedSize = parseLockerSize(dto.requestedSize);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { telegramId }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      for (const suitableSize of suitableSizesByRequest[requestedSize]) {
        while (true) {
          const locker = await tx.locker.findFirst({
            where: {
              size: suitableSize,
              status: PrismaLockerStatus.AVAILABLE
            },
            orderBy: [
              { row: 'asc' },
              { column: 'asc' },
              { code: 'asc' }
            ]
          });

          if (!locker) {
            break;
          }

          const updateResult = await tx.locker.updateMany({
            where: {
              id: locker.id,
              status: PrismaLockerStatus.AVAILABLE
            },
            data: {
              status: PrismaLockerStatus.OCCUPIED
            }
          });

          if (updateResult.count === 0) {
            continue;
          }

          return tx.storageSession.create({
            data: {
              userId: user.id,
              lockerId: locker.id,
              requestedSize: requestedSize as PrismaLockerSize,
              status: PrismaSessionStatus.ACTIVE
            },
            include: sessionInclude
          });
        }
      }

      throw new ConflictException('No suitable locker is available');
    });
  }

  finishSession(sessionIdValue: unknown, dto: FinishSessionDto) {
    const sessionId = requireNonEmptyString(sessionIdValue, 'sessionId');
    const telegramId = requireNonEmptyString(dto.telegramId, 'telegramId');

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.storageSession.findFirst({
        where: {
          id: sessionId,
          status: PrismaSessionStatus.ACTIVE,
          user: {
            telegramId
          }
        },
        include: {
          locker: true
        }
      });

      if (!session) {
        throw new NotFoundException('Active session not found');
      }

      await tx.locker.update({
        where: { id: session.lockerId },
        data: { status: PrismaLockerStatus.AVAILABLE }
      });

      return tx.storageSession.update({
        where: { id: session.id },
        data: {
          status: PrismaSessionStatus.COMPLETED,
          endedAt: new Date()
        },
        include: sessionInclude
      });
    });
  }

  listUserActiveSessions(telegramIdValue: unknown) {
    return this.listUserSessionsByStatus(
      telegramIdValue,
      PrismaSessionStatus.ACTIVE
    );
  }

  listUserHistorySessions(telegramIdValue: unknown) {
    return this.listUserSessionsByStatus(
      telegramIdValue,
      PrismaSessionStatus.COMPLETED
    );
  }

  private async listUserSessionsByStatus(
    telegramIdValue: unknown,
    status: PrismaSessionStatus
  ) {
    const telegramId = requireNonEmptyString(telegramIdValue, 'telegramId');
    const user = await this.prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.storageSession.findMany({
      where: {
        userId: user.id,
        status
      },
      include: {
        locker: true
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }
}
