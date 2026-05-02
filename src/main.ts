import * as dotenv from 'dotenv';
import * as path from 'path';
import { join } from 'path';

// 参考 fitment-h5：按环境加载对应 .env 文件
dotenv.config();
const env = process.env.NODE_ENV || 'development';
dotenv.config({
  path: path.resolve(process.cwd(), `.env.${env}`),
  override: true,
});

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/exception/http-exception.filter';
import { UPLOAD_CONFIG } from './common/constants/app.constants';
import compress from '@fastify/compress';
import multipart from '@fastify/multipart';

/**
 * 应用程序的入口文件，使用 Fastify 适配器，并注册 gzip 与 multipart。
 */
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(compress as any, { global: true });
  await app.register(multipart as any, {
    limits: { fileSize: UPLOAD_CONFIG.maxFileSize },
  });

  app.useStaticAssets({
    root: join(process.cwd(), 'pages'),
  });

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    exposedHeaders: ['Content-Disposition'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';
  await app.listen(port, host);
  console.log(`location: http://localhost:${port}`);
}
bootstrap();
