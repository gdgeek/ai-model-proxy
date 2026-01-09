import { Request, Response, NextFunction } from 'express';
import {
  requestSizeLimit,
  securityHeaders,
  ipWhitelist,
  validateRequest,
  handleCorsPreflightRequest,
} from './security';
import { config } from '../config';

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Mock config
jest.mock('../config', () => ({
  config: {
    upload: {
      maxFileSize: 1024 * 1024, // 1MB
    },
    server: {
      env: 'test',
    },
  },
}));

describe('Security Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
      get: jest.fn(),
    };
    Object.defineProperty(mockReq, 'ip', {
      value: '127.0.0.1',
      writable: true,
      configurable: true,
    });
    Object.defineProperty(mockReq, 'requestId', {
      value: 'test-request-id',
      writable: true,
      configurable: true,
    });
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('requestSizeLimit', () => {
    it('should allow requests within size limit', () => {
      (mockReq.get as jest.Mock).mockReturnValue('1000'); // 1000 bytes

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      (mockReq.get as jest.Mock).mockReturnValue('2000000'); // 2MB

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'PAYLOAD_TOO_LARGE',
          message: expect.stringContaining('请求体过大'),
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests without content-length header', () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers', () => {
      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        'geolocation=(), microphone=(), camera=()'
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set HSTS header in production', () => {
      // Mock production environment
      (config as any).server.env = 'production';

      securityHeaders(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
      expect(mockNext).toHaveBeenCalled();

      // Reset to test environment
      (config as any).server.env = 'test';
    });
  });

  describe('ipWhitelist', () => {
    const allowedIPs = ['127.0.0.1', '192.168.1.1'];
    const middleware = ipWhitelist(allowedIPs);

    it('should allow whitelisted IPs', () => {
      Object.defineProperty(mockReq, 'ip', {
        value: '127.0.0.1',
        writable: true,
        configurable: true,
      });

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject non-whitelisted IPs', () => {
      Object.defineProperty(mockReq, 'ip', {
        value: '10.0.0.1',
        writable: true,
        configurable: true,
      });
      (config as any).server.env = 'production';

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'IP_NOT_ALLOWED',
          message: '访问被拒绝',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Reset to test environment
      (config as any).server.env = 'test';
    });

    it('should skip IP check in development environment', () => {
      Object.defineProperty(mockReq, 'ip', {
        value: '10.0.0.1',
        writable: true,
        configurable: true,
      });
      (config as any).server.env = 'development';

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();

      // Reset to test environment
      (config as any).server.env = 'test';
    });
  });

  describe('validateRequest', () => {
    it('should allow requests with valid User-Agent', () => {
      (mockReq.get as jest.Mock).mockReturnValue('Mozilla/5.0 (compatible; test)');

      validateRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests without User-Agent', () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      validateRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'MISSING_USER_AGENT',
          message: '缺少User-Agent头部',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject suspicious User-Agent in production', () => {
      (mockReq.get as jest.Mock).mockReturnValue('GoogleBot/2.1');
      (config as any).server.env = 'production';

      validateRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          code: 'SUSPICIOUS_REQUEST',
          message: '请求被拒绝',
          timestamp: expect.any(String),
          requestId: 'test-request-id',
        },
      });
      expect(mockNext).not.toHaveBeenCalled();

      // Reset to test environment
      (config as any).server.env = 'test';
    });

    it('should allow suspicious User-Agent in non-production', () => {
      (mockReq.get as jest.Mock).mockReturnValue('GoogleBot/2.1');

      validateRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('handleCorsPreflightRequest', () => {
    it('should handle OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';

      handleCorsPreflightRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '86400');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.end).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass through non-OPTIONS requests', () => {
      mockReq.method = 'GET';

      handleCorsPreflightRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
