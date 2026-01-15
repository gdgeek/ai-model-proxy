import dotenv from 'dotenv';
import Joi from 'joi';

// 加载环境变量
dotenv.config();

// 配置验证模式
const configSchema = Joi.object({
  // 服务器配置
  PORT: Joi.number().default(3000),
  HOST: Joi.string().default('0.0.0.0'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // Tripo AI 配置
  TRIPO_API_URL: Joi.string().uri().default('https://api.tripo3d.ai'),
  TRIPO_API_TIMEOUT: Joi.number().default(30000),
  TRIPO_MAX_RETRIES: Joi.number().default(3),
  TRIPO_RETRY_DELAY: Joi.number().default(1000),

  // 腾讯云 COS 配置
  TENCENT_COS_SECRET_ID: Joi.string().default(''),
  TENCENT_COS_SECRET_KEY: Joi.string().default(''),
  TENCENT_COS_REGION: Joi.string().default('ap-beijing'),
  TENCENT_COS_BUCKET: Joi.string().default(''),

  // Redis 配置
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  // 文件上传配置
  MAX_FILE_SIZE: Joi.number().default(10485760), // 10MB
  ALLOWED_IMAGE_TYPES: Joi.string().default('image/jpeg,image/png,image/webp'),

  // 日志配置
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'simple').default('json'),

  // 安全配置
  CORS_ORIGIN: Joi.string().default('*'),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15分钟
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
});

// 验证环境变量
const { error, value: envVars } = configSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true,
});

if (error) {
  throw new Error(`配置验证失败: ${error.message}`);
}

// 导出配置对象
export const config = {
  server: {
    port: envVars.PORT,
    host: envVars.HOST,
    env: envVars.NODE_ENV,
  },
  tripo: {
    apiUrl: envVars.TRIPO_API_URL,
    timeout: envVars.TRIPO_API_TIMEOUT,
    maxRetries: envVars.TRIPO_MAX_RETRIES,
    retryDelay: envVars.TRIPO_RETRY_DELAY,
  },
  cos: {
    secretId: envVars.TENCENT_COS_SECRET_ID,
    secretKey: envVars.TENCENT_COS_SECRET_KEY,
    region: envVars.TENCENT_COS_REGION,
    bucket: envVars.TENCENT_COS_BUCKET,
  },
  redis: {
    host: envVars.REDIS_HOST,
    port: envVars.REDIS_PORT,
    password: envVars.REDIS_PASSWORD,
    db: envVars.REDIS_DB,
  },
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    allowedImageTypes: envVars.ALLOWED_IMAGE_TYPES.split(','),
  },
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
  security: {
    corsOrigin: envVars.CORS_ORIGIN,
    rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS,
    rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS,
  },
};

export default config;
