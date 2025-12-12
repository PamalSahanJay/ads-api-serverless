import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as DynamoDBService from '../services/dynamoDBService';
import * as S3Service from '../services/s3Service';
import * as SNSService from '../services/snsNotificationService';
import { CreateAdRequest } from '../types/createAdRequest';
import { AdItem } from '../types/AdItem';
import { PublishCommandOutput } from '@aws-sdk/client-sns/dist-types/commands/PublishCommand';
import { logger } from '../utils/logger';
import { success, error } from '../utils/apiResponse';

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
      logger.error('Missing request body', { requestId });
      return error(400, `Missing request body`, "request id : " + requestId);
    }

    const data: CreateAdRequest = JSON.parse(event.body);
    logger.info('Parsed request body', { requestId, hasImage: !!data.imageBase64 });

    if (!data.title || !data.price) {
      logger.error('Validation failed: missing required fields', { requestId, data });
      return error(400,'Both title and price are required', "request id : " + requestId);
    }

    let imageUrl: string | undefined;
    if (data.imageBase64) {
      logger.info('Uploading image to S3', { requestId });
      try {
        imageUrl = await S3Service.uploadImage(data.imageBase64, requestId);
        logger.info('Image uploaded successfully', { requestId, imageUrl });
      } catch (imageError) {
        logger.error('Image upload failed', imageError, { requestId });
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
      } else {
        logger.warn('SNS notification was skipped (no topic configured)', { requestId });
      }
    } catch (snsError) {
      logger.error('SNS notification failed', snsError, { requestId });
    }

    logger.info('Ad creation completed successfully', {
      requestId,
      adId: item.id,
      statusCode: 201,
    });

    return success(201, {
      message: 'Ad created successfully',
      ad: item,
      snsMessageId: snsResult ? snsResult.MessageId : null,
    });
  } catch (error: any) {
    logger.error('Error creating ad', error, { requestId });
    return error(500, 'Internal server error : request id : ' + requestId, error.message);
  }
};
