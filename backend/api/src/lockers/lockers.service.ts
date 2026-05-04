import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LockersService {
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
}
