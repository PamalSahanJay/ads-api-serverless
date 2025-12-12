import { SNSClient, PublishCommand, PublishCommandOutput } from '@aws-sdk/client-sns';
import { AdItem } from '../types/AdItem';
import { logger } from '../utils/logger';
import { SNSError } from '../utils/errors';

const snsClient = new SNSClient({});
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const sendAdCreatedNotification = async (ad: AdItem, requestId?: string): Promise<PublishCommandOutput | undefined> => {
    try {
        logger.info('Sending SNS notification', { requestId });

        if (!TOPIC_ARN) {
            logger.error('SNS_TOPIC_ARN not configured, skipping notification', { requestId });
            throw new Error('SNS_TOPIC_ARN not configured');
        }

        logger.debug('Preparing SNS notification', { requestId, topicArn: TOPIC_ARN, adId: ad.id });

        const message = {
            event: 'AD_CREATED',
            timestamp: new Date().toISOString(),
            data: {
                id: ad.id,
                title: ad.title,
                price: ad.price,
                imageUrl: ad.imageUrl
            }
        };

        const command = new PublishCommand({
            TopicArn: TOPIC_ARN,
            Message: JSON.stringify(message, null, 2),
            Subject: `New Ad Created: ${ad.title}`,
            MessageAttributes: {
                eventType: {
                    DataType: 'String',
                    StringValue: 'AD_CREATED'
                }
            }
        });

        const result = await snsClient.send(command);
        logger.debug('SNS notification sent', { requestId, messageId: result.MessageId });
        return result;

    } catch (error: any) {
        logger.error('Error sending SNS notification', error, { requestId });
        
        // Handle specific SNS errors
        if (error.name === 'NotFound' || error.name === 'TopicNotFound') {
            throw new SNSError('SNS topic not found', error);
        }
        
        throw new SNSError('Failed to send SNS notification', error);
    }
};