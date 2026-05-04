import { Module } from '@nestjs/common';
import { LockersController } from './lockers.controller';
import { LockersService } from './lockers.service';

@Module({
  controllers: [LockersController],
  providers: [LockersService],
  exports: [LockersService]
})
export class LockersModule {}
