import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LockersModule } from './lockers/lockers.module';
import { PrismaModule } from './prisma/prisma.module';
import { PublicModule } from './public/public.module';
import { SessionsModule } from './sessions/sessions.module';
import { TmaAuthModule } from './tma-auth/tma-auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env']
    }),
    PrismaModule,
    UsersModule,
    LockersModule,
    SessionsModule,
    PublicModule,
    AdminModule,
    TmaAuthModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
