import { AppError } from "./errors";

/**
 * Fixed-window in-memory rate limiter for sensitive actions.
 * PRODUCTION: replace the Map with a shared store (e.g. Redis) when running
 * more than one server instance.
 */
type Bucket = { count: number; resetAt: number };
const g = globalThis as unknown as { __amanRate?: Map<string, Bucket> };
const buckets = (g.__amanRate ??= new Map<string, Bucket>());

export function checkRateLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

export function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  if (!checkRateLimit(key, limit, windowSeconds)) throw new AppError("rate_limited", 429);
}

export function resetRateLimits() {
  buckets.clear();
}
