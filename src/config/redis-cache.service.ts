import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import 'dotenv/config';
import { Redis } from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleInit {
  private redisClient: Redis;
  private readonly logger = new Logger(RedisCacheService.name);

  constructor() {
    const obj = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
    this.redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        this.logger.warn(`Redis connection  retry in ${delay}ms...`, obj);
        return delay;
      },
    });
  }

  onModuleInit() {
    this.redisClient.on('error', (err) => {
      this.logger.error('Redis client error:', err);
    });

    this.redisClient.on('connect', () => {
      this.logger.log('Redis client connected successfully');
    });

    this.redisClient.on('reconnecting', () => {
      this.logger.warn('Redis client reconnecting...');
    });
  }

  /**
   * Set a value in Redis cache
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds (optional)
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      if (ttl) {
        await this.redisClient.set(key, stringValue, 'EX', ttl);
      } else {
        await this.redisClient.set(key, stringValue);
      }
      this.logger.debug(`Cache set: ${key}`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a value from Redis cache
   * @param key - The cache key
   * @param parseJson - Whether to parse the result as JSON
   */
  async get(key: string, parseJson = true): Promise<any> {
    try {
      const value = await this.redisClient.get(key);

      if (!value) {
        this.logger.debug(`Cache miss: ${key}`);
        return null;
      }

      this.logger.debug(`Cache hit: ${key}`);

      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch (e) {
          return value;
        }
      }

      return value;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a key from Redis cache
   * @param key - The cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.redisClient.del(key);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting cache for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if a key exists in Redis cache
   * @param key - The cache key
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisClient.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration time for a key
   * @param key - The cache key
   * @param seconds - Time in seconds
   */
  async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redisClient.expire(key, seconds);
    } catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get the Redis client instance
   */
  getClient(): Redis {
    return this.redisClient;
  }
}
