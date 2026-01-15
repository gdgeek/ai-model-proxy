import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { TripoInput, TripoResponse, TripoJobStatus } from '../types';
import { ExternalServiceError, GatewayTimeoutError } from '../types/errors';

export class TripoAIClient {
  private client: AxiosInstance;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  constructor() {
    this.baseURL = config.tripo.apiUrl;
    this.timeout = config.tripo.timeout;
    this.maxRetries = config.tripo.maxRetries;
    this.retryDelay = config.tripo.retryDelay;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Model-Proxy/1.0.0',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      config => {
        logger.debug('Tripo AI request:', {
          method: config.method,
          url: config.url,
          headers: config.headers,
        });
        return config;
      },
      error => {
        logger.error('Tripo AI request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      response => {
        logger.debug('Tripo AI response:', {
          status: response.status,
          data: response.data,
        });
        return response;
      },
      error => {
        logger.error('Tripo AI response error:', {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * 提交生成请求到Tripo AI
   */
  async submitRequest(input: TripoInput, token: string): Promise<TripoResponse> {
    try {
      // 构建符合 Tripo AI v2 API 的请求格式
      const payload: any = {
        type: input.type === 'text' ? 'text_to_model' : 'image_to_model',
      };

      if (input.type === 'text') {
        payload.prompt = input.data;
      } else {
        payload.file = {
          type: 'png', // 默认使用 png，实际应该根据文件类型判断
          file_token: Buffer.from(input.data as Buffer).toString('base64'),
        };
      }

      // 不指定 model_version，使用默认版本

      const response = await this.retryRequest(() =>
        this.client.post('/v2/openapi/task', payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      // 处理 Tripo AI v2 API 响应格式
      const data = response.data;
      
      if (data.code !== 0) {
        throw new ExternalServiceError('Tripo AI', data.message || '请求失败', {
          code: data.code,
          suggestion: data.suggestion,
        });
      }

      return {
        success: true,
        jobId: data.data.task_id,
        message: '任务创建成功',
      };
    } catch (error) {
      logger.error('Failed to submit request to Tripo AI:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new GatewayTimeoutError('Tripo AI请求超时');
        }

        const status = error.response?.status;
        const responseData = error.response?.data;
        
        // 处理 Tripo AI 特定错误格式
        if (responseData?.code) {
          const message = responseData.message || error.message;
          const suggestion = responseData.suggestion ? ` (${responseData.suggestion})` : '';
          throw new ExternalServiceError('Tripo AI', `${message}${suggestion}`, {
            code: responseData.code,
            status,
          });
        }

        const message = error.response?.data?.message || error.message;
        throw new ExternalServiceError('Tripo AI', `请求失败 (${status}): ${message}`, {
          status,
          data: error.response?.data,
        });
      }

      throw new ExternalServiceError('Tripo AI', '未知错误', error);
    }
  }

  /**
   * 查询作业状态
   */
  async getJobStatus(jobId: string, token: string): Promise<TripoJobStatus> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get(`/v2/openapi/task/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      const responseData = response.data;

      // 处理 Tripo AI v2 API 错误响应
      if (responseData.code !== 0) {
        throw new ExternalServiceError('Tripo AI', responseData.message || '状态查询失败', {
          code: responseData.code,
          suggestion: responseData.suggestion,
        });
      }

      const data = responseData.data;

      // 映射 Tripo AI 状态到我们的状态格式
      // Tripo AI 状态: queued, running, success, failed
      // 我们的状态: pending, processing, completed, failed
      const statusMap: Record<string, string> = {
        queued: 'pending',
        running: 'processing',
        success: 'completed',
        failed: 'failed',
      };

      const result: TripoJobStatus = {
        jobId: data.task_id,
        status: statusMap[data.status] || data.status,
        progress: data.progress || 0,
      };

      // 如果任务成功，添加结果信息
      if (data.status === 'success' && data.output) {
        result.result = {
          downloadUrl: data.output.pbr_model || data.output.model || '',
          thumbnailUrl: data.output.rendered_image || data.output.pbr_image || '',
          metadata: {
            format: 'glb',
            ...data.output,
          },
        };
      }

      // 如果任务失败，添加错误信息
      if (data.status === 'failed') {
        result.error = {
          code: 'GENERATION_FAILED',
          message: data.error_message || '生成失败',
        };
      }

      return result;
    } catch (error) {
      logger.error('Failed to get job status from Tripo AI:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new GatewayTimeoutError('Tripo AI状态查询超时');
        }

        const status = error.response?.status;
        const responseData = error.response?.data;

        // 处理 Tripo AI 特定错误格式
        if (responseData?.code) {
          const message = responseData.message || error.message;
          const suggestion = responseData.suggestion ? ` (${responseData.suggestion})` : '';
          throw new ExternalServiceError('Tripo AI', `${message}${suggestion}`, {
            code: responseData.code,
            status,
          });
        }

        const message = error.response?.data?.message || error.message;
        throw new ExternalServiceError('Tripo AI', `状态查询失败 (${status}): ${message}`, {
          status,
          data: error.response?.data,
        });
      }

      throw new ExternalServiceError('Tripo AI', '状态查询未知错误', error);
    }
  }

  /**
   * 下载生成的模型
   */
  async downloadModel(downloadUrl: string): Promise<Buffer> {
    try {
      const response = await this.retryRequest(() =>
        this.client.get(downloadUrl, {
          responseType: 'arraybuffer',
          timeout: this.timeout * 2, // 下载文件需要更长时间
        })
      );

      return Buffer.from(response.data);
    } catch (error) {
      logger.error('Failed to download model from Tripo AI:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new GatewayTimeoutError('模型下载超时');
        }

        const status = error.response?.status;
        const message = error.response?.data?.message || error.message;

        throw new ExternalServiceError('Tripo AI', `模型下载失败 (${status}): ${message}`, {
          status,
          data: error.response?.data,
        });
      }

      throw new ExternalServiceError('Tripo AI', '模型下载未知错误', error);
    }
  }

  /**
   * 重试机制
   */
  private async retryRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retryCount: number = 0
  ): Promise<AxiosResponse<T>> {
    try {
      return await requestFn();
    } catch (error) {
      if (retryCount >= this.maxRetries) {
        throw error;
      }

      // 只对特定错误进行重试
      if (axios.isAxiosError(error)) {
        const shouldRetry =
          error.code === 'ECONNABORTED' || // 超时
          error.code === 'ECONNRESET' || // 连接重置
          error.code === 'ENOTFOUND' || // DNS错误
          (error.response?.status && error.response.status >= 500); // 服务器错误

        if (!shouldRetry) {
          throw error;
        }
      }

      const delay = this.retryDelay * Math.pow(2, retryCount); // 指数退避
      logger.warn(`Tripo AI请求失败，${delay}ms后重试 (${retryCount + 1}/${this.maxRetries})`, {
        error: (error as any)?.message || '未知错误',
      });

      await this.sleep(delay);
      return this.retryRequest(requestFn, retryCount + 1);
    }
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查
   * 注意：Tripo AI 没有专门的健康检查端点，这里简单返回 true
   * 实际的连接性会在真实请求时验证
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Tripo AI v2 API 没有健康检查端点
      // 我们可以尝试访问根路径或直接返回 true
      // 真实的连接性会在实际请求时验证
      return true;
    } catch (error) {
      logger.warn('Tripo AI健康检查失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const tripoAIClient = new TripoAIClient();
