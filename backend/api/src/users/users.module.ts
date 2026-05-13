import { Module } from '@nestjs/common';
import { TmaAuthModule } from '../tma-auth/tma-auth.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TmaAuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
