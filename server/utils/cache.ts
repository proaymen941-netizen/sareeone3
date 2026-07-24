export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;

  constructor(ttlSeconds: number = 300) {
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, value: T): void {
    this.store.set(key, {
      data: value,
      expiresAt: Date.now() + this.ttl
    });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  generateKey(...parts: (string | number | undefined)[]): string {
    return parts.filter(p => p !== undefined).join(':');
  }
}

export const deliveryFeeCache = new Cache(60);
