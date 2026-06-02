import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ErrorLoggingFilter } from './error-logging.filter';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { ObservabilityLogger } from './observability-logger.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MetricsController],
  providers: [
    ObservabilityLogger,
    MetricsService,
    RequestLoggingInterceptor,
    ErrorLoggingFilter
  ],
  exports: [
    ObservabilityLogger,
    MetricsService,
    RequestLoggingInterceptor,
    ErrorLoggingFilter
  ]
})
export class ObservabilityModule {}

