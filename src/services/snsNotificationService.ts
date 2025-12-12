import { SNSClient, PublishCommand, PublishCommandOutput } from '@aws-sdk/client-sns';
import { AdItem } from '../types/AdItem';

const snsClient = new SNSClient({});
const TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const sendAdCreatedNotification = async (ad: AdItem): Promise<PublishCommandOutput | undefined> => {
    try {

        if (!TOPIC_ARN) {
            console.warn('SNS_TOPIC_ARN not configured, skipping notification');
            return undefined;
        }

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
        console.log('SNS notification sent:', result.MessageId);
        return result;

    } catch (error) {
        console.error('Error sending SNS notification:', error);
    }
};