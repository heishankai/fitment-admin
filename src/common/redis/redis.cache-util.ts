/**
 * 供装饰器与业务 Service 复用的“读缓存 / 加锁回源 / 自旋等缓存”等逻辑，避免在多处写重复的 SET NX。
 */
import { isRedisEnabled } from './redis.config';
import {
  clearRedisCoolDown,
  isRedisInCooldown,
  markRedisCoolDown,
} from './redis.circuit';
import { getRedisConnection } from './redis.connection';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type GetOrSetWithLockOptions = {
  /** 缓存未命中时加锁的秒数，默认 5 */
  lockTtl?: number;
  /** 等别人回源时最多等待毫秒，默认 3000 */
  maxWaitMs?: number;
  /** 自旋间隔毫秒，默认 50 */
  intervalMs?: number;
};

const safeStringify = (v: unknown) => JSON.stringify(v);

const safeParse = (raw: string) => JSON.parse(raw) as unknown;

/**
 * 防缓存击穿：先读缓存，未命中时尝试加锁，持锁方查库并写入缓存后释放；未抢到锁的协程自旋重读缓存，超时后最后一次直接执行 fetcher（可选降级）。
 * Redis 不可用或未启用时，直接执行 fetcher。
 */
export async function getOrSetWithLock<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>,
  options?: GetOrSetWithLockOptions,
): Promise<T> {
  if (!isRedisEnabled()) {
    return fetcher();
  }
  if (isRedisInCooldown()) {
    return fetcher();
  }
  const lockTtl = options?.lockTtl ?? 5;
  const maxWaitMs = options?.maxWaitMs ?? 3000;
  const intervalMs = options?.intervalMs ?? 50;
  const lockKey = `lock:${key}`;

  try {
    const r = getRedisConnection();
    const hit = await r.get(key);
    if (hit) {
      clearRedisCoolDown();
      return safeParse(hit) as T;
    }

    const gotLock = await r.set(lockKey, '1', 'EX', lockTtl, 'NX');
    if (gotLock === 'OK') {
      try {
        const data = await fetcher();
        await r.set(key, safeStringify(data), 'EX', ttlSec);
        clearRedisCoolDown();
        return data;
      } finally {
        await r.del(lockKey);
      }
    }

    const deadline = Date.now() + maxWaitMs;
    while (Date.now() < deadline) {
      await sleep(intervalMs);
      const again = await r.get(key);
      if (again) {
        clearRedisCoolDown();
        return safeParse(again) as T;
      }
    }

    return fetcher();
  } catch {
    markRedisCoolDown();
    return fetcher();
  }
}
