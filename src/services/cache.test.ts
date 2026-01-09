// 模拟Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    set: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    flushDb: jest.fn(),
    info: jest.fn(),
    ping: jest.fn(),
    mGet: jest.fn(),
    mSet: jest.fn(),
    on: jest.fn(),
  })),
}));

import { CacheService } from './cache';
import { JobStatus } from '../types';

describe('CacheService', () => {
  let cacheService: CacheService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheService = new CacheService();
    mockRedisClient = (cacheService as any).client;
    // 模拟连接状态
    (cacheService as any).isConnected = true;
  });

  describe('Job Status Caching', () => {
    const mockJobStatus: JobStatus = {
      jobId: 'test-job-123',
      status: 'processing',
      progress: 50,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:05:00Z'),
    };

    it('should cache job status successfully', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.cacheJobStatus('test-job-123', mockJobStatus, 3600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'job:status:test-job-123',
        3600,
        JSON.stringify(mockJobStatus)
      );
    });

    it('should retrieve cached job status', async () => {
      const cachedData = JSON.stringify(mockJobStatus);
      mockRedisClient.get.mockResolvedValue(cachedData);

      const result = await cacheService.getCachedJobStatus('test-job-123');

      expect(mockRedisClient.get).toHaveBeenCalledWith('job:status:test-job-123');
      expect(result).toEqual(
        expect.objectContaining({
          jobId: 'test-job-123',
          status: 'processing',
          progress: 50,
        })
      );
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent job status', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.getCachedJobStatus('non-existent');

      expect(result).toBeNull();
    });

    it('should clear job cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.clearJobCache('test-job-123');

      expect(mockRedisClient.del).toHaveBeenCalledWith('job:status:test-job-123');
    });

    it('should handle cache errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.getCachedJobStatus('test-job-123');

      expect(result).toBeNull();
    });
  });

  describe('General Caching', () => {
    it('should set cache with TTL', async () => {
      const testData = { key: 'value', number: 123 };
      mockRedisClient.setEx.mockResolvedValue('OK');

      await cacheService.set('test-key', testData, 300);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData));
    });

    it('should set cache without TTL', async () => {
      const testData = { key: 'value' };
      mockRedisClient.set.mockResolvedValue('OK');

      await cacheService.set('test-key', testData);

      expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData));
    });

    it('should get cached data', async () => {
      const testData = { key: 'value', number: 123 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('non-existent');

      expect(result).toBeNull();
    });

    it('should delete cache', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await cacheService.delete('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
    });

    it('should check if key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test-key');

      expect(mockRedisClient.exists).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await cacheService.exists('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should set expiration time', async () => {
      mockRedisClient.expire.mockResolvedValue(1);

      await cacheService.expire('test-key', 300);

      expect(mockRedisClient.expire).toHaveBeenCalledWith('test-key', 300);
    });

    it('should get TTL', async () => {
      mockRedisClient.ttl.mockResolvedValue(250);

      const result = await cacheService.ttl('test-key');

      expect(mockRedisClient.ttl).toHaveBeenCalledWith('test-key');
      expect(result).toBe(250);
    });

    it('should flush all cache', async () => {
      mockRedisClient.flushDb.mockResolvedValue('OK');

      await cacheService.flushAll();

      expect(mockRedisClient.flushDb).toHaveBeenCalled();
    });

    it('should get cache stats', async () => {
      const mockInfo = 'used_memory:1024\r\nused_memory_human:1K\r\n';
      mockRedisClient.info.mockResolvedValue(mockInfo);

      const result = await cacheService.getStats();

      expect(mockRedisClient.info).toHaveBeenCalledWith('memory');
      expect(result).toEqual({
        used_memory: 1024,
        used_memory_human: '1K',
      });
    });
  });

  describe('Health Check', () => {
    it('should return true for healthy cache', async () => {
      mockRedisClient.ping.mockResolvedValue('PONG');

      const result = await cacheService.healthCheck();

      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false for unhealthy cache', async () => {
      mockRedisClient.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await cacheService.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    it('should get multiple values', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const values = ['value1', 'value2', null];
      mockRedisClient.mGet.mockResolvedValue(values);

      const result = await cacheService.mget(keys);

      expect(mockRedisClient.mGet).toHaveBeenCalledWith(keys);
      expect(result).toEqual(values);
    });

    it('should set multiple values', async () => {
      const keyValues = {
        key1: { data: 'value1' },
        key2: { data: 'value2' },
      };
      const expectedSerializedValues = {
        key1: JSON.stringify({ data: 'value1' }),
        key2: JSON.stringify({ data: 'value2' }),
      };
      mockRedisClient.mSet.mockResolvedValue('OK');

      await cacheService.mset(keyValues);

      expect(mockRedisClient.mSet).toHaveBeenCalledWith(expectedSerializedValues);
    });

    it('should handle batch operation errors', async () => {
      const keys = ['key1', 'key2'];
      mockRedisClient.mGet.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.mget(keys);

      expect(result).toEqual([null, null]);
    });
  });

  describe('Connection Management', () => {
    it('should connect to Redis', async () => {
      (cacheService as any).isConnected = false;
      mockRedisClient.connect.mockResolvedValue(undefined);

      await cacheService.connect();

      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should disconnect from Redis', async () => {
      mockRedisClient.disconnect.mockResolvedValue(undefined);

      await cacheService.disconnect();

      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it('should not connect if already connected', async () => {
      (cacheService as any).isConnected = true;
      mockRedisClient.connect.mockClear();

      await cacheService.connect();

      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });
  });
});
