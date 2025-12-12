import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { S3Error, ValidationError } from '../../src/utils/errors';

const mockSend: any = jest.fn();
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: jest.fn().mockImplementation((params) => ({
    input: params,
  })),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

// Import the service after mocks are set up
import { uploadImage } from '../../src/services/s3Service';

describe('s3Service', () => {
  const mockRequestId = 'test-request-id-123';
  const mockUuid = 'test-uuid-123';
  const mockBucketName = 'ads-images-bucket';
  const validBase64Image = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock randomUUID
    (randomUUID as jest.Mock).mockReturnValue(mockUuid);

    // Mock environment variable
    process.env.BUCKET_NAME = mockBucketName;

    // Ensure S3Client mock returns our mockSend
    (S3Client as jest.Mock).mockImplementation(() => ({
      send: mockSend,
    }));
  });

  describe('uploadImage', () => {
    it('should successfully upload a JPEG image to S3', async () => {
      // Arrange
      const mockETag = '"test-etag-123"';
      mockSend.mockResolvedValue({ ETag: mockETag });

      // Act
      const result = await uploadImage(validBase64Image, mockRequestId);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.jpeg`);
      expect(randomUUID).toHaveBeenCalled();
      expect(mockSend).toHaveBeenCalled();
      expect(PutObjectCommand).toHaveBeenCalled();
      
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        Bucket: string;
        Key: string;
        ContentType: string;
        Body: Buffer;
      };
      expect(putCommandInput.Bucket).toBe(mockBucketName);
      expect(putCommandInput.Key).toBe(`ads/${mockUuid}.jpeg`);
      expect(putCommandInput.ContentType).toBe('image/jpeg');
      expect(Buffer.isBuffer(putCommandInput.Body)).toBe(true);
    });

    it('should successfully upload a PNG image to S3', async () => {
      // Arrange
      const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(pngBase64, mockRequestId);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.png`);
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        ContentType: string;
        Key: string;
      };
      expect(putCommandInput.ContentType).toBe('image/png');
      expect(putCommandInput.Key).toBe(`ads/${mockUuid}.png`);
    });

    it('should successfully upload a JPG image to S3', async () => {
      // Arrange
      const jpgBase64 = 'data:image/jpg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(jpgBase64, mockRequestId);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.jpg`);
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        ContentType: string;
      };
      expect(putCommandInput.ContentType).toBe('image/jpg');
    });

    it('should successfully upload a GIF image to S3', async () => {
      // Arrange
      const gifBase64 = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(gifBase64, mockRequestId);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.gif`);
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        ContentType: string;
      };
      expect(putCommandInput.ContentType).toBe('image/gif');
    });

    it('should successfully upload a WEBP image to S3', async () => {
      // Arrange
      const webpBase64 = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(webpBase64, mockRequestId);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.webp`);
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        ContentType: string;
      };
      expect(putCommandInput.ContentType).toBe('image/webp');
    });

    it('should handle case-insensitive image types', async () => {
      // Arrange
      const upperCaseBase64 = 'data:image/JPEG;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(upperCaseBase64, mockRequestId);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.jpeg`);
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        ContentType: string;
      };
      expect(putCommandInput.ContentType).toBe('image/jpeg');
    });

    it('should throw ValidationError for invalid base64 format', async () => {
      // Arrange
      const invalidBase64 = 'invalid-base64-string';

      // Act & Assert
      await expect(uploadImage(invalidBase64, mockRequestId)).rejects.toThrow(ValidationError);
      await expect(uploadImage(invalidBase64, mockRequestId)).rejects.toThrow(
        'Invalid base64 image format. Expected format: data:image/<type>;base64,<data>'
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for missing data prefix', async () => {
      // Arrange
      const invalidBase64 = 'image/jpeg;base64,some-data';

      // Act & Assert
      await expect(uploadImage(invalidBase64, mockRequestId)).rejects.toThrow(ValidationError);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw ValidationError for unsupported image type', async () => {
      // Arrange
      const unsupportedBase64 = 'data:image/bmp;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';

      // Act & Assert
      await expect(uploadImage(unsupportedBase64, mockRequestId)).rejects.toThrow(ValidationError);
      await expect(uploadImage(unsupportedBase64, mockRequestId)).rejects.toThrow(
        "Image type 'bmp' is not allowed. Allowed types: jpeg, jpg, png, gif, webp"
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should throw S3Error when S3 bucket is not found', async () => {
      // Arrange
      const mockError: any = new Error('Bucket not found');
      mockError.name = 'NoSuchBucket';
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(uploadImage(validBase64Image, mockRequestId)).rejects.toThrow(S3Error);
      await expect(uploadImage(validBase64Image, mockRequestId)).rejects.toThrow('S3 bucket not found');
    });

    it('should throw S3Error for generic S3 errors', async () => {
      // Arrange
      const mockError = new Error('S3 service unavailable');
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      await expect(uploadImage(validBase64Image, mockRequestId)).rejects.toThrow(S3Error);
      await expect(uploadImage(validBase64Image, mockRequestId)).rejects.toThrow('Failed to upload image to S3');
    });

    it('should use default bucket name when BUCKET_NAME env var is not set', async () => {
      // Arrange
      delete process.env.BUCKET_NAME;
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(validBase64Image, mockRequestId);

      // Assert
      expect(result).toBe(`https://ads-images-bucket.s3.amazonaws.com/ads/${mockUuid}.jpeg`);
      const putCommandInput = (PutObjectCommand as unknown as jest.Mock).mock.calls[0][0] as {
        Bucket: string;
      };
      expect(putCommandInput.Bucket).toBe('ads-images-bucket');
    });

    it('should work without requestId parameter', async () => {
      // Arrange
      mockSend.mockResolvedValue({ ETag: '"test-etag"' });

      // Act
      const result = await uploadImage(validBase64Image);

      // Assert
      expect(result).toBe(`https://${mockBucketName}.s3.amazonaws.com/ads/${mockUuid}.jpeg`);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should preserve ValidationError when thrown', async () => {
      // Arrange
      const invalidBase64 = 'invalid-format';

      // Act & Assert
      try {
        await uploadImage(invalidBase64, mockRequestId);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).statusCode).toBe(400);
        expect((error as ValidationError).code).toBe('VALIDATION_ERROR');
      }
    });

    it('should preserve S3Error when thrown', async () => {
      // Arrange
      const mockError: any = new Error('S3 error');
      mockError.name = 'NoSuchBucket';
      mockSend.mockRejectedValue(mockError);

      // Act & Assert
      try {
        await uploadImage(validBase64Image, mockRequestId);
        fail('Should have thrown S3Error');
      } catch (error) {
        expect(error).toBeInstanceOf(S3Error);
        expect((error as S3Error).statusCode).toBe(500);
        expect((error as S3Error).code).toBe('S3_ERROR');
      }
    });
  });
});

