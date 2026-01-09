import crypto from 'crypto';
import axios from 'axios';
import { tencentCOSClient } from '../clients/tencentCOS';
import { logger } from '../utils/logger';
import { FileMetadata, UploadResult } from '../types';
import { ExternalServiceError, ValidationError } from '../types/errors';

export class FileStorageService {
  /**
   * 上传文件到COS
   */
  async uploadToCOS(
    file: Buffer,
    filename: string,
    metadata: Partial<FileMetadata>
  ): Promise<UploadResult> {
    try {
      logger.info('Uploading file to COS:', {
        filename,
        size: file.length,
        mimeType: metadata.mimeType,
      });

      // 验证文件
      this.validateFile(file, filename);

      // 计算文件哈希（用于日志记录）
      const hash = this.calculateFileHash(file);
      logger.debug('File hash calculated:', { filename, hash: hash.substring(0, 16) + '...' });

      // 上传到COS
      const uploadResult = await tencentCOSClient.uploadModel(
        file,
        filename,
        metadata.mimeType || 'application/octet-stream'
      );

      logger.info('File uploaded successfully:', {
        filename,
        location: uploadResult.Location,
        etag: uploadResult.ETag,
      });

      return {
        url: uploadResult.Location,
        key: uploadResult.Key,
        bucket: uploadResult.Bucket,
        etag: uploadResult.ETag,
      };
    } catch (error) {
      logger.error('Failed to upload file to COS:', error);
      throw error;
    }
  }

  /**
   * 从URL下载文件
   */
  async downloadFromURL(url: string): Promise<Buffer> {
    try {
      logger.info('Downloading file from URL:', { url: url.substring(0, 100) + '...' });

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000, // 60秒超时
        maxContentLength: 100 * 1024 * 1024, // 最大100MB
      });

      const buffer = Buffer.from(response.data);
      
      logger.info('File downloaded successfully:', {
        size: buffer.length,
        contentType: response.headers['content-type'],
      });

      return buffer;
    } catch (error) {
      logger.error('Failed to download file from URL:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new ExternalServiceError('Download', '文件下载超时');
        }
        
        const status = error.response?.status;
        throw new ExternalServiceError('Download', `文件下载失败 (${status}): ${error.message}`);
      }

      throw new ExternalServiceError('Download', '文件下载未知错误', error);
    }
  }

  /**
   * 验证文件完整性
   */
  async validateFileIntegrity(file: Buffer, expectedHash?: string): Promise<boolean> {
    try {
      // 基本验证
      if (!file || file.length === 0) {
        logger.warn('File validation failed: empty file');
        return false;
      }

      // 哈希验证
      if (expectedHash) {
        const actualHash = this.calculateFileHash(file);
        if (actualHash !== expectedHash) {
          logger.warn('File validation failed: hash mismatch', {
            expected: expectedHash,
            actual: actualHash,
          });
          return false;
        }
      }

      // 文件大小验证（最大100MB）
      const maxSize = 100 * 1024 * 1024;
      if (file.length > maxSize) {
        logger.warn('File validation failed: file too large', {
          size: file.length,
          maxSize,
        });
        return false;
      }

      logger.debug('File validation passed:', {
        size: file.length,
        hash: expectedHash ? 'verified' : 'not checked',
      });

      return true;
    } catch (error) {
      logger.error('File validation error:', error);
      return false;
    }
  }

  /**
   * 验证文件格式
   */
  validateFileFormat(file: Buffer, expectedMimeType?: string): boolean {
    try {
      // 基于文件头检测文件类型
      const fileSignature = this.getFileSignature(file);
      
      if (expectedMimeType) {
        const detectedType = this.detectMimeTypeFromSignature(fileSignature);
        if (detectedType && detectedType !== expectedMimeType) {
          logger.warn('File format validation failed: type mismatch', {
            expected: expectedMimeType,
            detected: detectedType,
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('File format validation error:', error);
      return false;
    }
  }

  /**
   * 计算文件哈希
   */
  private calculateFileHash(file: Buffer): string {
    return crypto.createHash('sha256').update(file).digest('hex');
  }

  /**
   * 验证文件
   */
  private validateFile(file: Buffer, filename: string): void {
    if (!file || file.length === 0) {
      throw new ValidationError('文件不能为空');
    }

    if (!filename || filename.trim().length === 0) {
      throw new ValidationError('文件名不能为空');
    }

    // 检查文件名中的危险字符
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
      throw new ValidationError('文件名包含非法字符');
    }

    // 检查文件大小
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.length > maxSize) {
      throw new ValidationError(`文件过大，最大允许 ${maxSize} bytes`);
    }
  }

  /**
   * 获取文件签名（前16字节）
   */
  private getFileSignature(file: Buffer): string {
    const signatureLength = Math.min(16, file.length);
    return file.subarray(0, signatureLength).toString('hex').toLowerCase();
  }

  /**
   * 从文件签名检测MIME类型
   */
  private detectMimeTypeFromSignature(signature: string): string | null {
    // 常见文件类型的魔数
    const signatures: { [key: string]: string } = {
      'ffd8ff': 'image/jpeg',
      '89504e47': 'image/png',
      '52494646': 'image/webp', // RIFF (WebP容器)
      '474946': 'image/gif',
      '25504446': 'application/pdf',
      '504b0304': 'application/zip',
      '504b0506': 'application/zip',
      '504b0708': 'application/zip',
    };

    for (const [sig, mimeType] of Object.entries(signatures)) {
      if (signature.startsWith(sig)) {
        return mimeType;
      }
    }

    return null;
  }

  /**
   * 生成文件元数据
   */
  generateFileMetadata(
    file: Buffer,
    originalName: string,
    mimeType: string,
    cosKey: string,
    cosUrl: string
  ): FileMetadata {
    return {
      originalName,
      mimeType,
      size: file.length,
      hash: this.calculateFileHash(file),
      uploadedAt: new Date(),
      cosKey,
      cosUrl,
    };
  }

  /**
   * 清理临时文件
   */
  async cleanupTempFiles(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await tencentCOSClient.deleteObject(key);
        logger.info('Temporary file cleaned up:', { key });
      } catch (error) {
        logger.warn('Failed to cleanup temporary file:', { key, error });
      }
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(key: string): Promise<FileMetadata | null> {
    try {
      const metadata = await tencentCOSClient.headObject({
        Bucket: tencentCOSClient['bucket'], // 访问私有属性
        Region: tencentCOSClient['region'],
        Key: key,
      });

      return {
        originalName: key.split('/').pop() || key,
        mimeType: metadata['Content-Type'],
        size: parseInt(metadata['Content-Length']),
        hash: metadata.ETag.replace(/"/g, ''), // 移除引号
        uploadedAt: new Date(metadata['Last-Modified']),
        cosKey: key,
        cosUrl: tencentCOSClient.getPublicUrl(key),
      };
    } catch (error) {
      logger.error('Failed to get file info:', error);
      return null;
    }
  }

  /**
   * 批量上传文件
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; filename: string; mimeType?: string }>
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    
    for (const file of files) {
      try {
        const result = await this.uploadToCOS(file.buffer, file.filename, {
          ...(file.mimeType && { mimeType: file.mimeType }),
        });
        results.push(result);
      } catch (error) {
        logger.error('Failed to upload file in batch:', {
          filename: file.filename,
          error,
        });
        throw error;
      }
    }

    return results;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await tencentCOSClient.healthCheck();
    } catch (error) {
      logger.warn('File storage health check failed:', error);
      return false;
    }
  }
}

// 导出单例实例
export const fileStorageService = new FileStorageService();