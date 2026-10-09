import { Request, Response } from 'express';
import status from 'http-status';
import {
  changePassword,
  getProfile,
  login,
  logout,
  refresh,
  register,
  updateProfile,
} from '@/services/authService';
import catchAsync from '@/utils/catchAsync';
import { currentUser } from '@/utils/request';
import { sendResponse } from '@/utils/response';

export const registerHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await register(req.body);
  sendResponse(res, status.CREATED, result.message, result.data);
});

export const loginHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await login(req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const refreshHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await refresh(req.body.refreshToken);
  sendResponse(res, status.OK, result.message, result.data);
});

export const logoutHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await logout(req.body.refreshToken);
  sendResponse(res, status.OK, result.message, result.data);
});

export const meHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await getProfile(currentUser(req).id);
  sendResponse(res, status.OK, result.message, result.data);
});

export const updateProfileHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await updateProfile(currentUser(req).id, req.body);
  sendResponse(res, status.OK, result.message, result.data);
});

export const changePasswordHandler = catchAsync(async (req: Request, res: Response) => {
  const result = await changePassword(currentUser(req).id, req.body.currentPassword, req.body.newPassword);
  sendResponse(res, status.OK, result.message, result.data);
});
