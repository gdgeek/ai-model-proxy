import { Request, Response, NextFunction } from 'express';
import { tripoAIClient } from '../clients/tripoAI';
import { tencentCOSClient } from '../clients/tencentCOS';
import { cacheService } from '../services/cache';
import { logger } from '../utils/logger';
import { HealthCheckResponse, ReadinessCheckResponse } from '../types';

export class HealthController {
  /**
   * 健康检查端点
   * GET /health
   */
  async healthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.requestId || 'unknown';
      
      logger.debug('Health check requested:', { requestId });

      // 基本健康检查
      const response: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      };

      logger.debug('Health check completed:', {
        requestId,
        status: response.status,
        uptime: response.uptime,
      });

      res.status(200).json(response);
    } catch (error) {
      logger.error('Health check failed:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * 就绪检查端点
   * GET /ready
   */
  async readinessCheck(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const requestId = req.requestId || 'unknown';
      
      logger.debug('Readiness check requested:', { requestId });

      // 检查外部依赖
      const checks = await this.performDependencyChecks();
      
      const allReady = Object.values(checks).every(check => check === true);
      const status = allReady ? 'ready' : 'not_ready';

      const response: ReadinessCheckResponse = {
        status,
        timestamp: new Date().toISOString(),
        checks,
      };

      const statusCode = allReady ? 200 : 503;

      logger.info('Readiness check completed:', {
        requestId,
        status,
        checks,
      });

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Readiness check failed:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const response: ReadinessCheckResponse = {
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          error: false,
        },
      };

      res.status(503).json(response);
    }
  }

  /**
   * 详细健康检查端点
   * GET /health/detailed
   */
  async detailedHealthCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.requestId || 'unknown';
      
      logger.debug('Detailed health check requested:', { requestId });

      // 检查外部依赖
      const dependencies = await this.performDependencyChecks();
      
      const allHealthy = Object.values(dependencies).every(check => check === true);
      const status = allHealthy ? 'healthy' : 'unhealthy';

      const response: HealthCheckResponse = {
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        dependencies,
      };

      const statusCode = allHealthy ? 200 : 503;

      logger.info('Detailed health check completed:', {
        requestId,
        status,
        dependencies,
      });

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Detailed health check failed:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * 系统信息端点
   * GET /health/info
   */
  async systemInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.requestId || 'unknown';
      
      logger.debug('System info requested:', { requestId });

      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const systemInfo = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        env: process.env['NODE_ENV'] || 'development',
      };

      logger.debug('System info retrieved:', {
        requestId,
        uptime: systemInfo.uptime,
        memoryUsed: systemInfo.memory.heapUsed,
      });

      res.json(systemInfo);
    } catch (error) {
      logger.error('Failed to get system info:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }

  /**
   * 执行依赖检查
   */
  private async performDependencyChecks(): Promise<Record<string, boolean>> {
    const checks: Record<string, boolean> = {};

    // 检查Redis连接
    try {
      checks['redis'] = await cacheService.healthCheck();
    } catch (error) {
      logger.warn('Redis health check failed:', error);
      checks['redis'] = false;
    }

    // 检查Tripo AI连接
    try {
      checks['tripo'] = await tripoAIClient.healthCheck();
    } catch (error) {
      logger.warn('Tripo AI health check failed:', error);
      checks['tripo'] = false;
    }

    // 检查腾讯云COS连接
    try {
      checks['cos'] = await tencentCOSClient.healthCheck();
    } catch (error) {
      logger.warn('Tencent COS health check failed:', error);
      checks['cos'] = false;
    }

    return checks;
  }

  /**
   * 存活检查端点（Kubernetes liveness probe）
   * GET /health/live
   */
  async livenessCheck(req: Request, res: Response): Promise<void> {
    const requestId = req.requestId || 'unknown';
    
    logger.debug('Liveness check requested:', { requestId });

    // 简单的存活检查，只要进程在运行就返回成功
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * 启动检查端点（Kubernetes startup probe）
   * GET /health/startup
   */
  async startupCheck(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = req.requestId || 'unknown';
      
      logger.debug('Startup check requested:', { requestId });

      // 检查应用是否已完全启动
      // 这里可以添加更复杂的启动检查逻辑
      const isStarted = process.uptime() > 5; // 假设5秒后应用完全启动

      if (isStarted) {
        res.status(200).json({
          status: 'started',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      } else {
        res.status(503).json({
          status: 'starting',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        });
      }
    } catch (error) {
      logger.error('Startup check failed:', {
        requestId: req.requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      next(error);
    }
  }
}

// 导出单例实例
export const healthController = new HealthController();