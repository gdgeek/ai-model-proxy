import { Request, Response, NextFunction } from 'express';
import { ModelController } from './model';
import { ValidationError } from '../types/errors';

// Mock services and utilities
jest.mock('../services/modelGeneration', () => ({
  modelGenerationService: {
    submitGenerationRequest: jest.fn(),
    pollJobStatus: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../middleware/validation', () => ({
  validateJobId: jest.fn(),
  validateToken: jest.fn(),
}));

describe('ModelController', () => {
  let controller: ModelController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    controller = new ModelController();
    mockReq = {
      body: {},
      params: {},
    };
    Object.defineProperty(mockReq, 'requestId', {
      value: 'test-request-id',
      writable: true,
      configurable: true,
    });
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createModel', () => {
    const { modelGenerationService } = require('../services/modelGeneration');
    const { validateToken } = require('../middleware/validation');

    it('should create model with valid image input', async () => {
      mockReq.body = {
        type: 'image',
        token: 'valid-token',
      };
      mockReq.file = {
        buffer: Buffer.from('test-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      validateToken.mockReturnValue(true);
      modelGenerationService.submitGenerationRequest.mockResolvedValue({
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Job created successfully',
      });

      await controller.createModel(mockReq as Request, mockRes as Response, mockNext);

      expect(validateToken).toHaveBeenCalledWith('valid-token');
      expect(modelGenerationService.submitGenerationRequest).toHaveBeenCalledWith(
        {
          type: 'image',
          data: Buffer.from('test-image'),
          filename: 'test.jpg',
          mimeType: 'image/jpeg',
        },
        'valid-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Job created successfully',
      });
    });

    it('should create model with valid text input', async () => {
      mockReq.body = {
        type: 'text',
        input: 'test text input',
        token: 'valid-token',
      };

      validateToken.mockReturnValue(true);
      modelGenerationService.submitGenerationRequest.mockResolvedValue({
        jobId: 'test-job-id',
        status: 'pending',
        message: 'Job created successfully',
      });

      await controller.createModel(mockReq as Request, mockRes as Response, mockNext);

      expect(modelGenerationService.submitGenerationRequest).toHaveBeenCalledWith(
        {
          type: 'text',
          data: 'test text input',
        },
        'valid-token'
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should reject invalid token', async () => {
      mockReq.body = {
        type: 'text',
        input: 'test text',
        token: 'invalid-token',
      };

      validateToken.mockReturnValue(false);

      await controller.createModel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject image request without file', async () => {
      mockReq.body = {
        type: 'image',
        token: 'valid-token',
      };

      validateToken.mockReturnValue(true);

      await controller.createModel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });

    it('should reject text request without input', async () => {
      mockReq.body = {
        type: 'text',
        token: 'valid-token',
      };

      validateToken.mockReturnValue(true);

      await controller.createModel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('getModelStatus', () => {
    const { validateJobId } = require('../middleware/validation');
    const { modelGenerationService } = require('../services/modelGeneration');

    it('should return job status for valid job ID', async () => {
      mockReq.params = { jobId: 'valid-job-id' };
      validateJobId.mockReturnValue(true);
      modelGenerationService.pollJobStatus.mockResolvedValue({
        jobId: 'valid-job-id',
        status: 'processing',
        progress: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await controller.getModelStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(validateJobId).toHaveBeenCalledWith('valid-job-id');
      expect(modelGenerationService.pollJobStatus).toHaveBeenCalledWith('valid-job-id');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'valid-job-id',
          status: 'processing',
          message: expect.any(String),
        })
      );
    });

    it('should reject invalid job ID format', async () => {
      mockReq.params = { jobId: 'invalid-job-id' };
      validateJobId.mockReturnValue(false);

      await controller.getModelStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });

  describe('getModelResult', () => {
    const { validateJobId } = require('../middleware/validation');
    const { modelGenerationService } = require('../services/modelGeneration');

    it('should return job result for completed job', async () => {
      mockReq.params = { jobId: 'completed-job-id' };
      validateJobId.mockReturnValue(true);
      modelGenerationService.pollJobStatus.mockResolvedValue({
        jobId: 'completed-job-id',
        status: 'completed',
        progress: 100,
        cosUrl: 'https://example.com/model.obj',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:05:00Z'),
        completedAt: new Date('2024-01-01T00:05:00Z'),
      });

      await controller.getModelResult(mockReq as Request, mockRes as Response, mockNext);

      expect(validateJobId).toHaveBeenCalledWith('completed-job-id');
      expect(modelGenerationService.pollJobStatus).toHaveBeenCalledWith('completed-job-id');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'completed-job-id',
          status: 'completed',
          message: '模型生成已完成',
          result: expect.objectContaining({
            modelUrl: 'https://example.com/model.obj',
            metadata: expect.any(Object),
          }),
        })
      );
    });

    it('should reject invalid job ID format', async () => {
      mockReq.params = { jobId: 'invalid-job-id' };
      validateJobId.mockReturnValue(false);

      await controller.getModelResult(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
    });
  });
});
