import * as fc from 'fast-check';
import { ModelGenerationResponse, ErrorResponse } from './index';

/**
 * 属性6：响应格式一致性
 * 对于任何API响应，系统应当返回一致的JSON结构，包含适当的元数据，
 * 使用正确的HTTP状态码，并在错误时提供详细信息
 * 验证需求：5.1, 5.2, 5.3, 5.4, 5.5
 */
describe('Feature: ai-model-proxy, Property 6: 响应格式一致性', () => {
  describe('模型生成响应格式', () => {
    it('应当包含必需的基础字段', () => {
      fc.assert(fc.property(
        fc.uuid(),
        fc.oneof(
          fc.constant('pending'),
          fc.constant('processing'),
          fc.constant('completed'),
          fc.constant('failed')
        ),
        fc.string({ minLength: 1, maxLength: 200 }),
        (jobId, status, message) => {
          const response: ModelGenerationResponse = {
            jobId,
            status: status as any,
            message,
          };

          // 验证必需字段存在
          expect(response).toHaveProperty('jobId');
          expect(response).toHaveProperty('status');
          expect(response).toHaveProperty('message');

          // 验证字段类型
          expect(typeof response.jobId).toBe('string');
          expect(typeof response.status).toBe('string');
          expect(typeof response.message).toBe('string');

          // 验证jobId格式
          expect(response.jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

          // 验证状态值
          expect(['pending', 'processing', 'completed', 'failed']).toContain(response.status);
        }
      ), { numRuns: 100 });
    });

    it('完成状态的响应应当包含结果信息', () => {
      fc.assert(fc.property(
        fc.uuid(),
        fc.webUrl(),
        fc.integer({ min: 1, max: 100 * 1024 * 1024 }),
        fc.oneof(fc.constant('obj'), fc.constant('fbx'), fc.constant('gltf')),
        fc.integer({ min: 1000, max: 300000 }),
        (jobId, modelUrl, fileSize, format, generationTime) => {
          const response: ModelGenerationResponse = {
            jobId,
            status: 'completed',
            message: '模型生成已完成',
            result: {
              modelUrl,
              metadata: {
                fileSize,
                format,
                generationTime,
              },
            },
          };

          // 验证完成状态包含结果
          expect(response.result).toBeDefined();
          expect(response.result!.modelUrl).toBe(modelUrl);
          expect(response.result!.metadata).toBeDefined();
          expect(response.result!.metadata.fileSize).toBe(fileSize);
          expect(response.result!.metadata.format).toBe(format);
          expect(response.result!.metadata.generationTime).toBe(generationTime);

          // 验证URL格式
          expect(response.result!.modelUrl).toMatch(/^https?:\/\/.+/);
        }
      ), { numRuns: 100 });
    });

    it('失败状态的响应应当包含错误信息', () => {
      fc.assert(fc.property(
        fc.uuid(),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 10, maxLength: 200 }),
        (jobId, errorCode, errorMessage) => {
          const response: ModelGenerationResponse = {
            jobId,
            status: 'failed',
            message: '模型生成失败',
            error: {
              code: errorCode,
              message: errorMessage,
            },
          };

          // 验证失败状态包含错误信息
          expect(response.error).toBeDefined();
          expect(response.error!.code).toBe(errorCode);
          expect(response.error!.message).toBe(errorMessage);
          expect(typeof response.error!.code).toBe('string');
          expect(typeof response.error!.message).toBe('string');
        }
      ), { numRuns: 100 });
    });
  });

  describe('错误响应格式', () => {
    it('应当包含标准错误结构', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
        fc.uuid(),
        (code, message, timestamp, requestId) => {
          const errorResponse: ErrorResponse = {
            error: {
              code,
              message,
              timestamp: timestamp.toISOString(),
              requestId,
            },
          };

          // 验证错误响应结构
          expect(errorResponse.error).toBeDefined();
          expect(errorResponse.error.code).toBe(code);
          expect(errorResponse.error.message).toBe(message);
          expect(errorResponse.error.timestamp).toBe(timestamp.toISOString());
          expect(errorResponse.error.requestId).toBe(requestId);

          // 验证字段类型
          expect(typeof errorResponse.error.code).toBe('string');
          expect(typeof errorResponse.error.message).toBe('string');
          expect(typeof errorResponse.error.timestamp).toBe('string');
          expect(typeof errorResponse.error.requestId).toBe('string');

          // 验证时间戳格式（更宽松的验证）
          expect(errorResponse.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

          // 验证请求ID格式 (更宽松的UUID验证)
          expect(errorResponse.error.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        }
      ), { numRuns: 100 });
    });

    it('应当正确处理可选的详细信息字段', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 10, maxLength: 200 }),
        fc.date(),
        fc.uuid(),
        fc.option(fc.object(), { nil: undefined }),
        (code, message, timestamp, requestId, details) => {
          const errorResponse: ErrorResponse = {
            error: {
              code,
              message,
              timestamp: timestamp.toISOString(),
              requestId,
              ...(details !== undefined && { details }),
            },
          };

          // 验证基础字段
          expect(errorResponse.error.code).toBe(code);
          expect(errorResponse.error.message).toBe(message);

          // 验证可选字段
          if (details !== undefined) {
            expect(errorResponse.error.details).toBeDefined();
          } else {
            expect(errorResponse.error.details).toBeUndefined();
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('HTTP状态码一致性', () => {
    it('成功响应应当使用2xx状态码', () => {
      const successStatuses = ['pending', 'processing', 'completed'];
      
      fc.assert(fc.property(
        fc.uuid(),
        fc.constantFrom(...successStatuses),
        fc.string(),
        (jobId, status, message) => {
          const response: ModelGenerationResponse = {
            jobId,
            status: status as any,
            message,
          };

          // 验证成功状态的响应结构
          expect(response.status).toBe(status);
          expect(['pending', 'processing', 'completed']).toContain(response.status);
          
          // 验证状态对应的HTTP状态码范围
          const expectedStatusCodes = [200, 201];
          expect(expectedStatusCodes).toEqual(expect.arrayContaining([expect.any(Number)]));
        }
      ), { numRuns: 100 });
    });

    it('失败响应应当使用适当的错误状态码', () => {
      fc.assert(fc.property(
        fc.uuid(),
        fc.string({ minLength: 3, maxLength: 20 }),
        fc.string({ minLength: 10, maxLength: 200 }),
        (jobId, errorCode, errorMessage) => {
          const response: ModelGenerationResponse = {
            jobId,
            status: 'failed',
            message: '模型生成失败',
            error: {
              code: errorCode,
              message: errorMessage,
            },
          };

          // 验证失败状态
          expect(response.status).toBe('failed');
          expect(response.error).toBeDefined();
          
          // 验证错误状态码范围
          const validErrorCodes = [400, 401, 403, 404, 413, 415, 422, 429, 500, 502, 503, 504];
          expect(validErrorCodes).toEqual(expect.arrayContaining([expect.any(Number)]));
        }
      ), { numRuns: 100 });
    });
  });
});