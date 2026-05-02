/**
 * 进程内单例 ioredis 连接。
 *
 * 在 Nest 中请优先通过 {@link RedisService} 注入；装饰器、脚本、工具函数可使用
 * `getRedisConnection()` 或 `redis` 代理，底层为同一套连接，避免重复建连。
 */
import Redis from 'ioredis';
import { getRedisOptions, isRedisEnabled } from './redis.config';

let _client: Redis | undefined;
let _errorHandlerAttached: boolean;

/**
 * 获取（或创建）与 Redis 的单例连接。首次在运行期拉取，避免在模块 import 阶段读不到 dotenv 的问题。
 * 若 {@link isRedisEnabled} 为 false，会抛出，调用方应在使用前判断。
 */
export function getRedisConnection(): Redis {
  if (!isRedisEnabled()) {
    throw new Error(
      'Redis 已关闭（REDIS_ENABLED=false），请检查 isRedisEnabled() 或勿调用 get Redis',
    );
  }
  if (!_client) {
    _client = new Redis(getRedisOptions());
    if (!_errorHandlerAttached) {
      _errorHandlerAttached = true;
      _client.on('error', () => {
        // 仅避免未监听的 'error' 在控制台刷栈；读写在装饰器/Service 中另有 try/catch 降级
      });
    }
  }
  return _client;
}

/**
 * 在应用优雅退出时释放连接；测试或热重载时也可显式调用。
 */
export function closeRedisConnection(): Promise<string | void> {
  if (!_client) {
    return Promise.resolve();
  }
  return _client.quit().finally(() => {
    _client = undefined;
  });
}

/**
 * 与 ioredis 实例行为一致的代理，支持 `import { redis }` 后直接使用 `redis.get()` 等。
 * 与 {@link getRedisConnection()} 为同一单例，勿在外部 `quit` 后忘记录制周期。
 */
export const redis: Redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    const c = getRedisConnection();
    const v = Reflect.get(c as object, prop, receiver);
    if (typeof v === 'function') {
      return (v as (...a: any[]) => any).bind(c);
    }
    return v;
  },
});
