import { Router } from 'express';
import { modelController } from '../controllers/model';
import { validateModelGenerationRequest, upload } from '../middleware/validation';
import { addRequestContext } from '../middleware/context';
import { apiKeyAuth, optionalAuth } from '../middleware/auth';

const router = Router();

// 应用中间件
router.use(addRequestContext);

/**
 * @swagger
 * /api/v1/models:
 *   post:
 *     summary: 创建模型生成任务
 *     description: 提交图片或文本输入来生成3D模型
 *     tags: [Models]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - token
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [image, text]
 *                 description: 输入类型
 *               input:
 *                 type: string
 *                 description: 文本输入（当type为text时必需）
 *               token:
 *                 type: string
 *                 description: Tripo AI认证令牌
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: 图片文件（当type为image时必需）
 *               options:
 *                 type: object
 *                 properties:
 *                   quality:
 *                     type: string
 *                     enum: [low, medium, high]
 *                   format:
 *                     type: string
 *                     enum: [obj, fbx, gltf]
 *                   timeout:
 *                     type: number
 *                     minimum: 1000
 *                     maximum: 300000
 *     responses:
 *       201:
 *         description: 任务创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModelGenerationResponse'
 *       400:
 *         description: 请求验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: 文件过大
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  apiKeyAuth, // 需要认证
  upload.single('image'),
  validateModelGenerationRequest,
  modelController.createModel.bind(modelController)
);

/**
 * @swagger
 * /api/v1/models/{jobId}/status:
 *   get:
 *     summary: 查询模型生成状态
 *     description: 根据作业ID查询模型生成的当前状态
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 作业ID
 *     responses:
 *       200:
 *         description: 状态查询成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModelGenerationResponse'
 *       400:
 *         description: 无效的作业ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 作业不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:jobId/status', optionalAuth, modelController.getModelStatus.bind(modelController));

/**
 * @swagger
 * /api/v1/models/{jobId}/result:
 *   get:
 *     summary: 获取模型结果
 *     description: 获取已完成的模型生成结果
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 作业ID
 *     responses:
 *       200:
 *         description: 结果获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ModelGenerationResponse'
 *       400:
 *         description: 作业尚未完成或无效的作业ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: 作业不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:jobId/result', optionalAuth, modelController.getModelResult.bind(modelController));

/**
 * @swagger
 * /api/v1/models/debug/jobs:
 *   get:
 *     summary: 获取所有作业状态（调试用）
 *     description: 获取系统中所有作业的状态信息，仅用于调试
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: 作业列表获取成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   description: 作业总数
 *                 jobs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       jobId:
 *                         type: string
 *                         format: uuid
 *                       status:
 *                         type: string
 *                         enum: [pending, processing, completed, failed]
 *                       progress:
 *                         type: number
 *                         minimum: 0
 *                         maximum: 100
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                       completedAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 */
router.get('/debug/jobs', apiKeyAuth, modelController.getAllJobs.bind(modelController));

export { router as modelRoutes };
