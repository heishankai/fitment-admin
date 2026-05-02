import { isRedisEnabled } from './redis.config';
import {
  getOrSetWithLock,
  type GetOrSetWithLockOptions,
} from './redis.cache-util';
import {
  clearRedisCoolDown,
  isRedisInCooldown,
  markRedisCoolDown,
} from './redis.circuit';
import { getRedisConnection } from './redis.connection';

function keyPart(args: any[]) {
  try {
    return JSON.stringify(args);
  } catch {
    return String(args);
  }
}

/**
 * 方法级“读缓存、未命中再执行原方法并回写”的装饰器，适用于 Service 的异步方法。
 *
 * 使用前提：所在类所在模块已导入 {@link RedisModule}（全局或当前模块 import）。
 *
 * 注意：
 * - 仅适合返回值可被 `JSON.parse(JSON.stringify())` 还原的数据；含 Date/BigInt/类实例等会失真。
 * - 缓存键包含类名、方法名与参数序列，参数对象键顺序不固定时可能产生重复键，复杂场景请手写 key。
 *
 * @param ttlSec 缓存过期秒数，默认 60
 * @param useLock 为 true 时使用防击穿加锁回源，默认 false。也可直接使用 {@link CacheWithLock}。
 *
 * @example
 * ```ts
 * import { Cache } from 'src/common/redis';
 *
 * @Cache(60)
 * async getUserList() { return this.repo.find(); }
 * ```
 */
export function Cache(
  ttlSec = 60,
  useLock = false,
  lockOptions?: GetOrSetWithLockOptions,
) {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;
    if (typeof original !== 'function') {
      throw new Error('@Cache 只能用在方法上');
    }

    const className = target.constructor.name;

    descriptor.value = async function (this: unknown, ...args: any[]) {
      const run = () => original.apply(this, args) as Promise<unknown>;
      const baseKey = `cache:${className}:${propertyKey}:${keyPart(args)}`;
      if (useLock) {
        return getOrSetWithLock(
          baseKey,
          ttlSec,
          run,
          lockOptions,
        ) as ReturnType<typeof original>;
      }
      if (!isRedisEnabled()) {
        return run() as ReturnType<typeof original>;
      }
      if (isRedisInCooldown()) {
        return run() as ReturnType<typeof original>;
      }
      try {
        const r = getRedisConnection();
        const hit = await r.get(baseKey);
        if (hit) {
          try {
            clearRedisCoolDown();
            return JSON.parse(hit) as ReturnType<typeof original>;
          } catch {
            // 脏数据时回源
          }
        }
        const result = (await run()) as object;
        try {
          await r.set(baseKey, JSON.stringify(result), 'EX', ttlSec);
          clearRedisCoolDown();
        } catch {
          markRedisCoolDown();
        }
        return result;
      } catch {
        markRedisCoolDown();
        return run() as ReturnType<typeof original>;
      }
    };
  };
}

/**
 * 与 {@link Cache} 相同，但固定使用防击穿加锁回源，适合高并发下同一 key 的读多写少。
 *
 * @param ttlSec 缓存秒数
 * @param options 传给 getOrSetWithLock 的锁时长、自旋等待等
 */
export function CacheWithLock(
  ttlSec: number,
  options?: GetOrSetWithLockOptions,
) {
  return (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;
    if (typeof original !== 'function') {
      throw new Error('@CacheWithLock 只能用在方法上');
    }
    const className = target.constructor.name;
    descriptor.value = async function (this: unknown, ...args: any[]) {
      const baseKey = `cache:${className}:${propertyKey}:${keyPart(args)}`;
      return getOrSetWithLock(
        baseKey,
        ttlSec,
        () => original.apply(this, args) as Promise<unknown>,
        options,
      ) as ReturnType<typeof original>;
    };
  };
}
