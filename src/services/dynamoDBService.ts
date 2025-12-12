import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { CreateAdRequest } from '../types/CreateAdRequest';
import { AdItem } from '../types/AdItem';


const client = new DynamoDBClient({ region: "us-east-1" });
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'AdsTable';

const post = async (data: CreateAdRequest, imageUrl?: string) => {
    try {
        const id = randomUUID();
        const createdAt = new Date().toISOString();
        const item: AdItem = {
            id,
            title: data.title,
            price: Number(data.price),
            createdAt,
            imageUrl: imageUrl,
        }

        const params = {
            TableName: TABLE_NAME,
            Item: item,
            ConditionExpression: 'attribute_not_exists(id)',
        };

        const command = new PutCommand(params);
        await dynamo.send(command);

        return item;
        
    } catch (error) {
        throw error;
    }
}

export {post}