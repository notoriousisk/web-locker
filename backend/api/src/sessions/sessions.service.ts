import {
  BadRequestException,
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

const lockerPrices: Record<PrismaLockerSize, Prisma.Decimal> = {
  [PrismaLockerSize.S]: new Prisma.Decimal(5),
  [PrismaLockerSize.M]: new Prisma.Decimal(7),
  [PrismaLockerSize.L]: new Prisma.Decimal(10),
  [PrismaLockerSize.XL]: new Prisma.Decimal(15)
};

const sessionInclude = {
  locker: true,
  user: true
} satisfies Prisma.StorageSessionInclude;

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  startSession(userIdValue: unknown, dto: StartSessionDto) {
    const userId = requireNonEmptyString(userIdValue, 'userId');
    const requestedSize = parseLockerSize(dto.requestedSize);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId }
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

          const assignedPrice = lockerPrices[locker.size];

          if (user.balance.lessThan(assignedPrice)) {
            throw new BadRequestException(
              `Insufficient balance for ${locker.size} locker`
            );
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

  finishSession(userIdValue: unknown, sessionIdValue: unknown) {
    const userId = requireNonEmptyString(userIdValue, 'userId');
    const sessionId = requireNonEmptyString(sessionIdValue, 'sessionId');

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.storageSession.findFirst({
        where: {
          id: sessionId,
          status: PrismaSessionStatus.ACTIVE,
          userId
        },
        include: {
          locker: true
        }
      });

      if (!session) {
        throw new NotFoundException('Active session not found');
      }

      const assignedPrice = lockerPrices[session.locker.size];

      await tx.locker.update({
        where: { id: session.lockerId },
        data: { status: PrismaLockerStatus.AVAILABLE }
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: assignedPrice
          }
        }
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

  listUserActiveSessions(userIdValue: unknown) {
    return this.listUserSessionsByStatus(
      userIdValue,
      PrismaSessionStatus.ACTIVE
    );
  }

  listUserHistorySessions(userIdValue: unknown) {
    return this.listUserSessionsByStatus(
      userIdValue,
      PrismaSessionStatus.COMPLETED
    );
  }

  private async listUserSessionsByStatus(
    userIdValue: unknown,
    status: PrismaSessionStatus
  ) {
    const userId = requireNonEmptyString(userIdValue, 'userId');
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
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
