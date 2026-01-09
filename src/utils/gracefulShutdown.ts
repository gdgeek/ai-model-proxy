import { Server } from 'http';
import { logger } from './logger';
import { cacheService } from '../services/cache';

export class GracefulShutdown {
  private server: Server | null = null;
  private isShuttingDown = false;
  private activeConnections = new Set<any>();
  private shutdownTimeout = 30000; // 30秒超时

  /**
   * 注册服务器实例
   */
  registerServer(server: Server): void {
    this.server = server;
    
    // 跟踪活跃连接
    server.on('connection', (connection) => {
      this.activeConnections.add(connection);
      
      connection.on('close', () => {
        this.activeConnections.delete(connection);
      });
    });
  }

  /**
   * 设置关闭超时时间
   */
  setShutdownTimeout(timeout: number): void {
    this.shutdownTimeout = timeout;
  }

  /**
   * 初始化优雅关闭处理器
   */
  init(): void {
    // 处理各种关闭信号
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGUSR2', () => this.handleShutdown('SIGUSR2')); // nodemon重启
    
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.handleShutdown('uncaughtException');
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.handleShutdown('unhandledRejection');
    });

    logger.info('Graceful shutdown handlers initialized');
  }

  /**
   * 处理关闭信号
   */
  private async handleShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn(`Already shutting down, ignoring ${signal}`);
      return;
    }

    this.isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    // 设置强制退出超时
    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // 1. 停止接受新连接
      if (this.server) {
        logger.info('Closing HTTP server...');
        await this.closeServer();
      }

      // 2. 等待活跃连接完成
      await this.waitForActiveConnections();

      // 3. 关闭外部服务连接
      await this.closeExternalServices();

      // 4. 清理资源
      await this.cleanup();

      logger.info('Graceful shutdown completed');
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }

  /**
   * 关闭HTTP服务器
   */
  private closeServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error) => {
        if (error) {
          logger.error('Error closing HTTP server:', error);
          reject(error);
        } else {
          logger.info('HTTP server closed');
          resolve();
        }
      });
    });
  }

  /**
   * 等待活跃连接完成
   */
  private async waitForActiveConnections(): Promise<void> {
    if (this.activeConnections.size === 0) {
      logger.info('No active connections to wait for');
      return;
    }

    logger.info(`Waiting for ${this.activeConnections.size} active connections to close...`);

    const maxWaitTime = 10000; // 最多等待10秒
    const startTime = Date.now();

    while (this.activeConnections.size > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.activeConnections.size > 0) {
      logger.warn(`Forcefully closing ${this.activeConnections.size} remaining connections`);
      this.activeConnections.forEach(connection => {
        connection.destroy();
      });
    } else {
      logger.info('All active connections closed gracefully');
    }
  }

  /**
   * 关闭外部服务连接
   */
  private async closeExternalServices(): Promise<void> {
    logger.info('Closing external service connections...');

    try {
      // 关闭Redis连接
      await cacheService.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }

    // 这里可以添加其他外部服务的关闭逻辑
    // 例如：数据库连接、消息队列等
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    logger.info('Performing final cleanup...');

    // 清理定时器、事件监听器等
    // 这里可以添加其他清理逻辑

    logger.info('Cleanup completed');
  }

  /**
   * 检查是否正在关闭
   */
  isShuttingDownNow(): boolean {
    return this.isShuttingDown;
  }

  /**
   * 手动触发关闭（用于测试）
   */
  async shutdown(): Promise<void> {
    await this.handleShutdown('manual');
  }
}

// 导出单例实例
export const gracefulShutdown = new GracefulShutdown();