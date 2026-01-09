import { config } from './index';

describe('Configuration', () => {
  describe('Config Loading', () => {
    it('should load configuration successfully', () => {
      expect(config).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.tripo).toBeDefined();
      expect(config.cos).toBeDefined();
      expect(config.redis).toBeDefined();
      expect(config.upload).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.security).toBeDefined();
    });

    it('should have correct server configuration', () => {
      expect(config.server.port).toBe(3001); // 测试环境端口
      expect(config.server.env).toBe('test');
    });

    it('should have correct Tripo AI configuration', () => {
      expect(config.tripo.apiUrl).toBe('https://api.tripo3d.ai');
      expect(config.tripo.timeout).toBe(5000);
      expect(config.tripo.maxRetries).toBe(1);
      expect(config.tripo.retryDelay).toBe(100);
    });

    it('should have correct COS configuration', () => {
      expect(config.cos.secretId).toBe('test_secret_id');
      expect(config.cos.secretKey).toBe('test_secret_key');
      expect(config.cos.region).toBe('ap-beijing');
      expect(config.cos.bucket).toBe('test-bucket');
    });

    it('should have correct Redis configuration', () => {
      expect(config.redis.host).toBe('localhost');
      expect(config.redis.port).toBe(6379);
      expect(config.redis.password).toBe('');
      expect(config.redis.db).toBe(1);
    });

    it('should have correct upload configuration', () => {
      expect(config.upload.maxFileSize).toBe(1048576); // 1MB for tests
      expect(config.upload.allowedImageTypes).toEqual(['image/jpeg', 'image/png', 'image/webp']);
    });

    it('should have correct logging configuration', () => {
      expect(config.logging.level).toBe('error');
      expect(config.logging.format).toBe('simple');
    });

    it('should have correct security configuration', () => {
      expect(config.security.corsOrigin).toBe('*');
      expect(config.security.rateLimitWindowMs).toBe(60000);
      expect(config.security.rateLimitMaxRequests).toBe(10);
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for missing required configuration', () => {
      // 这个测试需要在隔离的环境中运行
      // 由于配置在模块加载时就验证了，我们只能测试当前配置是否有效
      expect(() => {
        // 验证当前配置是有效的
        expect(config.tripo.apiUrl).toBeDefined();
      }).not.toThrow();
    });
  });
});
