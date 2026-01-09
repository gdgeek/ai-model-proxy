import { Router } from 'express';
import { modelRoutes } from './model';
import { healthRoutes } from './health';

const router = Router();

// 注册路由
router.use('/models', modelRoutes);
router.use('/health', healthRoutes);

export { router as apiRoutes };
