/**
 * Bounded In-Memory LRU + TTL Cache
 * Optimizes resource efficiency by preventing redundant network queries and
 * bounding memory usage via O(1) Least-Recently-Used (LRU) eviction and TTL expiration.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs = 5 * 60 * 1000, maxEntries = 50) {
    this.ttlMs = Math.max(100, ttlMs);
    this.maxEntries = Math.max(1, maxEntries);
  }

  public get(key: string, nowMs = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (nowMs > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Promote accessed entry to most-recently-used (LRU order in Map)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  public set(key: string, value: T, nowMs = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: nowMs + this.ttlMs,
    });
  }

  public clear(): void {
    this.store.clear();
  }

  public size(): number {
    return this.store.size;
  }
}
