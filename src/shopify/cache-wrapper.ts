import { logger } from '../utils/logger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache wrapper with random delays to prevent API rate limiting
 * Implements 1-3 second delays and simple in-memory caching
 */
export class CacheWrapper<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly cacheTTL: number;

  constructor(cacheTTLSeconds: number = 60) {
    this.cacheTTL = cacheTTLSeconds * 1000;
  }

  /**
   * Random delay between min and max milliseconds
   */
  private async randomDelay(minMs: number = 1000, maxMs: number = 3000): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    logger.debug(`Adding ${delay}ms delay to prevent API overwhelming`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Get cached value or execute function with delay
   */
  async get(
    key: string,
    fn: () => Promise<T>,
    skipDelay: boolean = false
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTTL) {
      logger.debug(`Cache hit for key: ${key}`);
      return cached.data;
    }

    // Add random delay to prevent overwhelming the API
    if (!skipDelay) {
      await this.randomDelay();
    }

    // Execute function and cache result
    logger.debug(`Cache miss for key: ${key}, fetching fresh data`);
    const data = await fn();

    this.cache.set(key, {
      data,
      timestamp: now,
    });

    return data;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    logger.debug('Clearing cache');
    this.cache.clear();
  }

  /**
   * Clear specific cache entry
   */
  clearKey(key: string): void {
    logger.debug(`Clearing cache for key: ${key}`);
    this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
