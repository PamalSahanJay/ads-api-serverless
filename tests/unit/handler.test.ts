import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createAd } from '../../src/handlers/handler';
import * as DynamoDBService from '../../src/services/dynamoDBService';
import * as S3Service from '../../src/services/s3Service';
import * as SNSService from '../../src/services/snsNotificationService';
import { logger } from '../../src/utils/logger';
import { ValidationError, DynamoDBError, S3Error, AppError } from '../../src/utils/errors';
import { PublishCommandOutput } from '@aws-sdk/client-sns';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock all dependencies
jest.mock('../../src/services/dynamoDBService');
jest.mock('../../src/services/s3Service');
jest.mock('../../src/services/snsNotificationService');
jest.mock('../../src/utils/logger');

describe('createAd Handler', () => {
  const mockRequestId = 'test-request-id-123';
  const mockAdItem = {
    id: 'ad-123',
    title: 'Test Ad',
    price: 99.99,
    createdAt: '2024-01-15T10:00:00.000Z',
  };

  const createMockEvent = (body: string | null): APIGatewayProxyEvent => ({
    body,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/ads',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {
      requestId: mockRequestId,
      accountId: '123456789012',
      apiId: 'test-api-id',
      authorizer: {},
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      path: '/ads',
      stage: 'prod',
      requestTime: '09/Apr/2015:12:34:56 +0000',
      requestTimeEpoch: 1428582896000,
      resourceId: 'resource-id',
      resourcePath: '/ads',
      identity: {
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        sourceIp: '127.0.0.1',
        user: null,
        userAgent: 'test-agent',
        userArn: null,
        clientCert: null,
      },
    },
    resource: '/ads',
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful Ad Creation', () => {
    it('should create ad successfully without image', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post').mockResolvedValue(mockAdItem);
      const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
        .mockResolvedValue({ MessageId: 'sns-msg-123' } as PublishCommandOutput);

      const result = await createAd(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Ad created successfully');
      expect(body.ad).toEqual(mockAdItem);
      expect(body.snsMessageId).toBe('sns-msg-123');

      expect(mockDynamoPost).toHaveBeenCalledWith(
        { title: 'Test Ad', price: 99.99 },
        undefined,
        mockRequestId
      );
      expect(mockSNSNotification).toHaveBeenCalledWith(mockAdItem, mockRequestId);
    });

    it('should create ad successfully with image', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      }));

      const mockImageUrl = 'https://bucket.s3.amazonaws.com/ads/image.jpg';
      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post')
        .mockResolvedValue({ ...mockAdItem, imageUrl: mockImageUrl });
      const mockS3Upload = jest.spyOn(S3Service, 'uploadImage').mockResolvedValue(mockImageUrl);
      const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
        .mockResolvedValue({ MessageId: 'sns-msg-123' } as PublishCommandOutput);

      const result = await createAd(event);

      expect(result.statusCode).toBe(201);
      expect(mockS3Upload).toHaveBeenCalledWith(
        'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
        mockRequestId
      );
      expect(mockDynamoPost).toHaveBeenCalledWith(
        { title: 'Test Ad', price: 99.99, imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==' },
        mockImageUrl,
        mockRequestId
      );
    });

    it('should create ad even if SNS notification fails (non-critical)', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post').mockResolvedValue(mockAdItem);
      const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
        .mockRejectedValue(new Error('SNS error'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Ad created successfully');
      expect(body.snsMessageId).toBeNull();
      expect(mockDynamoPost).toHaveBeenCalled();
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 when request body is missing', async () => {
      const event = createMockEvent(null);

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Request body is required');
      expect(body.requestId).toBe(mockRequestId);
    });

    it('should return 400 when JSON is invalid', async () => {
      const event = createMockEvent('invalid json{');

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Invalid JSON in request body');
    });

    it('should return 400 when title is missing', async () => {
      const event = createMockEvent(JSON.stringify({
        price: 99.99,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Title is required and must be a non-empty string');
    });

    it('should return 400 when title is empty string', async () => {
      const event = createMockEvent(JSON.stringify({
        title: '',
        price: 99.99,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Title is required and must be a non-empty string');
    });

    it('should return 400 when title is only whitespace', async () => {
      const event = createMockEvent(JSON.stringify({
        title: '   ',
        price: 99.99,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when title is not a string', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 123,
        price: 99.99,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 when price is missing', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Price is required');
    });

    it('should return 400 when price is null', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: null,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Price is required');
    });

    it('should return 400 when price is negative', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: -10,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Price must be a positive number');
    });

    it('should return 400 when price is not a number', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 'not-a-number',
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Price must be a positive number');
    });

    it('should return 400 when price is zero', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 0,
      }));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Price must be a positive number');
    });
  });

  describe('S3 Upload Errors', () => {
    it('should return 500 when S3 upload fails', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
        imageBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      }));

      const mockS3Upload = jest.spyOn(S3Service, 'uploadImage')
        .mockRejectedValue(new S3Error('S3 upload failed'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('S3_ERROR');
      expect(body.message).toBe('S3 upload failed');
      expect(mockS3Upload).toHaveBeenCalled();
    });

    it('should return 400 when image format is invalid', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
        imageBase64: 'invalid-base64-string',
      }));

      const mockS3Upload = jest.spyOn(S3Service, 'uploadImage')
        .mockRejectedValue(new ValidationError('Invalid base64 image format'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DynamoDB Errors', () => {
    it('should return 500 when DynamoDB save fails', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post')
        .mockRejectedValue(new DynamoDBError('DynamoDB error'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('DYNAMODB_ERROR');
      expect(body.message).toBe('DynamoDB error');
      expect(mockDynamoPost).toHaveBeenCalled();
    });

    it('should return 500 when DynamoDB table not found', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post')
        .mockRejectedValue(new DynamoDBError('DynamoDB table not found'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('DYNAMODB_ERROR');
    });
  });

  describe('Unexpected Errors', () => {
    it('should return 500 for unexpected errors', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post')
        .mockRejectedValue(new Error('Unexpected error'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.message).toBe('An unexpected error occurred while creating the ad');
      expect(body.requestId).toBe(mockRequestId);
    });

    it('should handle errors without requestId gracefully', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      // Remove requestId from event
      event.requestContext.requestId = undefined as any;

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post')
        .mockRejectedValue(new Error('Unexpected error'));

      const result = await createAd(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.requestId).toBe('unknown');
    });
  });

  describe('Edge Cases', () => {
    it('should handle price as string that can be converted to number', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: '99.99', // String that represents a number
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post').mockResolvedValue(mockAdItem);
      const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
        .mockResolvedValue(undefined);

      const result = await createAd(event);

      // Should fail validation because price must be a number, not a string
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('VALIDATION_ERROR');
    });

    it('should handle title with leading/trailing spaces correctly', async () => {
      const event = createMockEvent(JSON.stringify({
        title: '  Test Ad  ',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post').mockResolvedValue({
        ...mockAdItem,
        title: 'Test Ad', // DynamoDB service should trim
      });
      const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
        .mockResolvedValue(undefined);

      const result = await createAd(event);

      expect(result.statusCode).toBe(201);
    });

    it('should handle SNS returning undefined (topic not configured)', async () => {
      const event = createMockEvent(JSON.stringify({
        title: 'Test Ad',
        price: 99.99,
      }));

      const mockDynamoPost = jest.spyOn(DynamoDBService, 'post').mockResolvedValue(mockAdItem);
      const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
        .mockResolvedValue(undefined);

      const result = await createAd(event);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.snsMessageId).toBeNull();
    });
  });
});