import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { logStream } from './utils/logger';
import { apiRoutes } from './routes';
import { addRequestContext } from './middleware/context';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { 
  rateLimiter, 
  apiRateLimiter, 
  requestSizeLimit, 
  securityHeaders,
  handleCorsPreflightRequest 
} from './middleware/security';
import { swaggerSpec } from './docs/openapi';

// 创建Express应用
const app = express();

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 安全中间件
app.use(helmet());
app.use(securityHeaders);

// CORS预检请求处理
app.use(handleCorsPreflightRequest);

// 压缩中间件
app.use(compression());

// CORS配置
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
}));

// 全局速率限制
app.use(rateLimiter);

// 请求大小限制
app.use(requestSizeLimit);

// 请求日志中间件
app.use(morgan('combined', { stream: logStream }));

// 请求解析中间件
app.use(express.json({ limit: `${config.upload.maxFileSize}b` }));
app.use(express.urlencoded({ extended: true, limit: `${config.upload.maxFileSize}b` }));

// 请求上下文中间件
app.use(addRequestContext);

// API路由（带API专用速率限制）
app.use('/api/v1', apiRateLimiter, apiRoutes);

// API文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI模型代理服务 API文档',
}));

// API规范JSON
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// 根路径重定向到健康检查
app.get('/', (_req, res) => {
  res.redirect('/health');
});

// 健康检查端点（保持向后兼容）
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 就绪检查端点（保持向后兼容）
app.get('/ready', (_req, res) => {
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
});

// 404处理
app.use('*', notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

export default app;