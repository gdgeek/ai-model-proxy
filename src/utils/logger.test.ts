import { logger, logStream } from './logger';

describe('Logger', () => {
  describe('Logger Instance', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.level).toBe('error'); // 测试环境日志级别
    });

    it('should have correct transports', () => {
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    it('should log messages', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logger.info('Test message');
      expect(logSpy).toHaveBeenCalledWith('Test message');
      logSpy.mockRestore();
    });
  });

  describe('Log Stream', () => {
    it('should create log stream for Morgan', () => {
      expect(logStream).toBeDefined();
      expect(logStream.write).toBeDefined();
      expect(typeof logStream.write).toBe('function');
    });

    it('should write to log stream', () => {
      const logSpy = jest.spyOn(logger, 'info');
      logStream.write('Test log message\n');
      expect(logSpy).toHaveBeenCalledWith('Test log message');
      logSpy.mockRestore();
    });
  });
});
