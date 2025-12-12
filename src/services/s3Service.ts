import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { S3Error, ValidationError } from '../utils/errors';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || 'ads-images-bucket';
const ALLOWED_IMAGE_TYPES = ['jpeg', 'jpg', 'png', 'gif', 'webp'];

export const uploadImage = async (imageBase64: string, requestId?: string): Promise<string> => {
  try {
    logger.info('Processing base64 image', { requestId });

    // Extract the image format from base64 string (e.g., "data:image/jpeg;base64,...")
    const matches = imageBase64.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);

    if (!matches || matches.length !== 3) {
      throw new ValidationError('Invalid base64 image format. Expected format: data:image/<type>;base64,<data>');
    }

    const imageType = matches[1].toLowerCase(); // jpeg, png, etc.
    const base64Data = matches[2];

    logger.info('Image type extracted', { requestId, imageType });

    if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
      throw new ValidationError(
        `Image type '${imageType}' is not allowed. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`
      );
    }

    logger.info('Image format validated', { requestId, imageType });

    // Convert base64 to buffer
    let imageBuffer: Buffer;
    try {
      imageBuffer = Buffer.from(base64Data, 'base64');
    } catch (bufferError) {
      throw new ValidationError('Invalid base64 data', bufferError);
    }

    // Validate buffer size
    if (imageBuffer.length === 0) {
      throw new ValidationError('Image data is empty');
    }

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
  } catch (error: any) {
    logger.error('Error uploading image to S3', error, { requestId });

    // If it's already an AppError, re-throw it
    if (error instanceof ValidationError || error instanceof S3Error) {
      throw error;
    }

    // Wrap AWS SDK errors
    if (error.name === 'NoSuchBucket') {
      throw new S3Error('S3 bucket not found', error);
    }

    throw new S3Error('Failed to upload image to S3', error);
  }

};