import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHealth() {
    return {
      status: 'ok',
      service: 'locker-mvp-api'
    };
  }

  async getDatabaseHealth() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'locker-mvp-api',
      database: 'ok'
    };
  }
}
