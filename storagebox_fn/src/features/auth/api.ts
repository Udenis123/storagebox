import { apiFetch, jsonBody } from "@/lib/api";
import type { Profile, RegistrationResult, Session } from "@/lib/types";

export type RegisterInput = { name: string; email: string; password: string; accountName?: string };
export type LoginInput = { email: string; password: string };

export const ACCOUNT_PENDING_CODE = "E2008";
export const ACCOUNT_REJECTED_CODE = "E2009";

export const register = (input: RegisterInput) =>
  apiFetch<RegistrationResult>("/auth/register", { method: "POST", body: jsonBody(input) });

export const login = (input: LoginInput) => apiFetch<Session>("/auth/login", { method: "POST", body: jsonBody(input) });

export const logout = (refreshToken: string) =>
  apiFetch<null>("/auth/logout", { method: "POST", body: jsonBody({ refreshToken }) });

export const getMe = () => apiFetch<Profile>("/auth/me");

export const updateProfile = (input: { name?: string; accountName?: string }) =>
  apiFetch<Profile>("/auth/me", { method: "PATCH", body: jsonBody(input) });

export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  apiFetch<null>("/auth/password", { method: "POST", body: jsonBody(input) });
