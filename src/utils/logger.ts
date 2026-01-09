import winston from 'winston';
import { config } from '../config';

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  config.logging.format === 'json' ? winston.format.json() : winston.format.simple()
);

// 创建日志传输器
const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
  }),
];

// 在生产环境中添加文件日志
if (config.server.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    })
  );
}

// 创建日志器
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  // 在非生产环境中不退出进程
  exitOnError: config.server.env === 'production',
});

// 创建请求日志中间件的流
export const logStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};

export default logger;
