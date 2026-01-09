import { Router } from 'express';
import { healthController } from '../controllers/health';
import { addRequestContext } from '../middleware/context';

const router = Router();

// 应用中间件
router.use(addRequestContext);

/**
 * @swagger
 * /health:
 *   get:
 *     summary: 基本健康检查
 *     description: 检查服务是否正常运行
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务健康
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 */
router.get('/', healthController.healthCheck.bind(healthController));

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: 就绪检查
 *     description: 检查服务是否准备好接收请求，包括外部依赖检查
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务就绪
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [ready, not_ready]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 *                   properties:
 *                     redis:
 *                       type: boolean
 *                     tripo:
 *                       type: boolean
 *                     cos:
 *                       type: boolean
 *       503:
 *         description: 服务未就绪
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [not_ready]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 checks:
 *                   type: object
 */
router.get('/ready', healthController.readinessCheck.bind(healthController));

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: 详细健康检查
 *     description: 获取详细的健康状态信息，包括所有依赖服务的状态
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 详细健康信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 *       503:
 *         description: 服务不健康
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheckResponse'
 */
router.get('/detailed', healthController.detailedHealthCheck.bind(healthController));

/**
 * @swagger
 * /health/info:
 *   get:
 *     summary: 系统信息
 *     description: 获取系统运行信息，包括内存、CPU使用情况等
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 系统信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: 运行时间（秒）
 *                 version:
 *                   type: string
 *                   description: Node.js版本
 *                 platform:
 *                   type: string
 *                   description: 操作系统平台
 *                 arch:
 *                   type: string
 *                   description: CPU架构
 *                 memory:
 *                   type: object
 *                   properties:
 *                     rss:
 *                       type: number
 *                     heapTotal:
 *                       type: number
 *                     heapUsed:
 *                       type: number
 *                     external:
 *                       type: number
 *                     arrayBuffers:
 *                       type: number
 *                 cpu:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: number
 *                     system:
 *                       type: number
 *                 env:
 *                   type: string
 *                   description: 运行环境
 */
router.get('/info', healthController.systemInfo.bind(healthController));

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: 存活检查（Kubernetes liveness probe）
 *     description: 简单的存活检查，用于Kubernetes liveness probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 服务存活
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [alive]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 */
router.get('/live', healthController.livenessCheck.bind(healthController));

/**
 * @swagger
 * /health/startup:
 *   get:
 *     summary: 启动检查（Kubernetes startup probe）
 *     description: 检查应用是否已完全启动，用于Kubernetes startup probe
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: 应用已启动
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [started]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *       503:
 *         description: 应用正在启动
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [starting]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 */
router.get('/startup', healthController.startupCheck.bind(healthController));

export { router as healthRoutes };
