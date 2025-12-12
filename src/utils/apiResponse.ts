import { APIGatewayProxyResult } from 'aws-lambda';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

export const success = (
  statusCode: number,
  body: Record<string, any>
): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
};

export const error = (
  statusCode: number,
  message: string,
  errorDetails?: string
): APIGatewayProxyResult => {
  const body: Record<string, any> = { message };
  if (errorDetails) {
    body.errorDetails = errorDetails;
  }
  return {
    statusCode,
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(body),
  };
};