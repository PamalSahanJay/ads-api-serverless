import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createAd } from '../../src/handlers/handler';
import * as DynamoDBService from '../../src/services/dynamoDBService';
import * as S3Service from '../../src/services/s3Service';
import * as SNSService from '../../src/services/snsNotificationService';
import { logger } from '../../src/utils/logger';
import { ValidationError } from '../../src/utils/errors';
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

  // Helper function to create a mock API Gateway event
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

  // SUCCESS SCENARIO
  it('should create ad successfully with valid input', async () => {
    // Arrange: Create a valid request event
    const event = createMockEvent(JSON.stringify({
      title: 'Test Ad',
      price: 99.99,
    }));

    // Mock the service functions to return success
    const mockDynamoPost = jest.spyOn(DynamoDBService, 'post')
      .mockResolvedValue(mockAdItem);
    
    const mockSNSNotification = jest.spyOn(SNSService, 'sendAdCreatedNotification')
      .mockResolvedValue({ MessageId: 'sns-msg-123' } as PublishCommandOutput);

    // Act: Call the handler
    const result = await createAd(event);

    // Assert: Verify the response
    expect(result.statusCode).toBe(201);
    
    const body = JSON.parse(result.body);
    expect(body.message).toBe('Ad created successfully');
    expect(body.ad).toEqual(mockAdItem);
    expect(body.snsMessageId).toBe('sns-msg-123');

    // Verify services were called correctly
    expect(mockDynamoPost).toHaveBeenCalledWith(
      { title: 'Test Ad', price: 99.99 },
      undefined, // no imageUrl
      mockRequestId
    );
    expect(mockSNSNotification).toHaveBeenCalledWith(mockAdItem, mockRequestId);
  });

  // FAILURE SCENARIO
  it('should return 400 error when title is missing', async () => {
    // Arrange: Create a request event with missing title
    const event = createMockEvent(JSON.stringify({
      price: 99.99,
      // title is missing
    }));

    // Act: Call the handler
    const result = await createAd(event);

    // Assert: Verify error response
    expect(result.statusCode).toBe(400);
    
    const body = JSON.parse(result.body);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('Title is required and must be a non-empty string');
    expect(body.requestId).toBe(mockRequestId);

    // Verify DynamoDB was NOT called (validation failed before reaching it)
    expect(DynamoDBService.post).not.toHaveBeenCalled();
  });
});