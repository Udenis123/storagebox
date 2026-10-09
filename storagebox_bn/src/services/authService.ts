import bcrypt from 'bcryptjs';
import status from 'http-status';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '@/config/config';
import prisma from '@/config/prisma';
import { AuthUser, UserRole } from '@/types/api';
import ApiError from '@/utils/ApiError';
import { randomSuffix, randomToken, sha256Hex } from '@/utils/crypto';
import { ERROR_CODES } from '@/utils/errorCodes';
import { ServiceResult } from '@/utils/response';
import { slugify } from '@/utils/slug';

const PASSWORD_SALT_ROUNDS = 12;
const CLOUD_NAME_BASE_LENGTH = 20;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  accountName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Profile extends AuthUser {
  account: { id: string; name: string; cloudName: string; quotaBytes: number };
}

export interface AuthSession extends SessionTokens {
  user: Profile;
}

const invalidCredentials = () =>
  new ApiError(status.UNAUTHORIZED, 'Incorrect email or password', ERROR_CODES.INVALID_CREDENTIALS);

async function issueTokens(userId: string): Promise<SessionTokens> {
  const accessToken = jwt.sign({ sub: userId }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
  });
  const refreshToken = randomToken(48);
  await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(Date.now() + config.jwt.refreshTokenDays * MS_PER_DAY),
    },
  });
  return { accessToken, refreshToken };
}

async function loadProfile(userId: string): Promise<Profile> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { account: true } });
  return {
    id: user.id,
    accountId: user.accountId,
    name: user.name,
    email: user.email,
    role: user.role,
    account: {
      id: user.account.id,
      name: user.account.name,
      cloudName: user.account.cloudName,
      quotaBytes: Number(user.account.quotaBytes),
    },
  };
}

async function uniqueCloudName(seed: string): Promise<string> {
  const base = slugify(seed).replace(/_/g, '-').slice(0, CLOUD_NAME_BASE_LENGTH) || 'cloud';
  for (;;) {
    const candidate = `${base}-${randomSuffix(4)}`;
    const taken = await prisma.account.findUnique({ where: { cloudName: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
}

export async function register(input: RegisterInput): Promise<ServiceResult<AuthSession>> {
  const email = input.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw new ApiError(status.CONFLICT, 'An account with this email already exists', ERROR_CODES.EMAIL_ALREADY_EXISTS);

  const accountName = input.accountName?.trim() || input.name;
  const [cloudName, passwordHash, userCount] = await Promise.all([
    uniqueCloudName(accountName),
    bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS),
    prisma.user.count(),
  ]);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email,
      passwordHash,
      role: userCount === 0 ? UserRole.ADMIN : UserRole.USER,
      account: {
        create: { name: accountName, cloudName, quotaBytes: BigInt(config.limits.defaultQuotaBytes) },
      },
    },
  });

  const tokens = await issueTokens(user.id);
  return { message: 'Welcome to StorageBox', data: { ...tokens, user: await loadProfile(user.id) } };
}

export async function login(input: LoginInput): Promise<ServiceResult<AuthSession>> {
  const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!user?.isActive) throw invalidCredentials();
  const isMatch = await bcrypt.compare(input.password, user.passwordHash);
  if (!isMatch) throw invalidCredentials();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const tokens = await issueTokens(user.id);
  return { message: 'Signed in', data: { ...tokens, user: await loadProfile(user.id) } };
}

/** Rotates the refresh token: the presented one is consumed and a new pair is issued. */
export async function refresh(refreshToken: string): Promise<ServiceResult<SessionTokens>> {
  const session = await prisma.session.findUnique({ where: { refreshTokenHash: sha256Hex(refreshToken) } });
  if (!session || session.expiresAt < new Date()) {
    throw new ApiError(status.UNAUTHORIZED, 'Session expired, please sign in again', ERROR_CODES.INVALID_TOKEN);
  }
  await prisma.session.delete({ where: { id: session.id } });
  return { message: 'Session refreshed', data: await issueTokens(session.userId) };
}

export async function logout(refreshToken: string): Promise<ServiceResult<null>> {
  await prisma.session.deleteMany({ where: { refreshTokenHash: sha256Hex(refreshToken) } });
  return { message: 'Signed out', data: null };
}

export async function getProfile(userId: string): Promise<ServiceResult<Profile>> {
  return { message: 'Profile retrieved', data: await loadProfile(userId) };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ServiceResult<null>> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) throw new ApiError(status.BAD_REQUEST, 'Current password is incorrect', ERROR_CODES.INVALID_CREDENTIALS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS) } }),
    prisma.session.deleteMany({ where: { userId } }),
  ]);
  return { message: 'Password changed — please sign in again', data: null };
}

export async function updateProfile(
  userId: string,
  input: { name?: string; accountName?: string },
): Promise<ServiceResult<Profile>> {
  const user = await prisma.user.update({ where: { id: userId }, data: { name: input.name } });
  if (input.accountName) {
    await prisma.account.update({ where: { id: user.accountId }, data: { name: input.accountName } });
  }
  return { message: 'Profile updated', data: await loadProfile(userId) };
}
