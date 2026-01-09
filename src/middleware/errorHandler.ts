import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/errors';
import { ErrorResponse } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';

// 全局错误处理中间件
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  // 如果响应已经发送，交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.requestId || 'unknown';
  
  // 记录错误
  logger.error('Request error:', {
    requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 处理已知的应用错误
  if (err instanceof AppError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        timestamp: new Date().toISOString(),
        requestId,
        ...(config.server.env !== 'production' && err.details && { details: err.details }),
      },
    };

    return res.status(err.statusCode).json(errorResponse);
  }

  // 处理Multer错误
  if (err.name === 'MulterError') {
    const multerErr = err as any; // Multer错误类型
    let statusCode = 400;
    let code = 'FILE_UPLOAD_ERROR';
    let message = '文件上传错误';

    switch (multerErr.code) {
      case 'LIMIT_FILE_SIZE':
        statusCode = 413;
        code = 'FILE_TOO_LARGE';
        message = `文件过大，最大允许 ${config.upload.maxFileSize} bytes`;
        break;
      case 'LIMIT_FILE_COUNT':
        statusCode = 400;
        code = 'TOO_MANY_FILES';
        message = '文件数量超过限制';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        statusCode = 400;
        code = 'UNEXPECTED_FILE';
        message = '意外的文件字段';
        break;
      default:
        message = multerErr.message;
    }

    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return res.status(statusCode).json(errorResponse);
  }

  // 处理JSON解析错误
  if (err instanceof SyntaxError && 'body' in err) {
    const errorResponse: ErrorResponse = {
      error: {
        code: 'INVALID_JSON',
        message: '无效的JSON格式',
        timestamp: new Date().toISOString(),
        requestId,
      },
    };

    return res.status(400).json(errorResponse);
  }

  // 处理未知错误
  const errorResponse: ErrorResponse = {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.server.env === 'production' ? '内部服务器错误' : err.message,
      timestamp: new Date().toISOString(),
      requestId,
      ...(config.server.env !== 'production' && { details: err.stack }),
    },
  };

  res.status(500).json(errorResponse);
};

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response): Response => {
  const requestId = req.requestId || 'unknown';
  
  const errorResponse: ErrorResponse = {
    error: {
      code: 'NOT_FOUND',
      message: `路径 ${req.path} 未找到`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  return res.status(404).json(errorResponse);
};