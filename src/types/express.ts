import { Request } from 'express';
import { ModelGenerationRequest } from './index';

// 扩展Express Request类型
export interface RequestWithBody<T = any> extends Request {
  body: T;
}

export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
}

export interface ModelGenerationRequestWithFile extends RequestWithFile {
  body: Omit<ModelGenerationRequest, 'input'> & {
    input?: string; // 文本输入时使用
  };
}

// 请求上下文类型
export interface RequestContext {
  requestId: string;
  startTime: number;
  userId?: string;
  clientIp: string;
  userAgent?: string;
}

// 扩展Express Request以包含上下文
declare global {
  namespace Express {
    interface Request {
      context?: RequestContext;
      requestId?: string;
    }
  }
}
