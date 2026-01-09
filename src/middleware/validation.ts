/// <reference types="express" />
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import multer, { FileFilterCallback } from 'multer';
import { config } from '../config';
import { ValidationError, UnsupportedMediaTypeError, PayloadTooLargeError } from '../types/errors';

// 定义文件类型
type MulterFile = Express.Multer.File;

// Joi验证模式
const modelGenerationSchema = Joi.object({
  type: Joi.string().valid('image', 'text').required(),
  input: Joi.when('type', {
    is: 'text',
    then: Joi.string().min(1).max(1000).required(),
    otherwise: Joi.forbidden(),
  }),
  token: Joi.string().min(10).required(),
  options: Joi.object({
    quality: Joi.string().valid('low', 'medium', 'high').optional(),
    format: Joi.string().valid('obj', 'fbx', 'gltf').optional(),
    timeout: Joi.number().min(1000).max(300000).optional(), // 1秒到5分钟
  }).optional(),
});

// 图片格式验证
const ALLOWED_IMAGE_TYPES = new Set(config.upload.allowedImageTypes);
const IMAGE_MIME_TYPE_EXTENSIONS: { [key: string]: string } = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// Multer配置用于文件上传
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: MulterFile, cb: FileFilterCallback): void => {
  // 检查文件类型
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    const error = new UnsupportedMediaTypeError(
      `不支持的图片格式: ${file.mimetype}. 支持的格式: ${Array.from(ALLOWED_IMAGE_TYPES).join(', ')}`
    );
    return cb(error);
  }

  // 检查文件扩展名
  const extension = IMAGE_MIME_TYPE_EXTENSIONS[file.mimetype];
  if (!extension) {
    const error = new UnsupportedMediaTypeError(`无法确定文件扩展名: ${file.mimetype}`);
    return cb(error);
  }

  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1, // 只允许单个文件
  },
});

// 验证模型生成请求
export const validateModelGenerationRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const { error, value } = modelGenerationSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      throw new ValidationError('请求验证失败', validationErrors);
    }

    // 验证图片输入
    if (value.type === 'image') {
      if (!req.file) {
        throw new ValidationError('图片类型请求必须包含图片文件');
      }

      // 验证图片文件大小
      if (req.file.size > config.upload.maxFileSize) {
        throw new PayloadTooLargeError(
          `图片文件过大: ${req.file.size} bytes. 最大允许: ${config.upload.maxFileSize} bytes`
        );
      }
    }

    // 验证文本输入
    if (value.type === 'text' && req.file) {
      throw new ValidationError('文本类型请求不应包含文件');
    }

    // 将验证后的数据附加到请求对象
    req.body = value;
    next();
  } catch (error) {
    next(error);
  }
};

// 验证令牌格式
export const validateToken = (token: string): boolean => {
  // 基本令牌格式验证
  if (!token || typeof token !== 'string') {
    return false;
  }

  // 检查长度
  if (token.length < 10 || token.length > 500) {
    return false;
  }

  // 检查是否包含有效字符（字母、数字、连字符、下划线、点）
  const tokenRegex = /^[a-zA-Z0-9._-]+$/;
  return tokenRegex.test(token);
};

// 验证图片格式
export const validateImageFormat = (file: MulterFile): boolean => {
  return ALLOWED_IMAGE_TYPES.has(file.mimetype);
};

// 验证文本内容
export const validateTextContent = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  // 检查长度
  if (text.trim().length === 0 || text.length > 1000) {
    return false;
  }

  // 检查是否包含有害内容（基本检查）
  const harmfulPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  return !harmfulPatterns.some(pattern => pattern.test(text));
};

// 通用验证中间件
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value,
        }));

        throw new ValidationError('验证失败', validationErrors);
      }

      req.body = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// 验证作业ID格式
export const validateJobId = (jobId: string): boolean => {
  if (!jobId || typeof jobId !== 'string') {
    return false;
  }

  // UUID格式验证
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(jobId);
};

// 验证文本输入
export const validateTextInput = (text: string): boolean => {
  return validateTextContent(text);
};

// 验证图片文件
export const validateImageFile = (file: MulterFile): boolean => {
  if (!file) {
    return false;
  }

  // 检查MIME类型
  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return false;
  }

  // 检查文件大小
  if (file.size <= 0 || file.size > config.upload.maxFileSize) {
    return false;
  }

  return true;
};

// 导出验证模式供测试使用
export { modelGenerationSchema };
