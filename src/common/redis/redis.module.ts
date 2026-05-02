import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * 全局注册后，任意模块的 Provider 中均可 `constructor(private readonly redis: RedisService) {}`。
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
