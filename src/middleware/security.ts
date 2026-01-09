import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * 速率限制中间件
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP最多100个请求
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: '请求过于频繁，请稍后再试',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '请求过于频繁，请稍后再试',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    });
  },
});

/**
 * API速率限制中间件（更严格）
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 50, // 每个IP最多50个API请求
  message: {
    error: {
      code: 'API_RATE_LIMIT_EXCEEDED',
      message: 'API请求过于频繁，请稍后再试',
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 请求大小限制中间件
 */
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction): void => {
  const contentLength = req.get('content-length');

  if (contentLength && parseInt(contentLength) > config.upload.maxFileSize) {
    logger.warn('Request size exceeded:', {
      contentLength,
      maxSize: config.upload.maxFileSize,
      ip: req.ip,
      path: req.path,
    });

    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `请求体过大，最大允许 ${config.upload.maxFileSize} bytes`,
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    });
    return;
  }

  next();
};

/**
 * 安全头中间件
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  // 设置安全相关的响应头
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // 在生产环境中强制HTTPS
  if (config.server.env === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
};

/**
 * IP白名单中间件（可选）
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';

    // 在开发环境中跳过IP检查
    if (config.server.env === 'development') {
      return next();
    }

    if (!allowedIPs.includes(clientIP)) {
      logger.warn('IP not in whitelist:', {
        clientIP,
        allowedIPs,
        path: req.path,
        method: req.method,
      });

      res.status(403).json({
        error: {
          code: 'IP_NOT_ALLOWED',
          message: '访问被拒绝',
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown',
        },
      });
      return;
    }

    next();
  };
};

/**
 * 请求验证中间件
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  // 检查必需的头部
  const userAgent = req.get('User-Agent');
  if (!userAgent) {
    logger.warn('Missing User-Agent header:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(400).json({
      error: {
        code: 'MISSING_USER_AGENT',
        message: '缺少User-Agent头部',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    });
    return;
  }

  // 检查可疑的User-Agent
  const suspiciousPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i];

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  if (isSuspicious && config.server.env === 'production') {
    logger.warn('Suspicious User-Agent detected:', {
      userAgent,
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      error: {
        code: 'SUSPICIOUS_REQUEST',
        message: '请求被拒绝',
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown',
      },
    });
    return;
  }

  next();
};

/**
 * CORS预检请求处理
 */
export const handleCorsPreflightRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小时
    res.status(204).end();
    return;
  }

  next();
};
