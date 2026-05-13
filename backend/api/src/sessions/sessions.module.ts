import { Module } from '@nestjs/common';
import { TmaAuthModule } from '../tma-auth/tma-auth.module';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

@Module({
  imports: [TmaAuthModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService]
})
export class SessionsModule {}
