import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from './errorHandler';
import { ValidationError, NotFoundError, ExternalServiceError } from '../types/errors';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

// Mock config
jest.mock('../config', () => ({
  config: {
    server: {
      env: 'test',
    },
    upload: {
      maxFileSize: 10485760, // 10MB
    },
  },
}));

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      requestId: 'test-request-id',
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      path: '/test',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };

    mockResponse = {
      headersSent: false,
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('errorHandler', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('测试验证错误', [
        { field: 'email', message: '邮箱格式无效', value: 'invalid-email' },
      ]);

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_ERROR',
          message: '测试验证错误',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          details: [{ field: 'email', message: '邮箱格式无效', value: 'invalid-email' }],
        },
      });
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('资源未找到');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: '资源未找到',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
    });

    it('should handle ExternalServiceError correctly', () => {
      const error = new ExternalServiceError('外部服务', '连接失败', 'TRIPO_API_ERROR');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(502);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'EXTERNAL_SERVICE_ERROR',
          message: 'External service error (外部服务): 连接失败',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          details: 'TRIPO_API_ERROR',
        },
      });
    });

    it('should handle Multer LIMIT_FILE_SIZE error', () => {
      const error = {
        name: 'MulterError',
        code: 'LIMIT_FILE_SIZE',
        message: 'File too large',
      };

      errorHandler(error as Error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(413);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'FILE_TOO_LARGE',
          message: '文件过大，最大允许 10485760 bytes',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
    });

    it('should handle JSON syntax error', () => {
      const error = new SyntaxError('Unexpected token');
      (error as any).body = true; // Mark as body parsing error

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INVALID_JSON',
          message: '无效的JSON格式',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
    });

    it('should handle unknown errors', () => {
      const error = new Error('未知错误');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '未知错误',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
          details: expect.any(String), // Stack trace in test environment
        },
      });
    });

    it('should call next if headers already sent', () => {
      mockResponse.headersSent = true;
      const error = new Error('测试错误');

      const result = errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(result).toBeUndefined();
    });

    it('should handle missing requestId', () => {
      const mockReqWithoutId = { ...mockRequest, requestId: undefined };
      const error = new ValidationError('测试错误');

      errorHandler(
        error,
        mockReqWithoutId as unknown as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'unknown',
          }),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with correct error format', () => {
      const mockReqWithPath = { ...mockRequest, path: '/non-existent-path' };

      notFoundHandler(mockReqWithPath as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          code: 'NOT_FOUND',
          message: '路径 /non-existent-path 未找到',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
    });

    it('should handle missing requestId in notFoundHandler', () => {
      const mockReqWithoutId = { ...mockRequest, requestId: undefined, path: '/test' };

      notFoundHandler(mockReqWithoutId as unknown as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            requestId: 'unknown',
          }),
        })
      );
    });
  });
});
