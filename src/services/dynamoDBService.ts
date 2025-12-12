import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { CreateAdRequest } from '../types/createAdRequest';
import { AdItem } from '../types/AdItem';
import { logger } from '../utils/logger';

const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'AdsTable';

const post = async (data: CreateAdRequest, imageUrl?: string, requestId?: string): Promise<AdItem> => {
    try {
        logger.info('Creating Ad in DynamoDB', { requestId, hasImage: !!imageUrl });
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const item: AdItem = {
            id,
            title: data.title,
            price: Number(data.price),
            createdAt,
            imageUrl: imageUrl,
        }

        logger.debug('Preparing DynamoDB put command', { requestId, tableName: TABLE_NAME, adId: id });

        const params = {
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: 'attribute_not_exists(id)',
        };

        const command = new PutCommand(params);
        await dynamo.send(command);

        logger.debug('Ad item saved to DynamoDB', { requestId, adId: id });
        return item;
        
    } catch (error) {
        logger.error('Error saving ad to DynamoDB', error, { requestId });
        throw error;
    }
}

export {post}