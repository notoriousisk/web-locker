import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ErrorLoggingFilter } from './observability/error-logging.filter';
import { RequestLoggingInterceptor } from './observability/request-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('API_PORT', 3000);

  app.setGlobalPrefix('api');
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));
  app.useGlobalFilters(app.get(ErrorLoggingFilter));

  await app.listen(port);
}

void bootstrap();
