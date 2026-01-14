/**
 * Property-Based Tests for Configuration Management
 * Feature: ai-model-proxy, Property 8: 配置管理有效性
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import * as fc from 'fast-check';

describe('Property 8: 配置管理有效性', () => {
  interface AppConfig {
    port: number;
    host: string;
    nodeEnv: string;
    tripoApiUrl: string;
    tripoApiTimeout: number;
    tripoMaxRetries: number;
    tripoRetryDelay: number;
    redisHost: string;
    redisPort: number;
    maxFileSize: number;
    allowedImageTypes: string[];
    logLevel: string;
    corsOrigin: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  }

  /**
   * 验证配置对象的有效性
   */
  function validateConfig(config: Partial<AppConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 端口验证
    if (config.port !== undefined) {
      if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        errors.push('Port must be between 1 and 65535');
      }
    }

    // 主机验证
    if (config.host !== undefined) {
      if (typeof config.host !== 'string' || config.host.trim() === '') {
        errors.push('Host must be a non-empty string');
      }
    }

    // 环境验证
    if (config.nodeEnv !== undefined) {
      const validEnvs = ['development', 'production', 'test'];
      if (!validEnvs.includes(config.nodeEnv)) {
        errors.push('NodeEnv must be development, production, or test');
      }
    }

    // API URL验证
    if (config.tripoApiUrl !== undefined) {
      try {
        new URL(config.tripoApiUrl);
      } catch {
        errors.push('TripoApiUrl must be a valid URL');
      }
    }

    // 超时验证
    if (config.tripoApiTimeout !== undefined) {
      if (!Number.isInteger(config.tripoApiTimeout) || config.tripoApiTimeout < 1000) {
        errors.push('TripoApiTimeout must be at least 1000ms');
      }
    }

    // 重试次数验证
    if (config.tripoMaxRetries !== undefined) {
      if (!Number.isInteger(config.tripoMaxRetries) || config.tripoMaxRetries < 0) {
        errors.push('TripoMaxRetries must be a non-negative integer');
      }
    }

    // 重试延迟验证
    if (config.tripoRetryDelay !== undefined) {
      if (!Number.isInteger(config.tripoRetryDelay) || config.tripoRetryDelay < 0) {
        errors.push('TripoRetryDelay must be a non-negative integer');
      }
    }

    // Redis主机验证
    if (config.redisHost !== undefined) {
      if (typeof config.redisHost !== 'string' || config.redisHost.trim() === '') {
        errors.push('RedisHost must be a non-empty string');
      }
    }

    // Redis端口验证
    if (config.redisPort !== undefined) {
      if (!Number.isInteger(config.redisPort) || config.redisPort < 1 || config.redisPort > 65535) {
        errors.push('RedisPort must be between 1 and 65535');
      }
    }

    // 文件大小验证
    if (config.maxFileSize !== undefined) {
      if (!Number.isInteger(config.maxFileSize) || config.maxFileSize < 1) {
        errors.push('MaxFileSize must be a positive integer');
      }
    }

    // 图片类型验证
    if (config.allowedImageTypes !== undefined) {
      if (!Array.isArray(config.allowedImageTypes) || config.allowedImageTypes.length === 0) {
        errors.push('AllowedImageTypes must be a non-empty array');
      }
    }

    // 日志级别验证
    if (config.logLevel !== undefined) {
      const validLevels = ['error', 'warn', 'info', 'debug'];
      if (!validLevels.includes(config.logLevel)) {
        errors.push('LogLevel must be error, warn, info, or debug');
      }
    }

    // 速率限制验证
    if (config.rateLimitWindowMs !== undefined) {
      if (!Number.isInteger(config.rateLimitWindowMs) || config.rateLimitWindowMs < 1000) {
        errors.push('RateLimitWindowMs must be at least 1000ms');
      }
    }

    if (config.rateLimitMaxRequests !== undefined) {
      if (!Number.isInteger(config.rateLimitMaxRequests) || config.rateLimitMaxRequests < 1) {
        errors.push('RateLimitMaxRequests must be a positive integer');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  describe('端口配置验证', () => {
    test('对于任何有效的端口号（1-65535），应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 65535 }), port => {
          const result = validateConfig({ port });
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何无效的端口号，应当拒绝', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }),
            fc.integer({ min: 65536 }),
            fc.constant(NaN),
            fc.constant(Infinity)
          ),
          port => {
            const result = validateConfig({ port: port as number });
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('环境配置验证', () => {
    test('对于任何有效的环境值，应当接受', () => {
      fc.assert(
        fc.property(fc.constantFrom('development', 'production', 'test'), nodeEnv => {
          const result = validateConfig({ nodeEnv });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何无效的环境值，应当拒绝', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['development', 'production', 'test'].includes(s)),
          nodeEnv => {
            const result = validateConfig({ nodeEnv });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('URL配置验证', () => {
    test('对于任何有效的HTTP/HTTPS URL，应当接受', () => {
      fc.assert(
        fc.property(fc.webUrl({ validSchemes: ['http', 'https'] }), url => {
          const result = validateConfig({ tripoApiUrl: url });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何无效的URL格式，应当拒绝', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('not-a-url'),
            fc.constant('ftp://invalid-scheme.com'),
            fc.string().filter(s => {
              try {
                new URL(s);
                return false;
              } catch {
                return true;
              }
            })
          ),
          url => {
            const result = validateConfig({ tripoApiUrl: url });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('超时和重试配置验证', () => {
    test('对于任何有效的超时值（>=1000ms），应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1000, max: 300000 }), timeout => {
          const result = validateConfig({ tripoApiTimeout: timeout });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何小于1000ms的超时值，应当拒绝', () => {
      fc.assert(
        fc.property(fc.integer({ max: 999 }), timeout => {
          const result = validateConfig({ tripoApiTimeout: timeout });
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何有效的重试次数（>=0），应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 10 }), retries => {
          const result = validateConfig({ tripoMaxRetries: retries });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何负数的重试次数，应当拒绝', () => {
      fc.assert(
        fc.property(fc.integer({ max: -1 }), retries => {
          const result = validateConfig({ tripoMaxRetries: retries });
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Redis配置验证', () => {
    test('对于任何有效的Redis主机名，应当接受', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('localhost'), fc.constant('127.0.0.1'), fc.domain(), fc.ipV4()),
          host => {
            const result = validateConfig({ redisHost: host });
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('对于任何空字符串的Redis主机名，应当拒绝', () => {
      fc.assert(
        fc.property(fc.constant(''), host => {
          const result = validateConfig({ redisHost: host });
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何有效的Redis端口，应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 65535 }), port => {
          const result = validateConfig({ redisPort: port });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('文件上传配置验证', () => {
    test('对于任何正整数的文件大小限制，应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 * 1024 * 1024 }), size => {
          const result = validateConfig({ maxFileSize: size });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何零或负数的文件大小限制，应当拒绝', () => {
      fc.assert(
        fc.property(fc.integer({ max: 0 }), size => {
          const result = validateConfig({ maxFileSize: size });
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何非空的图片类型数组，应当接受', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('image/jpeg', 'image/png', 'image/webp'), {
            minLength: 1,
            maxLength: 10,
          }),
          types => {
            const result = validateConfig({ allowedImageTypes: types });
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('对于任何空数组的图片类型，应当拒绝', () => {
      const result = validateConfig({ allowedImageTypes: [] });
      expect(result.valid).toBe(false);
    });
  });

  describe('日志配置验证', () => {
    test('对于任何有效的日志级别，应当接受', () => {
      fc.assert(
        fc.property(fc.constantFrom('error', 'warn', 'info', 'debug'), level => {
          const result = validateConfig({ logLevel: level });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何无效的日志级别，应当拒绝', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !['error', 'warn', 'info', 'debug'].includes(s)),
          level => {
            const result = validateConfig({ logLevel: level });
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('速率限制配置验证', () => {
    test('对于任何有效的速率限制窗口（>=1000ms），应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1000, max: 3600000 }), windowMs => {
          const result = validateConfig({ rateLimitWindowMs: windowMs });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    test('对于任何有效的最大请求数（>0），应当接受', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), maxRequests => {
          const result = validateConfig({ rateLimitMaxRequests: maxRequests });
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('完整配置验证', () => {
    test('对于任何完整且有效的配置对象，应当接受', () => {
      fc.assert(
        fc.property(
          fc.record({
            port: fc.integer({ min: 1, max: 65535 }),
            host: fc.constantFrom('localhost', '0.0.0.0', '127.0.0.1'),
            nodeEnv: fc.constantFrom('development', 'production', 'test'),
            tripoApiUrl: fc.webUrl({ validSchemes: ['https'] }),
            tripoApiTimeout: fc.integer({ min: 1000, max: 60000 }),
            tripoMaxRetries: fc.integer({ min: 0, max: 5 }),
            tripoRetryDelay: fc.integer({ min: 0, max: 5000 }),
            redisHost: fc.constantFrom('localhost', '127.0.0.1'),
            redisPort: fc.integer({ min: 1, max: 65535 }),
            maxFileSize: fc.integer({ min: 1, max: 50 * 1024 * 1024 }),
            allowedImageTypes: fc.array(fc.constantFrom('image/jpeg', 'image/png', 'image/webp'), {
              minLength: 1,
              maxLength: 3,
            }),
            logLevel: fc.constantFrom('error', 'warn', 'info', 'debug'),
            corsOrigin: fc.string(),
            rateLimitWindowMs: fc.integer({ min: 1000, max: 3600000 }),
            rateLimitMaxRequests: fc.integer({ min: 1, max: 1000 }),
          }),
          config => {
            const result = validateConfig(config);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
