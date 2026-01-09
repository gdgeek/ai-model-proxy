import swaggerJSDoc from 'swagger-jsdoc';
import { config } from '../config';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI模型代理服务 API',
      version: '1.0.0',
      description: '用于转发Tripo AI和腾讯云COS的后端服务API文档',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}`,
        description: '开发服务器',
      },
      {
        url: 'https://api.example.com',
        description: '生产服务器',
      },
    ],
    components: {
      schemas: {
        ModelGenerationRequest: {
          type: 'object',
          required: ['type', 'token'],
          properties: {
            type: {
              type: 'string',
              enum: ['image', 'text'],
              description: '输入类型',
              example: 'image',
            },
            input: {
              type: 'string',
              description: '文本输入（当type为text时必需）',
              example: '一个现代风格的椅子',
            },
            token: {
              type: 'string',
              description: 'Tripo AI认证令牌',
              example: 'your-tripo-api-token',
            },
            options: {
              type: 'object',
              properties: {
                quality: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: '生成质量',
                  example: 'high',
                },
                format: {
                  type: 'string',
                  enum: ['obj', 'fbx', 'gltf'],
                  description: '输出格式',
                  example: 'obj',
                },
                timeout: {
                  type: 'number',
                  minimum: 1000,
                  maximum: 300000,
                  description: '超时时间（毫秒）',
                  example: 60000,
                },
              },
            },
          },
        },
        ModelGenerationResponse: {
          type: 'object',
          properties: {
            jobId: {
              type: 'string',
              format: 'uuid',
              description: '作业ID',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              description: '作业状态',
              example: 'pending',
            },
            message: {
              type: 'string',
              description: '状态消息',
              example: '请求已提交，等待处理',
            },
            estimatedTime: {
              type: 'number',
              description: '预估完成时间（秒）',
              example: 120,
            },
            result: {
              type: 'object',
              properties: {
                modelUrl: {
                  type: 'string',
                  format: 'uri',
                  description: '模型文件URL',
                  example: 'https://cos.example.com/models/model-123.obj',
                },
                metadata: {
                  type: 'object',
                  properties: {
                    fileSize: {
                      type: 'number',
                      description: '文件大小（字节）',
                      example: 1048576,
                    },
                    format: {
                      type: 'string',
                      description: '文件格式',
                      example: 'obj',
                    },
                    generationTime: {
                      type: 'number',
                      description: '生成耗时（毫秒）',
                      example: 45000,
                    },
                  },
                },
              },
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: '错误代码',
                  example: 'GENERATION_FAILED',
                },
                message: {
                  type: 'string',
                  description: '错误消息',
                  example: '模型生成失败',
                },
                details: {
                  type: 'string',
                  description: '错误详情',
                  example: 'Invalid input format',
                },
              },
            },
          },
        },
        HealthCheckResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy', 'unhealthy'],
              description: '健康状态',
              example: 'healthy',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: '检查时间',
              example: '2024-01-01T00:00:00.000Z',
            },
            uptime: {
              type: 'number',
              description: '运行时间（秒）',
              example: 3600,
            },
            dependencies: {
              type: 'object',
              properties: {
                redis: {
                  type: 'boolean',
                  description: 'Redis连接状态',
                  example: true,
                },
                tripo: {
                  type: 'boolean',
                  description: 'Tripo AI连接状态',
                  example: true,
                },
                cos: {
                  type: 'boolean',
                  description: '腾讯云COS连接状态',
                  example: true,
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: '错误代码',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  description: '错误消息',
                  example: '请求验证失败',
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: '错误时间',
                  example: '2024-01-01T00:00:00.000Z',
                },
                requestId: {
                  type: 'string',
                  description: '请求ID',
                  example: 'req-123456',
                },
                details: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'array', items: { type: 'object' } },
                  ],
                  description: '错误详情',
                },
              },
              required: ['code', 'message', 'timestamp'],
            },
          },
        },
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      {
        name: 'Models',
        description: '模型生成相关API',
      },
      {
        name: 'Health',
        description: '健康检查相关API',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);