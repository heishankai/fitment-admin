import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/exception/http-exception.filter';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { NestExpressApplication } from '@nestjs/platform-express';

/**
 * 应用程序的入口文件，它使用核心函数 NestFactory 来创建 Nest 应用程序实例。
 */
async function bootstrap() {
  // 1. 创建应用实例
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets('pages');

  // 2. 全局注册响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 3. 全局注册异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 4. 启用CORS支持
  app.enableCors({
    origin: true, // 允许所有来源，生产环境建议指定具体域名
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
    exposedHeaders: [
      'Content-Disposition', // 暴露 Content-Disposition 响应头，用于文件下载时获取文件名
    ],
    credentials: true, // 允许携带凭证
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // 5. 监听端口，启动应用
  await app.listen(process.env.PORT ?? 3000);
  console.log('location: http://localhost:' + (process.env.PORT ?? 3000));
}
bootstrap();
