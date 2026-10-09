import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  errorCode?: string;
}

export interface ServiceResult<T> {
  message: string;
  data: T;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function sendResponse<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
  errorCode?: string,
): Response {
  const body: ApiResponse<T> = { status: errorCode ? 'error' : 'success', message };
  if (data !== undefined) body.data = data;
  if (errorCode) body.errorCode = errorCode;
  return res.status(statusCode).json(body);
}
