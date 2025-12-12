export class AppError extends Error {
    constructor(
      message: string,
      public statusCode: number = 500,
      public code?: string,
      public details?: any
    ) {
      super(message);
      this.name = this.constructor.name;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export class ValidationError extends AppError {
    constructor(message: string, details?: any) {
      super(message, 400, 'VALIDATION_ERROR', details);
    }
  }
  
  export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
      super(message, 404, 'NOT_FOUND');
    }
  }
  
  export class DynamoDBError extends AppError {
    constructor(message: string, originalError?: any) {
      super(message, 500, 'DYNAMODB_ERROR', originalError);
    }
  }
  
  export class S3Error extends AppError {
    constructor(message: string, originalError?: any) {
      super(message, 500, 'S3_ERROR', originalError);
    }
  }
  
  export class SNSError extends AppError {
    constructor(message: string, originalError?: any) {
      super(message, 500, 'SNS_ERROR', originalError);
    }
  }