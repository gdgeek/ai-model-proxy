import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { JobStatus } from '../types';
import { ExternalServiceError } from '../types/errors';

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password || undefined,
      database: config.redis.db,
    });

    // 只在非测试环境中设置事件处理器
    if (process.env['NODE_ENV'] !== 'test') {
      this.setupEventHandlers();
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.isConnected = false;
    });
  }

  /**
   * 连接到Redis
   */
  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
        logger.info('Connected to Redis successfully');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw new ExternalServiceError('Redis', '连接失败', error);
    }
  }

  /**
   * 缓存作业状态
   */
  async cacheJobStatus(jobId: string, status: JobStatus, ttl: number = 3600): Promise<void> {
    try {
      await this.ensureConnected();
      
      const key = this.getJobStatusKey(jobId);
      const value = JSON.stringify(status);
      
      await this.client.setEx(key, ttl, value);
      
      logger.debug('Job status cached:', {
        jobId,
        status: status.status,
        ttl,
      });
    } catch (error) {
      logger.error('Failed to cache job status:', error);
      throw new ExternalServiceError('Redis', '缓存作业状态失败', error);
    }
  }

  /**
   * 获取缓存的作业状态
   */
  async getCachedJobStatus(jobId: string): Promise<JobStatus | null> {
    try {
      await this.ensureConnected();
      
      const key = this.getJobStatusKey(jobId);
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      const status = JSON.parse(value) as JobStatus;
      
      // 转换日期字符串回Date对象
      status.createdAt = new Date(status.createdAt);
      status.updatedAt = new Date(status.updatedAt);
      if (status.completedAt) {
        status.completedAt = new Date(status.completedAt);
      }
      if (status.error?.timestamp) {
        status.error.timestamp = new Date(status.error.timestamp);
      }

      logger.debug('Job status retrieved from cache:', {
        jobId,
        status: status.status,
      });

      return status;
    } catch (error) {
      logger.error('Failed to get cached job status:', error);
      // 缓存错误不应该阻止应用程序运行
      return null;
    }
  }

  /**
   * 清除作业缓存
   */
  async clearJobCache(jobId: string): Promise<void> {
    try {
      await this.ensureConnected();
      
      const key = this.getJobStatusKey(jobId);
      await this.client.del(key);
      
      logger.debug('Job cache cleared:', { jobId });
    } catch (error) {
      logger.error('Failed to clear job cache:', error);
      throw new ExternalServiceError('Redis', '清除作业缓存失败', error);
    }
  }

  /**
   * 设置通用缓存
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.ensureConnected();
      
      const serializedValue = JSON.stringify(value);
      
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      logger.debug('Cache set:', { key, ttl });
    } catch (error) {
      logger.error('Failed to set cache:', error);
      throw new ExternalServiceError('Redis', '设置缓存失败', error);
    }
  }

  /**
   * 获取通用缓存
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      await this.ensureConnected();
      
      const value = await this.client.get(key);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to get cache:', error);
      return null;
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.del(key);
      logger.debug('Cache deleted:', { key });
    } catch (error) {
      logger.error('Failed to delete cache:', error);
      throw new ExternalServiceError('Redis', '删除缓存失败', error);
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      await this.ensureConnected();
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Failed to check cache existence:', error);
      return false;
    }
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.expire(key, ttl);
      logger.debug('Cache expiration set:', { key, ttl });
    } catch (error) {
      logger.error('Failed to set cache expiration:', error);
      throw new ExternalServiceError('Redis', '设置缓存过期时间失败', error);
    }
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    try {
      await this.ensureConnected();
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Failed to get cache TTL:', error);
      return -1;
    }
  }

  /**
   * 清除所有缓存
   */
  async flushAll(): Promise<void> {
    try {
      await this.ensureConnected();
      await this.client.flushDb();
      logger.info('All cache cleared');
    } catch (error) {
      logger.error('Failed to flush cache:', error);
      throw new ExternalServiceError('Redis', '清除所有缓存失败', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<any> {
    try {
      await this.ensureConnected();
      const info = await this.client.info('memory');
      return this.parseRedisInfo(info);
    } catch (error) {
      logger.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.ensureConnected();
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.warn('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * 确保连接
   */
  private async ensureConnected(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  /**
   * 获取作业状态缓存键
   */
  private getJobStatusKey(jobId: string): string {
    return `job:status:${jobId}`;
  }

  /**
   * 解析Redis信息
   */
  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const result: any = {};
    
    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(Number(value)) ? value : Number(value);
        }
      }
    }
    
    return result;
  }

  /**
   * 批量操作
   */
  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      await this.ensureConnected();
      return await this.client.mGet(keys);
    } catch (error) {
      logger.error('Failed to get multiple cache values:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async mset(keyValues: Record<string, any>): Promise<void> {
    try {
      await this.ensureConnected();
      
      const serializedKeyValues: Record<string, string> = {};
      for (const [key, value] of Object.entries(keyValues)) {
        serializedKeyValues[key] = JSON.stringify(value);
      }
      
      await this.client.mSet(serializedKeyValues);
      logger.debug('Multiple cache values set:', { count: Object.keys(keyValues).length });
    } catch (error) {
      logger.error('Failed to set multiple cache values:', error);
      throw new ExternalServiceError('Redis', '批量设置缓存失败', error);
    }
  }

  /**
   * 断开Redis连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        this.isConnected = false;
        logger.info('Redis client disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Redis client:', error);
      throw new ExternalServiceError('Redis断开连接失败', 'REDIS_DISCONNECT_ERROR');
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出单例实例
export const cacheService = new CacheService();