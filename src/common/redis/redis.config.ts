/**
 * Redis 连接配置（来自环境变量，便于按环境切换）
 *
 * 可选环境变量：
 * - REDIS_ENABLED 为 `false` / `0` 时关闭缓存与连接（本地不装 Redis 时可设）
 * - REDIS_HOST（默认 127.0.0.1）
 * - REDIS_PORT（默认 6379）
 * - REDIS_PASSWORD（无密码可省略）
 * - REDIS_DB（默认 0）
 */
import type { RedisOptions } from 'ioredis';

/** 未显式关闭则视为使用 Redis；连接失败时 @Cache 会降级为直查方法体 */
export function isRedisEnabled(): boolean {
  const v = process.env.REDIS_ENABLED;
  if (v === undefined || v === '') {
    return true;
  }
  return v !== 'false' && v !== '0';
}

export function getRedisOptions(): RedisOptions {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number.parseInt(process.env.REDIS_PORT || '6379', 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number.parseInt(process.env.REDIS_DB || '0', 10) || 0,
    /** 未连上时尽快失败，避免每个 @Cache 请求长时间卡在重试上 */
    connectTimeout: 1000,
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
    /** 断线时拒绝命令而不是排队，便于装饰器里 catch 后立刻走库 */
    enableOfflineQueue: false,
  };
}
