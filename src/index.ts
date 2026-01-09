import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { gracefulShutdown } from './utils/gracefulShutdown';

// 初始化优雅关闭处理器
gracefulShutdown.init();

const server = app.listen(config.server.port, config.server.host, () => {
  logger.info(`AI模型代理服务已启动`);
  logger.info(`端口: ${config.server.port}`);
  logger.info(`主机: ${config.server.host}`);
  logger.info(`环境: ${config.server.env}`);
  logger.info(`进程ID: ${process.pid}`);
  logger.info(`Node版本: ${process.version}`);
  logger.info(`健康检查: http://${config.server.host}:${config.server.port}/health`);
});

// 注册服务器到优雅关闭处理器
gracefulShutdown.registerServer(server);

// 处理服务器错误
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof config.server.port === 'string'
    ? 'Pipe ' + config.server.port
    : 'Port ' + config.server.port;

  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

export default server;