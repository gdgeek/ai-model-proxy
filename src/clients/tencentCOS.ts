import COS from 'cos-nodejs-sdk-v5';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from '../utils/logger';
import { COSUploadParams, COSUploadResult, COSParams, COSMetadata } from '../types';
import { ExternalServiceError, GatewayTimeoutError } from '../types/errors';

export class TencentCOSClient {
  private client: COS;
  private readonly bucket: string;
  private readonly region: string;

  constructor() {
    this.bucket = config.cos.bucket;
    this.region = config.cos.region;

    this.client = new COS({
      SecretId: config.cos.secretId,
      SecretKey: config.cos.secretKey,
      FileParallelLimit: 3,
      ChunkParallelLimit: 8,
      ChunkSize: 1024 * 1024 * 8, // 8MB
    });
  }

  /**
   * 上传文件到COS
   */
  async putObject(params: COSUploadParams): Promise<COSUploadResult> {
    try {
      logger.debug('Uploading file to COS:', {
        bucket: params.Bucket,
        key: params.Key,
        contentType: params.ContentType,
        size: params.Body.length,
      });

      const result = await new Promise<COSUploadResult>((resolve, reject) => {
        this.client.putObject(
          {
            Bucket: params.Bucket,
            Region: params.Region,
            Key: params.Key,
            Body: params.Body,
            ContentType: params.ContentType || 'application/octet-stream',
            ACL: (params.ACL as any) || 'public-read',
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                Location: data.Location,
                Bucket: params.Bucket, // 使用参数中的Bucket
                Key: params.Key, // 使用参数中的Key
                ETag: data.ETag,
              });
            }
          }
        );
      });

      logger.info('File uploaded to COS successfully:', {
        location: result.Location,
        key: result.Key,
        etag: result.ETag,
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to upload file to COS:', error);

      if (error?.code === 'RequestTimeout') {
        throw new GatewayTimeoutError('COS上传超时');
      }

      throw new ExternalServiceError(
        'Tencent COS',
        `文件上传失败: ${error?.message || '未知错误'}`,
        error
      );
    }
  }

  /**
   * 生成预签名URL
   */
  async getSignedUrl(_operation: string, params: COSParams): Promise<string> {
    try {
      const url = await new Promise<string>((resolve, reject) => {
        this.client.getObjectUrl(
          {
            Bucket: params.Bucket,
            Region: params.Region,
            Key: params.Key,
            Sign: true,
            Expires: 3600, // 1小时有效期
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              resolve(data.Url);
            }
          }
        );
      });

      logger.debug('Generated signed URL for COS object:', {
        key: params.Key,
        url: url.substring(0, 100) + '...', // 只记录URL的前100个字符
      });

      return url;
    } catch (error: any) {
      logger.error('Failed to generate signed URL:', error);
      throw new ExternalServiceError(
        'Tencent COS',
        `生成预签名URL失败: ${error?.message || '未知错误'}`,
        error
      );
    }
  }

  /**
   * 获取对象元数据
   */
  async headObject(params: COSParams): Promise<COSMetadata> {
    try {
      const result = await new Promise<COSMetadata>((resolve, reject) => {
        this.client.headObject(
          {
            Bucket: params.Bucket,
            Region: params.Region,
            Key: params.Key,
          },
          (err, data) => {
            if (err) {
              reject(err);
            } else {
              const headers = data.headers || {};
              resolve({
                'Content-Length': headers['content-length'] || '0',
                'Content-Type': headers['content-type'] || 'application/octet-stream',
                ETag: headers['etag'] || '',
                'Last-Modified': headers['last-modified'] || '',
              });
            }
          }
        );
      });

      logger.debug('Retrieved object metadata from COS:', {
        key: params.Key,
        contentLength: result['Content-Length'],
        contentType: result['Content-Type'],
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to get object metadata from COS:', error);
      throw new ExternalServiceError(
        'Tencent COS',
        `获取对象元数据失败: ${error?.message || '未知错误'}`,
        error
      );
    }
  }

  /**
   * 上传模型文件（带自动文件名生成）
   */
  async uploadModel(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<COSUploadResult> {
    try {
      // 生成唯一文件名
      const fileExtension = this.getFileExtension(originalName);
      const uniqueKey = this.generateUniqueKey(fileExtension);

      const params: COSUploadParams = {
        Bucket: this.bucket,
        Region: this.region,
        Key: uniqueKey,
        Body: fileBuffer,
        ContentType: mimeType,
        ACL: 'public-read',
      };

      return await this.putObject(params);
    } catch (error) {
      logger.error('Failed to upload model to COS:', error);
      throw error;
    }
  }

  /**
   * 验证文件完整性
   */
  async validateFileIntegrity(key: string, expectedSize?: number): Promise<boolean> {
    try {
      const metadata = await this.headObject({
        Bucket: this.bucket,
        Region: this.region,
        Key: key,
      });

      if (expectedSize && parseInt(metadata['Content-Length']) !== expectedSize) {
        logger.warn('File size mismatch:', {
          key,
          expected: expectedSize,
          actual: metadata['Content-Length'],
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to validate file integrity:', error);
      return false;
    }
  }

  /**
   * 生成唯一文件键
   */
  private generateUniqueKey(extension: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uuid = uuidv4();
    return `models/${timestamp}/${uuid}${extension}`;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 尝试列出存储桶来检查连接
      await new Promise<void>((resolve, reject) => {
        this.client.getBucket(
          {
            Bucket: this.bucket,
            Region: this.region,
            MaxKeys: 1,
          },
          err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });

      return true;
    } catch (error) {
      logger.warn('Tencent COS健康检查失败:', error);
      return false;
    }
  }

  /**
   * 删除对象（用于清理）
   */
  async deleteObject(key: string): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        this.client.deleteObject(
          {
            Bucket: this.bucket,
            Region: this.region,
            Key: key,
          },
          err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      });

      logger.info('Object deleted from COS:', { key });
    } catch (error: any) {
      logger.error('Failed to delete object from COS:', error);
      throw new ExternalServiceError(
        'Tencent COS',
        `删除对象失败: ${error?.message || '未知错误'}`,
        error
      );
    }
  }

  /**
   * 获取对象URL（公共读取）
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.cos.${this.region}.myqcloud.com/${key}`;
  }
}

// 导出单例实例
export const tencentCOSClient = new TencentCOSClient();
