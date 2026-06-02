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
import { MetricsService } from '../observability/metrics.service';
import { ObservabilityLogger } from '../observability/observability-logger.service';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: ObservabilityLogger,
    private readonly metrics: MetricsService
  ) {}

  async startSession(userIdValue: unknown, dto: StartSessionDto) {
    const userId = requireNonEmptyString(userIdValue, 'userId');
    const requestedSize = parseLockerSize(dto.requestedSize);

    try {
      return await this.prisma.$transaction(async (tx) => {
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
              this.metrics.increment('locker_insufficient_balance_total', {
                requestedSize,
                assignedSize: locker.size
              });
              this.metrics.increment('locker_storage_start_failures_total', {
                reason: 'insufficient_balance'
              });
              this.logger.warn('storage_start_insufficient_balance', {
                actorType: 'tma-user',
                actorId: user.id,
                userId: user.id,
                lockerId: locker.id,
                lockerCode: locker.code,
                requestedSize,
                assignedSize: locker.size,
                price: assignedPrice.toString(),
                balance: user.balance.toString(),
                result: 'failure'
              });
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

            this.logger.info('locker_assigned', {
              actorType: 'tma-user',
              actorId: user.id,
              userId: user.id,
              lockerId: locker.id,
              lockerCode: locker.code,
              requestedSize,
              assignedSize: locker.size,
              price: assignedPrice.toString(),
              result: 'success'
            });

            const session = await tx.storageSession.create({
              data: {
                userId: user.id,
                lockerId: locker.id,
                requestedSize: requestedSize as PrismaLockerSize,
                status: PrismaSessionStatus.ACTIVE
              },
              include: sessionInclude
            });

            this.logger.info('storage_session_start_success', {
              actorType: 'tma-user',
              actorId: user.id,
              userId: user.id,
              sessionId: session.id,
              lockerId: locker.id,
              lockerCode: locker.code,
              requestedSize,
              assignedSize: locker.size,
              price: assignedPrice.toString(),
              result: 'success'
            });

            return session;
          }
        }

        this.metrics.increment('locker_storage_start_failures_total', {
          reason: 'no_locker_available'
        });
        this.logger.warn('storage_start_no_locker_available', {
          actorType: 'tma-user',
          actorId: user.id,
          userId: user.id,
          requestedSize,
          result: 'failure'
        });
        throw new ConflictException('No suitable locker is available');
      });
    } catch (error) {
      if (
        !(error instanceof BadRequestException) &&
        !(error instanceof ConflictException)
      ) {
        this.metrics.increment('locker_storage_start_failures_total', {
          reason: 'error'
        });
        this.logger.warn('storage_session_start_failure', {
          actorType: 'tma-user',
          actorId: userId,
          userId,
          requestedSize,
          result: 'failure',
          reason: error instanceof Error ? error.message : 'unknown'
        });
      }

      throw error;
    }
  }

  async finishSession(userIdValue: unknown, sessionIdValue: unknown) {
    const userId = requireNonEmptyString(userIdValue, 'userId');
    const sessionId = requireNonEmptyString(sessionIdValue, 'sessionId');

    try {
      return await this.prisma.$transaction(async (tx) => {
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

        this.logger.info('storage_session_balance_deducted', {
          actorType: 'tma-user',
          actorId: userId,
          userId,
          sessionId: session.id,
          lockerId: session.lockerId,
          lockerCode: session.locker.code,
          assignedSize: session.locker.size,
          price: assignedPrice.toString(),
          result: 'success'
        });

        const completedSession = await tx.storageSession.update({
          where: { id: session.id },
          data: {
            status: PrismaSessionStatus.COMPLETED,
            endedAt: new Date()
          },
          include: sessionInclude
        });

        this.logger.info('storage_session_finish_success', {
          actorType: 'tma-user',
          actorId: userId,
          userId,
          sessionId: session.id,
          lockerId: session.lockerId,
          lockerCode: session.locker.code,
          assignedSize: session.locker.size,
          price: assignedPrice.toString(),
          result: 'success'
        });

        return completedSession;
      });
    } catch (error) {
      this.logger.warn('storage_session_finish_failure', {
        actorType: 'tma-user',
        actorId: userId,
        userId,
        sessionId,
        result: 'failure',
        reason: error instanceof Error ? error.message : 'unknown'
      });
      throw error;
    }
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
