import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../types/express';

// 添加请求上下文中间件
export const addRequestContext = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();
  const startTime = Date.now();
  const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent');

  const context: RequestContext = {
    requestId,
    startTime,
    clientIp,
    ...(userAgent && { userAgent }),
  };

  // 添加到请求对象
  req.context = context;
  req.requestId = requestId;

  // 添加到响应头
  res.setHeader('X-Request-ID', requestId);

  next();
};

// 请求日志中间件
export const logRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { context } = req;
  
  if (context) {
    // 记录请求开始
    console.log(`[${context.requestId}] ${req.method} ${req.path} - Start`);
    
    // 监听响应结束
    res.on('finish', () => {
      const duration = Date.now() - context.startTime;
      console.log(
        `[${context.requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
      );
    });
  }

  next();
};