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
      const payload = {
        type: input.type,
        data:
          input.type === 'text' ? input.data : Buffer.from(input.data as Buffer).toString('base64'),
        options: input.options,
      };

      const response = await this.retryRequest(() =>
        this.client.post('/generate', payload, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      return {
        success: true,
        jobId: response.data.jobId,
        message: response.data.message,
      };
    } catch (error) {
      logger.error('Failed to submit request to Tripo AI:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new GatewayTimeoutError('Tripo AI请求超时');
        }

        const status = error.response?.status;
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
        this.client.get(`/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
      );

      const data = response.data;

      return {
        jobId: data.jobId,
        status: data.status,
        progress: data.progress || 0,
        ...(data.result && {
          result: {
            downloadUrl: data.result.downloadUrl,
            thumbnailUrl: data.result.thumbnailUrl,
            metadata: data.result.metadata,
          },
        }),
        ...(data.error && {
          error: {
            code: data.error.code,
            message: data.error.message,
          },
        }),
      };
    } catch (error) {
      logger.error('Failed to get job status from Tripo AI:', error);

      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new GatewayTimeoutError('Tripo AI状态查询超时');
        }

        const status = error.response?.status;
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
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000, // 健康检查使用较短超时
      });

      return response.status === 200;
    } catch (error) {
      logger.warn('Tripo AI健康检查失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const tripoAIClient = new TripoAIClient();
