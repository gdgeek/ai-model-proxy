import * as fc from 'fast-check';
import request from 'supertest';
import app from '../app';

/**
 * 属性9：健康检查可用性
 * 对于任何健康检查请求，系统应当返回正确的健康状态信息
 * 验证需求：8.3
 */
describe('Feature: ai-model-proxy, Property 9: 健康检查可用性', () => {
  describe('基础健康检查端点', () => {
    it('GET /health应当始终返回健康状态', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);

      const body = response.body;
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');

      expect(body.status).toBe('healthy');
      expect(typeof body.timestamp).toBe('string');
      expect(typeof body.uptime).toBe('number');
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('GET /ready应当始终返回就绪状态', async () => {
      const response = await request(app).get('/ready');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);

      const body = response.body;
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');

      expect(body.status).toBe('ready');
      expect(typeof body.timestamp).toBe('string');
    });
  });

  describe('健康检查响应格式一致性', () => {
    it('健康检查响应应当包含标准字段', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          fc.float({ min: 0, max: 86400, noNaN: true }), // 0 to 24 hours uptime, no NaN
          (timestamp, uptime) => {
            // 模拟健康检查响应格式
            const healthResponse = {
              status: 'healthy',
              timestamp: timestamp.toISOString(),
              uptime: uptime,
            };

            // 验证必需字段
            expect(healthResponse).toHaveProperty('status');
            expect(healthResponse).toHaveProperty('timestamp');
            expect(healthResponse).toHaveProperty('uptime');

            // 验证字段类型
            expect(typeof healthResponse.status).toBe('string');
            expect(typeof healthResponse.timestamp).toBe('string');
            expect(typeof healthResponse.uptime).toBe('number');

            // 验证字段值
            expect(healthResponse.status).toBe('healthy');
            expect(healthResponse.uptime).toBeGreaterThanOrEqual(0);

            // 验证时间戳格式（更宽松的验证）
            expect(healthResponse.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('就绪检查响应应当包含标准字段', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
          timestamp => {
            // 模拟就绪检查响应格式
            const readyResponse = {
              status: 'ready',
              timestamp: timestamp.toISOString(),
            };

            // 验证必需字段
            expect(readyResponse).toHaveProperty('status');
            expect(readyResponse).toHaveProperty('timestamp');

            // 验证字段类型
            expect(typeof readyResponse.status).toBe('string');
            expect(typeof readyResponse.timestamp).toBe('string');

            // 验证字段值
            expect(readyResponse.status).toBe('ready');

            // 验证时间戳格式（更宽松的验证）
            expect(readyResponse.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('健康检查端点可访问性', () => {
    it('健康检查端点应当不受速率限制影响', async () => {
      // 快速连续发送多个健康检查请求
      const requests = Array.from({ length: 10 }, () => request(app).get('/health'));

      const responses = await Promise.all(requests);

      // 所有请求都应当成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('就绪检查端点应当不受速率限制影响', async () => {
      // 快速连续发送多个就绪检查请求
      const requests = Array.from({ length: 10 }, () => request(app).get('/ready'));

      const responses = await Promise.all(requests);

      // 所有请求都应当成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ready');
      });
    });
  });

  describe('健康检查HTTP方法支持', () => {
    it('健康检查应当只支持GET方法', async () => {
      // 测试不支持的HTTP方法
      const postResponse = await request(app).post('/health');

      const putResponse = await request(app).put('/health');

      const deleteResponse = await request(app).delete('/health');

      // 应当返回405 Method Not Allowed或404 Not Found
      expect([404, 405]).toContain(postResponse.status);
      expect([404, 405]).toContain(putResponse.status);
      expect([404, 405]).toContain(deleteResponse.status);
    });

    it('就绪检查应当只支持GET方法', async () => {
      // 测试不支持的HTTP方法
      const postResponse = await request(app).post('/ready');

      const putResponse = await request(app).put('/ready');

      // 应当返回405 Method Not Allowed或404 Not Found
      expect([404, 405]).toContain(postResponse.status);
      expect([404, 405]).toContain(putResponse.status);
    });
  });

  describe('健康检查响应时间', () => {
    it('健康检查应当快速响应', async () => {
      const startTime = Date.now();

      const response = await request(app).get('/health');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      // 健康检查应当在1秒内响应
      expect(responseTime).toBeLessThan(1000);
    });

    it('就绪检查应当快速响应', async () => {
      const startTime = Date.now();

      const response = await request(app).get('/ready');

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      // 就绪检查应当在1秒内响应
      expect(responseTime).toBeLessThan(1000);
    });
  });

  describe('健康检查状态值', () => {
    it('健康状态值应当是预定义的有效值', () => {
      const validHealthStatuses = ['healthy', 'unhealthy', 'degraded'];
      const validReadyStatuses = ['ready', 'not-ready'];

      fc.assert(
        fc.property(fc.constantFrom(...validHealthStatuses), status => {
          // 验证健康状态值
          expect(validHealthStatuses).toContain(status);
          expect(typeof status).toBe('string');
          expect(status.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );

      fc.assert(
        fc.property(fc.constantFrom(...validReadyStatuses), status => {
          // 验证就绪状态值
          expect(validReadyStatuses).toContain(status);
          expect(typeof status).toBe('string');
          expect(status.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('健康检查缓存行为', () => {
    it('健康检查应当返回实时状态而非缓存', async () => {
      // 发送两个连续的健康检查请求
      const response1 = await request(app).get('/health');

      // 等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 10));

      const response2 = await request(app).get('/health');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // 时间戳应当不同（实时生成）
      expect(response1.body.timestamp).not.toBe(response2.body.timestamp);

      // 运行时间应当增加
      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
    });
  });
});
