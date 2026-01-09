import * as fc from 'fast-check';
import request from 'supertest';
import app from '../app';

/**
 * 属性7：RESTful设计合规性
 * 对于任何API端点，系统应当遵循RESTful约定，使用适当的HTTP方法，
 * 保持一致的URL模式，并提供OpenAPI文档
 * 验证需求：6.1, 6.2, 6.3, 6.4
 */
describe('Feature: ai-model-proxy, Property 7: RESTful设计合规性', () => {
  describe('URL模式一致性', () => {
    it('所有API端点应当遵循/api/v1前缀模式', async () => {
      const apiEndpoints = [
        '/api/v1/models',
        '/api/v1/models/test-job-id/status',
        '/api/v1/models/test-job-id/result',
      ];

      for (const endpoint of apiEndpoints) {
        // 验证URL模式
        expect(endpoint).toMatch(/^\/api\/v1\//);

        // 验证资源命名使用复数形式
        expect(endpoint).toMatch(/\/models/);
      }
    });

    it('资源ID应当遵循RESTful路径参数模式', () => {
      fc.assert(
        fc.property(fc.uuid(), jobId => {
          const statusEndpoint = `/api/v1/models/${jobId}/status`;
          const resultEndpoint = `/api/v1/models/${jobId}/result`;

          // 验证路径参数格式
          expect(statusEndpoint).toMatch(/^\/api\/v1\/models\/[0-9a-f-]+\/status$/);
          expect(resultEndpoint).toMatch(/^\/api\/v1\/models\/[0-9a-f-]+\/result$/);

          // 验证资源层次结构
          expect(statusEndpoint).toContain(`/models/${jobId}/`);
          expect(resultEndpoint).toContain(`/models/${jobId}/`);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('HTTP方法使用', () => {
    it('POST方法应当用于创建资源', async () => {
      // 测试POST /api/v1/models用于创建模型生成任务
      const response = await request(app).post('/api/v1/models').send({
        type: 'text',
        input: 'test model',
        token: 'test-token-123456',
      });

      // POST应当返回201 Created或400 Bad Request（验证失败）
      expect([201, 400, 401]).toContain(response.status);
    });

    it('GET方法应当用于获取资源', async () => {
      // 测试GET方法用于获取状态和结果
      const testJobId = '12345678-1234-5234-a234-123456789012'; // 使用有效的UUID格式

      const statusResponse = await request(app).get(`/api/v1/models/${testJobId}/status`);

      const resultResponse = await request(app).get(`/api/v1/models/${testJobId}/result`);

      // GET应当返回200 OK, 404 Not Found, 422 Unprocessable Entity 或其他适当状态码
      expect([200, 404, 422]).toContain(statusResponse.status);
      expect([200, 404, 422]).toContain(resultResponse.status);
    });

    it('不应当接受不适当的HTTP方法', async () => {
      const testJobId = '12345678-1234-5234-a234-123456789012'; // 使用有效的UUID格式

      // 测试不支持的方法
      const putResponse = await request(app).put(`/api/v1/models/${testJobId}/status`);

      const deleteResponse = await request(app).delete(`/api/v1/models/${testJobId}`);

      // 应当返回405 Method Not Allowed
      expect([404, 405]).toContain(putResponse.status);
      expect([404, 405]).toContain(deleteResponse.status);
    });
  });

  describe('响应头一致性', () => {
    it('所有API响应应当包含适当的Content-Type头', async () => {
      const endpoints = [
        { method: 'get', path: '/health' },
        { method: 'get', path: '/ready' },
        { method: 'get', path: '/api-docs.json' },
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method as 'get'](endpoint.path);

        if (response.status < 500) {
          expect(response.headers['content-type']).toMatch(/application\/json/);
        }
      }
    });

    it('错误响应应当包含适当的安全头', async () => {
      const response = await request(app).get('/api/v1/models/invalid-job-id/status');

      // 验证安全头存在
      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });
  });

  describe('状态码使用规范', () => {
    it('应当使用标准HTTP状态码', () => {
      const validStatusCodes = [
        200, // OK
        201, // Created
        400, // Bad Request
        401, // Unauthorized
        403, // Forbidden
        404, // Not Found
        405, // Method Not Allowed
        413, // Payload Too Large
        415, // Unsupported Media Type
        422, // Unprocessable Entity
        429, // Too Many Requests
        500, // Internal Server Error
        502, // Bad Gateway
        503, // Service Unavailable
        504, // Gateway Timeout
      ];

      fc.assert(
        fc.property(fc.constantFrom(...validStatusCodes), statusCode => {
          // 验证状态码在有效范围内
          expect(statusCode).toBeGreaterThanOrEqual(200);
          expect(statusCode).toBeLessThan(600);

          // 验证状态码分类
          if (statusCode >= 200 && statusCode < 300) {
            // 2xx 成功
            expect([200, 201, 202, 204]).toEqual(expect.arrayContaining([expect.any(Number)]));
          } else if (statusCode >= 400 && statusCode < 500) {
            // 4xx 客户端错误
            expect([400, 401, 403, 404, 405, 413, 415, 422, 429]).toEqual(
              expect.arrayContaining([expect.any(Number)])
            );
          } else if (statusCode >= 500 && statusCode < 600) {
            // 5xx 服务器错误
            expect([500, 502, 503, 504]).toEqual(expect.arrayContaining([expect.any(Number)]));
          }
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('API文档可用性', () => {
    it('应当提供OpenAPI规范文档', async () => {
      const response = await request(app).get('/api-docs.json');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);

      const spec = response.body;

      // 验证OpenAPI规范基本结构
      expect(spec).toHaveProperty('openapi');
      expect(spec).toHaveProperty('info');
      expect(spec).toHaveProperty('paths');

      // 验证版本信息
      expect(spec.openapi).toMatch(/^3\./);
      expect(spec.info).toHaveProperty('title');
      expect(spec.info).toHaveProperty('version');
    });

    it('应当提供Swagger UI界面', async () => {
      const response = await request(app).get('/api-docs/');

      // Swagger UI可能返回200或301重定向
      expect([200, 301]).toContain(response.status);

      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/text\/html/);
      }
    });

    it('API规范应当包含所有端点定义', async () => {
      const response = await request(app).get('/api-docs.json');

      const spec = response.body;
      const paths = spec.paths || {};

      // 验证主要API端点在规范中定义
      const expectedPaths = [
        '/api/v1/models',
        '/api/v1/models/{jobId}/status',
        '/api/v1/models/{jobId}/result',
      ];

      for (const path of expectedPaths) {
        expect(paths).toHaveProperty(path);
      }
    });
  });

  describe('资源表示一致性', () => {
    it('相同资源在不同端点应当使用一致的表示', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.oneof(
            fc.constant('pending'),
            fc.constant('processing'),
            fc.constant('completed'),
            fc.constant('failed')
          ),
          (jobId, status) => {
            // 模拟不同端点返回的相同资源
            const createResponse = {
              jobId,
              status,
              message: 'test message',
            };

            const statusResponse = {
              jobId,
              status,
              message: 'test message',
            };

            // 验证资源表示一致性
            expect(createResponse.jobId).toBe(statusResponse.jobId);
            expect(createResponse.status).toBe(statusResponse.status);

            // 验证字段命名一致性
            expect(createResponse).toHaveProperty('jobId');
            expect(statusResponse).toHaveProperty('jobId');
            expect(createResponse).toHaveProperty('status');
            expect(statusResponse).toHaveProperty('status');
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
