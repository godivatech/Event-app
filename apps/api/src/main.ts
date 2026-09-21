import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Needed for exact webhook HMAC verification
  });

  // Enable cookies
  app.use(cookieParser());

  // JSON and URL-encoded parsers
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Global filters and interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // CORS configuration
  const appOrigin = process.env.APP_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: [appOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-guest-session', 'x-razorpay-signature'],
  });

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 CEDOI API server running on port ${port} (Origin: ${appOrigin})`);
}

bootstrap();
