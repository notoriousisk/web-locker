import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TmaAuthController } from './tma-auth.controller';
import { TmaAuthGuard } from './tma-auth.guard';
import { TmaAuthService } from './tma-auth.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [TmaAuthController],
  providers: [TmaAuthService, TmaAuthGuard],
  exports: [TmaAuthService, TmaAuthGuard, JwtModule]
})
export class TmaAuthModule {}
