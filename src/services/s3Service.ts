import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || 'ads-images-bucket';

export const uploadImage = async (imageBase64: string, requestId?: string): Promise<string> => {
  try {
    logger.info('Processing base64 image', { requestId });
    
    // Extract the image format from base64 string (e.g., "data:image/jpeg;base64,...")
    const matches = imageBase64.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const imageType = matches[1]; // jpeg, png, etc.
    const base64Data = matches[2];

    logger.info('Image format detected', { requestId, imageType });
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const fileName = `${randomUUID()}.${imageType}`;
    const key = `ads/${fileName}`;

    logger.info('Uploading to S3', { requestId, bucket: BUCKET_NAME, key });

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: `image/${imageType}`,
    });

    const result = await s3Client.send(command);
    logger.debug('S3 upload successful', { requestId, etag: result.ETag });
    
    // Return the S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
    logger.debug('Generated S3 URL', { requestId, s3Url });
    return s3Url;
  } catch (error) {
    logger.error('Error uploading image to S3', error, { requestId });
    throw new Error('Error uploading image to S3');
  }
};