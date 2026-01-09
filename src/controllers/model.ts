import { Request, Response, NextFunction } from 'express';
import { modelGenerationService } from '../services/modelGeneration';
import { logger } from '../utils/logger';
import { ModelInput, ModelGenerationResponse } from '../types';
import { ValidationError, NotFoundError } from '../types/errors';
import { validateJobId, validateToken } from '../middleware/validation';

export class ModelController {
  /**
   * 创建模型生成任务
   * POST /api/v1/models
   */
  async createModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, input: textInput, token } = req.body;
      const requestId = req.requestId || 'unknown';

      logger.info('Creating model generation request:', {
        requestId,
        type,
        hasFile: !!req.file,
        hasTextInput: !!textInput,
      });

      // 验证令牌
      if (!validateToken(token)) {
        throw new ValidationError('无效的认证令牌格式');
      }

      // 准备模型输入
      let modelInput: ModelInput;

      if (type === 'image') {
        if (!req.file) {
          throw new ValidationError('图片类型请求必须包含图片文件');
        }

        modelInput = {
          type: 'image',
          data: req.file.buffer,
          filename: req.file.originalname,
          mimeType: req.file.mimetype,
        };
      } else if (type === 'text') {
        if (!textInput || typeof textInput !== 'string') {
          throw new ValidationError('文本类型请求必须包含有效的文本输入');
        }

        modelInput = {
          type: 'text',
          data: textInput,
        };
      } else {
        throw new ValidationError('不支持的输入类型');
      }

      // 提交生成请求
      const jobResponse = await modelGenerationService.submitGenerationRequest(modelInput, token);

      // 构建响应
      const response: ModelGenerationResponse = {
        jobId: jobResponse.jobId,
        status: jobResponse.status,
        message: jobResponse.message,
        ...(jobResponse.estimatedTime !== undefined && {
          estimatedTime: jobResponse.estimatedTime,
        }),
      };

      logger.info('Model generation request created:', {
        requestId,
        jobId: jobResponse.jobId,
        status: jobResponse.status,
      });

      res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create model generation request:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * 查询模型生成状态
   * GET /api/v1/models/:jobId/status
   */
  async getModelStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const requestId = req.requestId || 'unknown';

      logger.debug('Getting model status:', {
        requestId,
        jobId,
      });

      // 验证作业ID格式
      if (!jobId || !validateJobId(jobId)) {
        throw new ValidationError('无效的作业ID格式');
      }

      // 获取作业状态
      const jobStatus = await modelGenerationService.pollJobStatus(jobId);

      // 构建响应
      const response: ModelGenerationResponse = {
        jobId: jobStatus['jobId'],
        status: jobStatus.status,
        message: this.getStatusMessage(jobStatus.status),
        ...(jobStatus.status === 'completed' &&
          jobStatus.cosUrl && {
            result: {
              modelUrl: jobStatus.cosUrl,
              metadata: {
                fileSize: 0, // 实际实现中应该从文件元数据获取
                format: 'obj',
                generationTime: jobStatus.completedAt
                  ? jobStatus.completedAt.getTime() - jobStatus.createdAt.getTime()
                  : 0,
              },
            },
          }),
        ...(jobStatus.status === 'failed' &&
          jobStatus.error && {
            error: {
              code: jobStatus.error.code,
              message: jobStatus.error.message,
              details: jobStatus.error.details,
            },
          }),
      };

      logger.debug('Model status retrieved:', {
        requestId,
        jobId: jobStatus['jobId'],
        status: jobStatus.status,
        progress: jobStatus.progress,
      });

      res.json(response);
    } catch (error) {
      if (error instanceof NotFoundError) {
        logger.warn('Model job not found:', {
          requestId: req.requestId,
          jobId: req.params['jobId'],
        });
      } else {
        logger.error('Failed to get model status:', {
          requestId: req.requestId,
          jobId: req.params['jobId'],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      next(error);
    }
  }

  /**
   * 获取模型结果
   * GET /api/v1/models/:jobId/result
   */
  async getModelResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { jobId } = req.params;
      const requestId = req.requestId || 'unknown';

      logger.debug('Getting model result:', {
        requestId,
        jobId,
      });

      // 验证作业ID格式
      if (!jobId || !validateJobId(jobId)) {
        throw new ValidationError('无效的作业ID格式');
      }

      // 获取作业状态
      const jobStatus = await modelGenerationService.pollJobStatus(jobId);

      if (jobStatus.status !== 'completed') {
        throw new ValidationError(`作业尚未完成，当前状态: ${jobStatus.status}`);
      }

      if (!jobStatus.cosUrl) {
        throw new ValidationError('模型文件URL不可用');
      }

      // 构建响应
      const response: ModelGenerationResponse = {
        jobId: jobStatus['jobId'],
        status: jobStatus.status,
        message: '模型生成已完成',
        result: {
          modelUrl: jobStatus.cosUrl,
          metadata: {
            fileSize: 0, // 实际实现中应该从文件元数据获取
            format: 'obj',
            generationTime: jobStatus.completedAt
              ? jobStatus.completedAt.getTime() - jobStatus.createdAt.getTime()
              : 0,
          },
        },
      };

      logger.info('Model result retrieved:', {
        requestId,
        jobId: jobStatus['jobId'],
        modelUrl: jobStatus.cosUrl,
      });

      res.json(response);
    } catch (error) {
      logger.error('Failed to get model result:', {
        requestId: req.requestId,
        jobId: req.params['jobId'],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * 获取状态消息
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'pending':
        return '请求已提交，等待处理';
      case 'processing':
        return '正在生成模型';
      case 'completed':
        return '模型生成已完成';
      case 'failed':
        return '模型生成失败';
      default:
        return '未知状态';
    }
  }

  /**
   * 获取所有作业状态（调试用）
   * GET /api/v1/models/debug/jobs
   */
  async getAllJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.requestId || 'unknown';

      logger.debug('Getting all jobs for debug:', { requestId });

      const jobs = modelGenerationService.getAllJobs();

      res.json({
        total: jobs.length,
        jobs: jobs.map(job => ({
          jobId: job.jobId,
          status: job.status,
          progress: job.progress,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
          completedAt: job.completedAt,
        })),
      });
    } catch (error) {
      logger.error('Failed to get all jobs:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

// 导出单例实例
export const modelController = new ModelController();
