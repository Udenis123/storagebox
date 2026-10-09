import { ErrorCode } from './errorCodes';

class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errorCode: ErrorCode,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export default ApiError;
