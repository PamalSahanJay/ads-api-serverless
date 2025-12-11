import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME || 'ads-images-bucket';

export const uploadImage = async (imageBase64: string): Promise<string> => {
  try {
    // Extract the image format from base64 string (e.g., "data:image/jpeg;base64,...")
    const matches = imageBase64.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const imageType = matches[1]; // jpeg, png, etc.
    const base64Data = matches[2];

    console.log("imageType:", imageType);
    console.log("base64Data", base64Data);
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename
    const fileName = `${randomUUID()}.${imageType}`;
    const key = `ads/${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: `image/${imageType}`,
    });

    const result = await s3Client.send(command);
    console.log("S3 upload successful:", result);
    
    // Return the S3 URL
    const s3Url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
    console.log("Generated S3 URL:", s3Url);
    
    return s3Url;
  } catch (error) {
    console.error('Error uploading image to S3:', error);
    throw error;
  }
};