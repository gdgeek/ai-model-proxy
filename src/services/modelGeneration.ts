import { v4 as uuidv4 } from 'uuid';
import { tripoAIClient } from '../clients/tripoAI';
import { tencentCOSClient } from '../clients/tencentCOS';
import { logger } from '../utils/logger';
import { ModelInput, JobResponse, JobStatus, ModelResult, TripoInput } from '../types';
import { ExternalServiceError, NotFoundError, AppError } from '../types/errors';

export class ModelGenerationService {
  private jobs: Map<string, JobStatus> = new Map();
  private pollingIntervals: Map<string, ReturnType<typeof setTimeout>> = new Map();

  /**
   * 提交模型生成请求
   */
  async submitGenerationRequest(input: ModelInput, token: string): Promise<JobResponse> {
    try {
      const jobId = uuidv4();

      logger.info('Submitting model generation request:', {
        jobId,
        type: input.type,
        filename: input.filename,
      });

      // 创建初始作业状态
      const jobStatus: JobStatus = {
        jobId,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.jobs.set(jobId, jobStatus);

      // 准备Tripo AI输入
      const tripoInput: TripoInput = {
        type: input.type,
        data: input.data,
        options: {
          quality: 'medium', // 默认质量
          format: 'obj', // 默认格式
        },
      };

      // 异步处理模型生成
      this.processModelGenerationAsync(jobId, tripoInput, token);

      return {
        jobId,
        status: 'pending',
        message: '模型生成请求已提交',
        estimatedTime: 300, // 5分钟估计时间
      };
    } catch (error) {
      logger.error('Failed to submit generation request:', error);
      throw error;
    }
  }

  /**
   * 轮询作业状态
   */
  async pollJobStatus(jobId: string): Promise<JobStatus> {
    const jobStatus = this.jobs.get(jobId);

    if (!jobStatus) {
      throw new NotFoundError(`作业 ${jobId} 未找到`);
    }

    return { ...jobStatus };
  }

  /**
   * 处理完整的模型生成流程
   */
  async processModelGeneration(input: ModelInput, token: string): Promise<ModelResult> {
    const response = await this.submitGenerationRequest(input, token);

    // 等待作业完成
    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const status = await this.pollJobStatus(response.jobId);

          if (status.status === 'completed' && status.cosUrl) {
            resolve({
              jobId: response.jobId,
              status: 'completed',
              modelUrl: status.cosUrl,
              metadata: {
                fileSize: 0, // 将在实际实现中填充
                format: 'obj',
                generationTime: Date.now() - status.createdAt.getTime(),
              },
            });
          } else if (status.status === 'failed') {
            reject(new AppError(status.error?.message || '模型生成失败', 500, 'GENERATION_FAILED'));
          } else {
            // 继续轮询
            setTimeout(checkStatus, 5000);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkStatus();
    });
  }

  /**
   * 异步处理模型生成
   */
  private async processModelGenerationAsync(
    jobId: string,
    input: TripoInput,
    token: string
  ): Promise<void> {
    try {
      // 更新状态为处理中
      this.updateJobStatus(jobId, {
        status: 'processing',
        progress: 10,
        updatedAt: new Date(),
      });

      // 提交到Tripo AI
      const tripoResponse = await tripoAIClient.submitRequest(input, token);

      if (!tripoResponse.success || !tripoResponse.jobId) {
        throw new ExternalServiceError('Tripo AI', '提交请求失败');
      }

      // 更新Tripo作业ID
      this.updateJobStatus(jobId, {
        tripoJobId: tripoResponse.jobId,
        progress: 20,
        updatedAt: new Date(),
      });

      // 开始轮询Tripo AI状态
      this.startPolling(jobId, tripoResponse.jobId, token);
    } catch (error) {
      logger.error('Model generation failed:', error);

      this.updateJobStatus(jobId, {
        status: 'failed',
        error: {
          code: 'GENERATION_FAILED',
          message: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date(),
        },
        updatedAt: new Date(),
      });
    }
  }

  /**
   * 开始轮询Tripo AI状态
   */
  private startPolling(jobId: string, tripoJobId: string, token: string): void {
    let retryCount = 0;
    const maxRetries = 60; // 最多轮询60次（5分钟）
    const baseInterval = 5000; // 基础间隔5秒

    const poll = async () => {
      try {
        const tripoStatus = await tripoAIClient.getJobStatus(tripoJobId, token);

        // 更新进度
        const progress = Math.min(20 + tripoStatus.progress * 0.6, 80);
        this.updateJobStatus(jobId, {
          progress,
          updatedAt: new Date(),
        });

        if (tripoStatus.status === 'completed' && tripoStatus.result) {
          // 下载并上传模型
          await this.downloadAndUploadModel(jobId, tripoStatus.result.downloadUrl);
        } else if (tripoStatus.status === 'failed') {
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: {
              code: 'TRIPO_GENERATION_FAILED',
              message: tripoStatus.error?.message || 'Tripo AI生成失败',
              timestamp: new Date(),
            },
            updatedAt: new Date(),
          });
        } else if (retryCount >= maxRetries) {
          // 超时
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: {
              code: 'GENERATION_TIMEOUT',
              message: '模型生成超时',
              timestamp: new Date(),
            },
            updatedAt: new Date(),
          });
        } else {
          // 继续轮询，使用指数退避
          retryCount++;
          const delay = Math.min(baseInterval * Math.pow(1.2, retryCount), 30000); // 最大30秒

          const timeoutId = setTimeout(poll, delay);
          this.pollingIntervals.set(jobId, timeoutId);
        }
      } catch (error) {
        logger.error('Polling error:', error);
        retryCount++;

        if (retryCount >= maxRetries) {
          this.updateJobStatus(jobId, {
            status: 'failed',
            error: {
              code: 'POLLING_FAILED',
              message: '状态轮询失败',
              timestamp: new Date(),
            },
            updatedAt: new Date(),
          });
        } else {
          // 重试轮询
          const delay = Math.min(baseInterval * Math.pow(1.5, retryCount), 30000);
          const timeoutId = setTimeout(poll, delay);
          this.pollingIntervals.set(jobId, timeoutId);
        }
      }
    };

    // 开始轮询
    poll();
  }

  /**
   * 下载并上传模型到COS
   */
  private async downloadAndUploadModel(jobId: string, downloadUrl: string): Promise<void> {
    try {
      logger.info('Downloading model from Tripo AI:', { jobId, downloadUrl });

      // 更新进度
      this.updateJobStatus(jobId, {
        progress: 85,
        updatedAt: new Date(),
      });

      // 从Tripo AI下载模型
      const modelBuffer = await tripoAIClient.downloadModel(downloadUrl);

      // 上传到COS
      logger.info('Uploading model to COS:', { jobId, size: modelBuffer.length });

      const uploadResult = await tencentCOSClient.uploadModel(
        modelBuffer,
        `model_${jobId}.obj`,
        'application/octet-stream'
      );

      // 完成作业
      this.updateJobStatus(jobId, {
        status: 'completed',
        progress: 100,
        cosUrl: uploadResult.Location,
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info('Model generation completed:', {
        jobId,
        cosUrl: uploadResult.Location,
      });
    } catch (error) {
      logger.error('Failed to download and upload model:', error);

      this.updateJobStatus(jobId, {
        status: 'failed',
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : '模型上传失败',
          timestamp: new Date(),
        },
        updatedAt: new Date(),
      });
    }
  }

  /**
   * 更新作业状态
   */
  private updateJobStatus(jobId: string, updates: Partial<JobStatus>): void {
    const currentStatus = this.jobs.get(jobId);
    if (currentStatus) {
      const updatedStatus = { ...currentStatus, ...updates };
      this.jobs.set(jobId, updatedStatus);

      // 如果作业完成或失败，清理轮询
      if (updates.status === 'completed' || updates.status === 'failed') {
        this.cleanupPolling(jobId);
      }
    }
  }

  /**
   * 清理轮询
   */
  private cleanupPolling(jobId: string): void {
    const timeoutId = this.pollingIntervals.get(jobId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pollingIntervals.delete(jobId);
    }
  }

  /**
   * 获取所有作业状态（用于调试）
   */
  getAllJobs(): JobStatus[] {
    return Array.from(this.jobs.values());
  }

  /**
   * 清理过期作业
   */
  cleanupExpiredJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const now = Date.now();
    const expiredJobs: string[] = [];

    for (const [jobId, status] of this.jobs.entries()) {
      const age = now - status.createdAt.getTime();
      if (age > maxAge) {
        expiredJobs.push(jobId);
      }
    }

    for (const jobId of expiredJobs) {
      this.cleanupPolling(jobId);
      this.jobs.delete(jobId);
      logger.info('Cleaned up expired job:', { jobId });
    }
  }
}

// 导出单例实例
export const modelGenerationService = new ModelGenerationService();
