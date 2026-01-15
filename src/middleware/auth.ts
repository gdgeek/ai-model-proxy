import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean;
}

/**
 * API Key 认证中间件
 */
export const apiKeyAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // 如果没有配置 API Key，则跳过认证
  if (!config.security.apiKey) {
    req.isAuthenticated = true;
    return next();
  }

  // 从多个位置获取 API Key
  const apiKey = 
    req.headers['x-api-key'] as string ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.apiKey as string ||
    req.body.apiKey as string;

  if (!apiKey) {
    logger.warn('API Key missing', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API Key is required',
      code: 'MISSING_API_KEY'
    });
  }

  if (apiKey !== config.security.apiKey) {
    logger.warn('Invalid API Key attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      providedKey: apiKey.substring(0, 8) + '...' // 只记录前8位用于调试
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key',
      code: 'INVALID_API_KEY'
    });
  }

  // 认证成功
  req.isAuthenticated = true;
  logger.debug('API Key authentication successful', {
    ip: req.ip,
    path: req.path
  });

  next();
};

/**
 * 可选认证中间件 - 如果提供了 API Key 则验证，否则继续
 */
export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // 如果没有配置 API Key，则跳过认证
  if (!config.security.apiKey) {
    req.isAuthenticated = true;
    return next();
  }

  const apiKey = 
    req.headers['x-api-key'] as string ||
    req.headers['authorization']?.replace('Bearer ', '') ||
    req.query.apiKey as string ||
    req.body.apiKey as string;

  // 如果没有提供 API Key，则标记为未认证但继续
  if (!apiKey) {
    req.isAuthenticated = false;
    return next();
  }

  // 如果提供了 API Key，则必须验证
  if (apiKey !== config.security.apiKey) {
    logger.warn('Invalid API Key attempt in optional auth', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API Key',
      code: 'INVALID_API_KEY'
    });
  }

  req.isAuthenticated = true;
  next();
};