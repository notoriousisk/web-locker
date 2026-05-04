import { Injectable } from '@nestjs/common';
import { LockerStatus, SessionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  listLockers() {
    return this.prisma.locker.findMany({
      orderBy: [
        { row: 'asc' },
        { column: 'asc' },
        { code: 'asc' }
      ]
    });
  }

  async getStats() {
    const [
      totalLockers,
      availableLockers,
      occupiedLockers,
      maintenanceLockers,
      activeSessions
    ] =
      await this.prisma.$transaction([
        this.prisma.locker.count(),
        this.prisma.locker.count({
          where: {
            status: LockerStatus.AVAILABLE
          }
        }),
        this.prisma.locker.count({
          where: {
            status: LockerStatus.OCCUPIED
          }
        }),
        this.prisma.locker.count({
          where: {
            status: LockerStatus.MAINTENANCE
          }
        }),
        this.prisma.storageSession.count({
          where: {
            status: SessionStatus.ACTIVE
          }
        })
      ]);

    return {
      lockers: {
        total: totalLockers,
        available: availableLockers,
        occupied: occupiedLockers,
        maintenance: maintenanceLockers
      },
      sessions: {
        active: activeSessions
      }
    };
  }
}
