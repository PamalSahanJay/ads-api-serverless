import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as DynamoDBService from '../services/dynamoDBService';
import * as S3Service from '../services/s3Service';
import * as SNSService from '../services/snsNotificationService';
import { CreateAdRequest } from '../types/createAdRequest';
import { AdItem } from '../types/AdItem';
import { PublishCommandOutput } from '@aws-sdk/client-sns/dist-types/commands/PublishCommand';
import { logger } from '../utils/logger';

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
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'Missing request body' }),
      };
    }

    const data: CreateAdRequest = JSON.parse(event.body);
    logger.info('Parsed request body', { requestId, hasImage: !!data.imageBase64 });

    if (!data.title || !data.price) {
      logger.error('Validation failed: missing required fields', { requestId, data });
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ message: 'title and price are required' }),
      };
    }

    let imageUrl: string | undefined;
    if (data.imageBase64) {
      logger.info('Uploading image to S3', { requestId });
      try {
        imageUrl = await S3Service.uploadImage(data.imageBase64);
        logger.info('Image uploaded successfully', { requestId, imageUrl });
      } catch (imageError) {
        logger.error('Image upload failed', imageError, { requestId });
      }
    }

    const item: AdItem = await DynamoDBService.post(data, imageUrl);
    logger.info('Ad created in DynamoDB', { requestId, adId: item.id });

     let snsResult: PublishCommandOutput | undefined; 
    try {
      snsResult = await SNSService.sendAdCreatedNotification(item);
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

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Ad created successfully',
        ad: item,
        snsMessageId: snsResult ? snsResult.MessageId : null,
      }),
    };
  } catch (error: any) {
    logger.error('Error creating ad', error, { requestId });
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
      }),
    };
  }
};
