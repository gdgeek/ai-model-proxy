// Jest测试环境设置
import dotenv from 'dotenv';

// 加载测试环境变量
dotenv.config({ path: '.env.test' });

// 设置测试环境变量
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] = 'error'; // 减少测试时的日志输出

// 模拟外部服务
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
  })),
}));

// 全局测试超时
jest.setTimeout(10000);

// 测试前清理
beforeEach(() => {
  jest.clearAllMocks();
});

// 测试后清理
afterEach(() => {
  jest.restoreAllMocks();
});
