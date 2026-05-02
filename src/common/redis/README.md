# Redis 缓存层

## 1. 安装与配置

- 已依赖 `ioredis`。
- 在 `.env` 或环境变量中可设置（不设置则用默认值）：

| 变量            | 默认        | 说明     |
| --------------- | ----------- | -------- |
| `REDIS_ENABLED` | 未设视为 `true` | 设为 `false` / `0` 时**不连 Redis**，`@Cache` 自动降级为直接查库（本机没装 Redis 时可用） |
| `REDIS_HOST`    | 127.0.0.1   | 主机     |
| `REDIS_PORT`    | 6379        | 端口     |
| `REDIS_PASSWORD` | 无         | 密码     |
| `REDIS_DB`      | 0           | 逻辑库号 |

- 在根模块中已 `imports: [ RedisModule, ... ]` 后，全模块可注入 `RedisService`。
- 若**未**启动 Redis 却保持 `REDIS_ENABLED=true`（默认），前几次读缓存会尝试连 Redis，已做「快失败 + 短熔断」，连续失败后约 15s 内会直连库；**本地开发不装 Redis 时建议** `REDIS_ENABLED=false`，避免首包仍等待约 1s 量级的连接超时。

## 2. 注入 `RedisService` 使用

```ts
import { RedisService } from 'src/common/redis';

@Injectable()
export class XxxService {
  constructor(private readonly redisService: RedisService) {}

  async read(key: string) {
    return this.redisService.getClient().get(key);
    // 或: this.redisService.redis.get(key)
  }
}
```

## 3. 方法装饰器（推荐与现有 Service 搭配）

```ts
import { Cache, CacheWithLock } from 'src/common/redis';

@Injectable()
export class UserService {
  // 简单缓存 60 秒
  @Cache(60)
  async getList() {
    return this.someRepo.find();
  }

  // 热点防击穿，缓存 60 秒，内部走加锁 + 自旋
  @CacheWithLock(120, { lockTtl: 5, maxWaitMs: 3000 })
  async getHotItem(id: number) {
    return this.someRepo.findOneBy({ id });
  }
}
```

- 仅适用于**能 JSON 序列化**的返回值；`@Cache(60, true)` 为加锁回源，第三个参数可传锁与自旋选项，与 `CacheWithLock(60, { ... })` 相同用途。

## 4. 非装饰器：手动防击穿

```ts
import { getOrSetWithLock } from 'src/common/redis';

const data = await getOrSetWithLock(
  'my:key',
  60, // 缓存秒数
  () => this.loadFromDb(),
  { lockTtl: 5, maxWaitMs: 3000, intervalMs: 50 },
);
```

## 5. 与单例 `redis` 的关系

- `getRedisConnection()` 与 `RedisService` / `import { redis }` 为**同一条**进程内连接；应用关闭时由 `RedisService.onModuleDestroy` 负责 `quit`。
- 脚本或极薄工具里可直接 `import { redis } from 'src/common/redis'`，与 Nest 中注入的服务一致。

## 6. 注意事项

- 装饰器不会自动感知 TypeORM/事务边界，在事务中若需与 DB 强一致，请慎用缓存或自己失效 key。
- 复杂参数作键时，建议手写稳定 key 或不用装饰器、改用 `getOrSetWithLock('prefix:id', ...)`。
