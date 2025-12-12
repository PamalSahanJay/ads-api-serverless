import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */

// export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
//     try {
//         return {
//             statusCode: 200,
//             body: JSON.stringify({
//                 message: 'hello world pamal',
//             }),
//         };
//     } catch (err) {
//         console.log(err);
//         return {
//             statusCode: 500,
//             body: JSON.stringify({
//                 message: 'some error happened',
//             }),
//         };
//     }
// };

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import * as DynamoDBService from '../services/dynamoDbService';
import * as S3Service from '../services/s3Service';
import * as SNSService from '../services/snsNotificationService';
// import { v4 as uuidv4 } from 'uuid';
import { randomUUID } from 'crypto';
import { CreateAdRequest } from '../types/CreateAdRequest';
import { AdItem } from '../types/AdItem';
import { PublishCommandOutput } from '@aws-sdk/client-sns/dist-types/commands/PublishCommand';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'AdsTable';

export const createAd = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
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

    if (!data.title || !data.price) {
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
      console.log(`Uploading image to S3`);
      try {
        imageUrl = await S3Service.uploadImage(data.imageBase64);
        console.log(`Image uploaded: ${imageUrl}`);
      } catch (imageError) {
        console.error(`Image upload failed:`, imageError);
        // Continue without image - don't fail entire request
      }
    }

    const item: AdItem = await DynamoDBService.post(data, imageUrl);
    console.log('Ad created in DynamoDB:', item);

     let snsResult: PublishCommandOutput | undefined; 
    try {
      snsResult = await SNSService.sendAdCreatedNotification(item);
      if (snsResult) {
        console.log('SNS notification sent successfully. MessageId:', snsResult);
      } else {
        console.warn('SNS notification was skipped (no topic configured)');
      }
    } catch (snsError) {
      console.error('SNS notification failed:', snsError);
    }

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
    console.error('Error creating ad:', error);

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
