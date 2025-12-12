import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as DynamoDBService from '../services/dynamoDBService';
import * as S3Service from '../services/s3Service';
import * as SNSService from '../services/snsNotificationService';
import { CreateAdRequest } from '../types/createAdRequest';
import { AdItem } from '../types/AdItem';
import { PublishCommandOutput } from '@aws-sdk/client-sns/dist-types/commands/PublishCommand';
import { logger } from '../utils/logger';
import { successResponse, errorResponse } from '../utils/apiResponse';
import { ValidationError, AppError } from '../utils/errors';

export const createAd = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId || event.requestContext?.requestId || 'unknown';

  logger.setRequestId(requestId);

  logger.info('Received create ad request', {
    requestId,
    httpMethod: event.httpMethod,
    path: event.path,
  });

  try {
    if (!event.body) {
      throw new ValidationError('Request body is required');
    }

    let data: CreateAdRequest;
    try {
      data = JSON.parse(event.body);
    } catch (parseError) {
      throw new ValidationError('Invalid JSON in request body');
    }

    logger.info('Parsed request body', { requestId, hasImage: !!data.imageBase64 });

    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      throw new ValidationError('Title is required and must be a non-empty string');
    }

    if (data.price === undefined || data.price === null) {
      throw new ValidationError('Price is required');
    }

    if (typeof data.price !== 'number' || data.price < 0) {
      throw new ValidationError('Price must be a positive number');
    }

    let imageUrl: string | undefined;
    if (data.imageBase64) {
      logger.info('Uploading image to S3', { requestId });
      try {
        imageUrl = await S3Service.uploadImage(data.imageBase64, requestId);
        logger.info('Image uploaded successfully', { requestId, imageUrl });
      } catch (imageError) {
        logger.error('Image upload failed', imageError, { requestId });
        throw imageError;
      }
    }

    const item: AdItem = await DynamoDBService.post(data, imageUrl, requestId);
    logger.info('Ad created in DynamoDB', { requestId, adId: item.id });

    let snsResult: PublishCommandOutput | undefined;
    try {
      snsResult = await SNSService.sendAdCreatedNotification(item, requestId);
      if (snsResult) {
        logger.info('SNS notification sent successfully', {
          requestId,
          messageId: snsResult.MessageId,
        });
      }
    } catch (snsError) {
      // Log but don't fail the request - notification is not critical
      logger.error('SNS notification failed', snsError, { requestId });
    }

    logger.info('Ad creation completed successfully', {
      requestId,
      adId: item.id,
      statusCode: 201,
    });

    return successResponse(201, {
      message: 'Ad created successfully',
      ad: item,
      snsMessageId: snsResult ? snsResult.MessageId : null,
    });
  } catch (error) {

    if (error instanceof AppError) {
      logger.error('Application error', {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode
      }, {"requestId": requestId});
      return errorResponse(error, requestId);
    }

    logger.error('Unexpected error creating ad', error, {"requestId": requestId});
    const appError = new AppError(
      'An unexpected error occurred while creating the ad',
      500,
      'INTERNAL_ERROR'
    );
    return errorResponse(appError, requestId);

  }
};
