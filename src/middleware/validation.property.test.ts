import * as fc from 'fast-check';
import { validateJobId, validateToken, validateImageFile, validateTextInput } from './validation';

/**
 * 属性1：输入验证一致性
 * 对于任何客户端请求，系统应当根据输入类型（图片、文本、令牌）应用相应的验证规则，
 * 接受有效输入并拒绝无效输入，返回适当的错误消息
 * 验证需求：1.1, 1.2, 1.3, 1.4
 */
describe('Feature: ai-model-proxy, Property 1: 输入验证一致性', () => {
  describe('令牌验证', () => {
    it('应当接受有效的令牌格式', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 100 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
          validToken => {
            expect(validateToken(validToken)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当拒绝无效的令牌格式', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''), // 空字符串
            fc.string({ maxLength: 5 }), // 太短
            fc.string({ minLength: 101 }), // 太长
            fc.string().filter(s => /[^a-zA-Z0-9_-]/.test(s)), // 包含无效字符
            fc.constant(null),
            fc.constant(undefined)
          ),
          invalidToken => {
            expect(validateToken(invalidToken as any)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('作业ID验证', () => {
    it('应当接受有效的UUID格式', () => {
      fc.assert(
        fc.property(fc.uuid(), validJobId => {
          expect(validateJobId(validJobId)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('应当拒绝无效的作业ID格式', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.string({ maxLength: 10 }),
            fc
              .string()
              .filter(
                s => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
              ),
            fc.constant(null),
            fc.constant(undefined)
          ),
          invalidJobId => {
            expect(validateJobId(invalidJobId as any)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('文本输入验证', () => {
    it('应当接受有效的文本输入', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          validText => {
            expect(validateTextInput(validText)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当拒绝无效的文本输入', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '), // 只有空格
            fc.string({ minLength: 1001 }), // 太长
            fc.constant(null),
            fc.constant(undefined)
          ),
          invalidText => {
            expect(validateTextInput(invalidText as any)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('图片文件验证', () => {
    it('应当接受支持的图片格式', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('image/jpeg'), fc.constant('image/png'), fc.constant('image/webp')),
          fc.integer({ min: 1, max: 1048576 }), // 1B to 1MB (test environment limit)
          (mimeType, size) => {
            const mockFile = {
              mimetype: mimeType,
              size: size,
              buffer: Buffer.alloc(Math.min(size, 1000)), // 避免分配过大内存
              originalname: 'test.jpg',
            };
            expect(validateImageFile(mockFile as any)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('应当拒绝不支持的文件格式或大小', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // 不支持的MIME类型
            fc.record({
              mimetype: fc.oneof(
                fc.constant('image/gif'),
                fc.constant('text/plain'),
                fc.constant('application/pdf'),
                fc.constant('video/mp4')
              ),
              size: fc.integer({ min: 1, max: 1024 * 1024 }),
              buffer: fc.constant(Buffer.alloc(100)),
              originalname: fc.constant('test.file'),
            }),
            // 文件太大
            fc.record({
              mimetype: fc.constant('image/jpeg'),
              size: fc.integer({ min: 1048577, max: 10 * 1024 * 1024 }), // 超过1MB测试限制
              buffer: fc.constant(Buffer.alloc(100)),
              originalname: fc.constant('test.jpg'),
            }),
            // 空文件
            fc.record({
              mimetype: fc.constant('image/jpeg'),
              size: fc.constant(0),
              buffer: fc.constant(Buffer.alloc(0)),
              originalname: fc.constant('test.jpg'),
            })
          ),
          invalidFile => {
            expect(validateImageFile(invalidFile as any)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
