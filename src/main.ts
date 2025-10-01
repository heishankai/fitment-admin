import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * 应用程序的入口文件，它使用核心函数 NestFactory 来创建 Nest 应用程序实例。
 */
async function bootstrap() {
  // 1. 创建应用实例
  const app = await NestFactory.create(AppModule);
  // 2. 监听端口，启动应用
  await app.listen(process.env.PORT ?? 3000);
  console.log('location: http://localhost:' + (process.env.PORT ?? 3000));
}
bootstrap();
