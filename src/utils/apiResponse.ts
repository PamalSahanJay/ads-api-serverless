import { APIGatewayProxyResult } from 'aws-lambda';
import { AppError } from './errors';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const successResponse = (
  statusCode: number,
  body: Record<string, any>
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
};

export const errorResponse = (
  error: AppError | Error,
  requestId?: string
): APIGatewayProxyResult => {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  
  const body: Record<string, any> = {
    message: error.message,
    code,
    requestId: requestId || 'unknown',
  };

  // Only include details in development or for client errors (4xx)
  if (error instanceof AppError && error.details && statusCode < 500) {
    body.details = error.details;
  }

  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
};