// 基础类型定义
import { Request } from 'express';

export type ModelInputType = 'image' | 'text';
export type ModelStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ModelFormat = 'obj' | 'fbx' | 'gltf';
export type QualityLevel = 'low' | 'medium' | 'high';

// 请求和响应模型
export interface ModelGenerationRequest {
  type: ModelInputType;
  input: string | Buffer; // 文本内容或图片数据
  token: string;
  options?: {
    quality?: QualityLevel;
    format?: ModelFormat;
    timeout?: number;
  };
}

export interface ModelGenerationResponse {
  jobId: string;
  status: ModelStatus;
  message: string;
  estimatedTime?: number;
  result?: {
    modelUrl: string;
    thumbnailUrl?: string;
    metadata: {
      fileSize: number;
      format: string;
      generationTime: number;
      dimensions?: {
        width: number;
        height: number;
        depth: number;
      };
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 内部数据模型
export interface JobStatus {
  jobId: string;
  status: ModelStatus;
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tripoJobId?: string;
  cosUrl?: string;
  error?: ErrorInfo;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  hash: string;
  uploadedAt: Date;
  cosKey: string;
  cosUrl: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Tripo AI 相关类型
export interface TripoInput {
  type: ModelInputType;
  data: string | Buffer;
  options?: {
    quality?: QualityLevel;
    format?: ModelFormat;
  };
}

export interface TripoResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface TripoJobStatus {
  jobId: string;
  status: string;
  progress: number;
  result?: {
    downloadUrl: string;
    thumbnailUrl?: string;
    metadata?: any;
  };
  error?: {
    code: string;
    message: string;
  };
}

// 腾讯云 COS 相关类型
export interface COSUploadParams {
  Bucket: string;
  Region: string;
  Key: string;
  Body: Buffer;
  ContentType?: string;
  ACL?: string;
}

export interface COSUploadResult {
  Location: string;
  Bucket: string;
  Key: string;
  ETag: string;
}

export interface COSParams {
  Bucket: string;
  Region: string;
  Key: string;
}

export interface COSMetadata {
  'Content-Length': string;
  'Content-Type': string;
  ETag: string;
  'Last-Modified': string;
}

// 服务接口定义
export interface ModelInput {
  type: ModelInputType;
  data: string | Buffer;
  filename?: string;
  mimeType?: string;
}

export interface JobResponse {
  jobId: string;
  status: ModelStatus;
  message: string;
  estimatedTime?: number;
}

export interface ModelResult {
  jobId: string;
  status: ModelStatus;
  modelUrl?: string;
  thumbnailUrl?: string;
  metadata?: {
    fileSize: number;
    format: string;
    generationTime: number;
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
  };
  error?: ErrorInfo;
}

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  etag: string;
}

// HTTP 错误响应类型
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// 健康检查响应类型
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime?: number;
  dependencies?: {
    redis?: 'connected' | 'disconnected';
    tripo?: 'available' | 'unavailable';
    cos?: 'available' | 'unavailable';
  };
}

export interface ReadinessCheckResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
  checks?: {
    [key: string]: boolean;
  };
}

// 中间件相关类型
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

// 配置相关类型
export interface AppConfig {
  server: {
    port: number;
    env: string;
  };
  tripo: {
    apiUrl: string;
    timeout: number;
    maxRetries: number;
    retryDelay: number;
  };
  cos: {
    secretId: string;
    secretKey: string;
    region: string;
    bucket: string;
  };
  redis: {
    host: string;
    port: number;
    password: string;
    db: number;
  };
  upload: {
    maxFileSize: number;
    allowedImageTypes: string[];
  };
  logging: {
    level: string;
    format: string;
  };
  security: {
    corsOrigin: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  };
}
