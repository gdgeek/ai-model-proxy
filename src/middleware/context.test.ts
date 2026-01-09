import { Request, Response, NextFunction } from 'express';
import { addRequestContext, logRequest } from './context';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
  },
}));

describe('Context Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
      get: jest.fn(),
      socket: {
        remoteAddress: '192.168.1.1',
      } as any,
    };
    Object.defineProperty(mockReq, 'ip', {
      value: '127.0.0.1',
      writable: true,
      configurable: true,
    });
    mockRes = {
      setHeader: jest.fn(),
      on: jest.fn(),
      statusCode: 200,
    };
    mockNext = jest.fn();
  });

  describe('addRequestContext', () => {
    it('should add request context with all fields', () => {
      (mockReq.get as jest.Mock).mockReturnValue('Mozilla/5.0 (test)');

      addRequestContext(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.context).toBeDefined();
      expect(mockReq.context?.requestId).toBe('test-uuid-1234');
      expect(mockReq.context?.clientIp).toBe('127.0.0.1');
      expect(mockReq.context?.userAgent).toBe('Mozilla/5.0 (test)');
      expect(mockReq.context?.startTime).toBeGreaterThan(0);
      expect(mockReq.requestId).toBe('test-uuid-1234');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-uuid-1234');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing User-Agent', () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      addRequestContext(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.context).toBeDefined();
      expect(mockReq.context?.userAgent).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use socket.remoteAddress when ip is not available', () => {
      Object.defineProperty(mockReq, 'ip', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      addRequestContext(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.context?.clientIp).toBe('192.168.1.1');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use "unknown" when no IP is available', () => {
      Object.defineProperty(mockReq, 'ip', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(mockReq, 'socket', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      addRequestContext(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.context?.clientIp).toBe('unknown');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('logRequest', () => {
    it('should log request start and finish', () => {
      const { logger } = require('../utils/logger');
      mockReq.context = {
        requestId: 'test-request-id',
        startTime: Date.now() - 100, // 100ms ago
        clientIp: '127.0.0.1',
      };

      logRequest(mockReq as Request, mockRes as Response, mockNext);

      // Check that start log was called
      expect(logger.info).toHaveBeenCalledWith('[test-request-id] GET /test - Start');

      // Simulate response finish
      const finishCallback = (mockRes.on as jest.Mock).mock.calls.find(
        call => call[0] === 'finish'
      )[1];
      finishCallback();

      // Check that finish log was called
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringMatching(/\[test-request-id\] GET \/test - 200 \(\d+ms\)/)
      );

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing context gracefully', () => {
      const { logger } = require('../utils/logger');
      Object.defineProperty(mockReq, 'context', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      logRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
