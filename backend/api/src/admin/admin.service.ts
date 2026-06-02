import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  LockerStatus,
  SessionStatus
} from '@prisma/client';
import { ObservabilityLogger } from '../observability/observability-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLockerStatusDto } from './dto/update-locker-status.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: ObservabilityLogger
  ) {}

  async getDashboard() {
    const [
      totalLockers,
      availableLockers,
      occupiedLockers,
      maintenanceLockers,
      activeSessions,
      completedSessions,
      totalUsers
    ] = await this.prisma.$transaction([
      this.prisma.locker.count(),
      this.prisma.locker.count({
        where: { status: LockerStatus.AVAILABLE }
      }),
      this.prisma.locker.count({
        where: { status: LockerStatus.OCCUPIED }
      }),
      this.prisma.locker.count({
        where: { status: LockerStatus.MAINTENANCE }
      }),
      this.prisma.storageSession.count({
        where: { status: SessionStatus.ACTIVE }
      }),
      this.prisma.storageSession.count({
        where: { status: SessionStatus.COMPLETED }
      }),
      this.prisma.user.count()
    ]);

    return {
      lockers: {
        total: totalLockers,
        available: availableLockers,
        occupied: occupiedLockers,
        maintenance: maintenanceLockers
      },
      sessions: {
        active: activeSessions,
        completed: completedSessions
      },
      users: {
        total: totalUsers
      }
    };
  }

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  listLockers() {
    return this.prisma.locker.findMany({
      orderBy: [
        { row: 'asc' },
        { column: 'asc' },
        { code: 'asc' }
      ]
    });
  }

  async updateLockerStatus(lockerId: string, dto: UpdateLockerStatusDto) {
    const status = this.parseAdminLockerStatus(dto.status);
    const locker = await this.prisma.locker.findUnique({
      where: { id: lockerId }
    });

    if (!locker) {
      throw new NotFoundException('Locker not found');
    }

    if (locker.status === LockerStatus.OCCUPIED) {
      throw new ConflictException(
        'Occupied lockers can only be released by finishing an active session'
      );
    }

    const updatedLocker = await this.prisma.locker.update({
      where: { id: locker.id },
      data: { status }
    });

    this.logger.info('admin_locker_status_changed', {
      actorType: 'admin',
      lockerId: locker.id,
      lockerCode: locker.code,
      previousStatus: locker.status,
      nextStatus: updatedLocker.status,
      result: 'success'
    });

    return updatedLocker;
  }

  listActiveSessions() {
    return this.listSessionsByStatus(SessionStatus.ACTIVE);
  }

  listHistorySessions() {
    return this.listSessionsByStatus(SessionStatus.COMPLETED);
  }

  listSessions() {
    return this.prisma.storageSession.findMany({
      include: {
        user: true,
        locker: true
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }

  private listSessionsByStatus(status: SessionStatus) {
    return this.prisma.storageSession.findMany({
      where: { status },
      include: {
        user: true,
        locker: true
      },
      orderBy: {
        startedAt: 'desc'
      }
    });
  }

  private parseAdminLockerStatus(value: unknown) {
    if (
      value === LockerStatus.AVAILABLE ||
      value === LockerStatus.MAINTENANCE
    ) {
      return value;
    }

    throw new BadRequestException(
      'status must be either AVAILABLE or MAINTENANCE'
    );
  }
}
