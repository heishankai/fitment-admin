import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { isRedisEnabled } from './redis.config';
import { isRedisInCooldown } from './redis.circuit';
import { closeRedisConnection, getRedisConnection, redis } from './redis.connection';
import {
  getOrSetWithLock,
  type GetOrSetWithLockOptions,
} from './redis.cache-util';
import type { Redis } from 'ioredis';

/**
 * 在业务层注入使用 Redis 的推荐方式（便于单测时 Mock）。
 *
 * 也导出 `getRedisConnection()` / `redis` 供非 DI 场景（如装饰器、脚本）使用，底层同一条连接。
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  /** 与单例为同一 ioredis 实例 */
  getClient(): Redis {
    if (!isRedisEnabled()) {
      throw new Error('Redis 已关闭，请检查 REDIS_ENABLED 或不要调用 getClient()');
    }
    return getRedisConnection();
  }

  /**
   * 与 {@link getRedisConnection} 为同一单例的快捷别名
   *（`redis` 为 Proxy，行为与 ioredis 一致）。若未启用 Redis 请勿使用。
   */
  get redis() {
    if (!isRedisEnabled()) {
      throw new Error('Redis 已关闭（REDIS_ENABLED=false）');
    }
    return redis;
  }

  async onModuleDestroy() {
    if (isRedisEnabled()) {
      await closeRedisConnection();
    }
  }

  set(key: string, value: string, ttlSec?: number): Promise<'OK' | null> {
    if (!isRedisEnabled()) {
      return Promise.resolve(null);
    }
    if (ttlSec && ttlSec > 0) {
      return getRedisConnection().set(key, value, 'EX', ttlSec);
    }
    return getRedisConnection().set(key, value);
  }

  del(...keys: string[]) {
    if (!isRedisEnabled() || !keys.length) {
      return Promise.resolve(0);
    }
    return getRedisConnection().del(...keys);
  }

  /**
   * 按通配符批量删除 key（用于失效 @Cache 方法缓存）。大 key 集慎用。
   * pattern 与 Redis 一致，例如 `cache:WorkTypeService:getWorkTypesByPage:*`。
   * Redis 未启用或不可用时安全返回 0，不抛错。
   */
  async deleteByPattern(pattern: string): Promise<number> {
    if (!isRedisEnabled() || isRedisInCooldown()) {
      return 0;
    }
    try {
      const r = getRedisConnection();
      let cursor = '0';
      let deleted = 0;
      do {
        const [next, keys] = await r.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        if (keys.length) {
          deleted += await r.del(...keys);
        }
        cursor = next;
      } while (cursor !== '0');
      return deleted;
    } catch {
      return 0;
    }
  }

  /**
   * 见 {@link getOrSetWithLock}：加锁回源、自旋等缓存，用于热点 key 防击穿。
   */
  getOrSetWithLock<T>(
    key: string,
    ttlSec: number,
    fetcher: () => Promise<T>,
    options?: GetOrSetWithLockOptions,
  ) {
    return getOrSetWithLock(key, ttlSec, fetcher, options);
  }
}
