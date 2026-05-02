/**
 * Redis 连续失败后的短暂冷却：冷却期内不访问 Redis，直接走业务，避免每请求都卡在连接/重试上。
 */
let coolDownUntil = 0;
const DEFAULT_COOLDOWN_MS = 15_000;

export function isRedisInCooldown(): boolean {
  return Date.now() < coolDownUntil;
}

export function markRedisCoolDown(ms: number = DEFAULT_COOLDOWN_MS): void {
  coolDownUntil = Date.now() + ms;
}

export function clearRedisCoolDown(): void {
  coolDownUntil = 0;
}
