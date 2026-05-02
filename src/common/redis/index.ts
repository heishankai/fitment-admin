/**
 * @packageDocumentation
 * Redis 缓存层：单例连接、可注入的 {@link RedisService}、方法装饰器 {@link Cache} / {@link CacheWithLock}、防击穿 {@link getOrSetWithLock}。
 *
 * 使用步骤概要：
 * 1. 在 `AppModule` 中 `imports: [ RedisModule, ... ]`（见项目 `app.module.ts`）。
 * 2. 环境变量可配置 `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB`。
 * 3. 在 Service 中注入 `RedisService`，或给方法加 `@Cache(60)`；热点读加 `@CacheWithLock(60)` 或自行调用 `getOrSetWithLock`。
 * 4. 详细说明见同目录 `README.md`。
 */
export { RedisModule } from './redis.module';
export { RedisService } from './redis.service';
export { getRedisOptions, isRedisEnabled } from './redis.config';
export {
  getRedisConnection,
  closeRedisConnection,
  redis,
} from './redis.connection';
export { Cache, CacheWithLock } from './cache.decorator';
export { getOrSetWithLock } from './redis.cache-util';
export type { GetOrSetWithLockOptions } from './redis.cache-util';
export {
  clearRedisCoolDown,
  isRedisInCooldown,
  markRedisCoolDown,
} from './redis.circuit';
