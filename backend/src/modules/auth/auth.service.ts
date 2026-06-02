import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../../database/prisma";
import { AppError } from "../../utils/app-error";
import { generateOtp, otpExpiry } from "../../utils/otp";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";

const SALT_ROUNDS = 10;

export const registerUser = async (payload: {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: Role;
}) => {
  const exists = await prisma.user.findUnique({ where: { phone: payload.phone } });
  if (exists) throw new AppError("User with phone already exists", 409);

  const hashedPassword = payload.password
    ? await bcrypt.hash(payload.password, SALT_ROUNDS)
    : undefined;

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      password: hashedPassword,
      role: payload.role,
    },
  });

  if (payload.role === "VENDOR") {
    await prisma.vendor.create({
      data: {
        userId: user.id,
        businessName: `${payload.name}'s Store`,
        location: "Unknown",
        category: "General",
      },
    });
  }

  if (payload.role === "SUPPLIER") {
    await prisma.supplier.create({
      data: {
        userId: user.id,
        businessName: `${payload.name}'s Supply`,
        location: "Unknown",
      },
    });
  }

  return user;
};

export const loginWithPassword = async (phone: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.password) throw new AppError("Invalid credentials", 401);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError("Invalid credentials", 401);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return { user, accessToken, refreshToken };
};

export const sendOtp = async (phone: string) => {
  const otp = generateOtp();
  const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
  const expiry = otpExpiry();

  await prisma.user.upsert({
    where: { phone },
    update: { otpCode: hashedOtp, otpExpiresAt: expiry },
    create: {
      name: "Guest User",
      phone,
      role: "CUSTOMER",
      otpCode: hashedOtp,
      otpExpiresAt: expiry,
    },
  });

  return { phone, otp };
};

export const verifyOtpAndLogin = async (phone: string, otp: string) => {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user?.otpCode || !user.otpExpiresAt) throw new AppError("OTP not found", 400);
  if (user.otpExpiresAt < new Date()) throw new AppError("OTP expired", 400);

  const valid = await bcrypt.compare(otp, user.otpCode);
  if (!valid) throw new AppError("Invalid OTP", 400);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  const refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: null,
      otpExpiresAt: null,
      refreshTokenHash,
    },
  });

  return { user, accessToken, refreshToken };
};

export const refreshAccess = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user?.refreshTokenHash) throw new AppError("Invalid refresh token", 401);
  const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!valid) throw new AppError("Invalid refresh token", 401);

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const newRefreshToken = signRefreshToken({ userId: user.id, role: user.role });
  const refreshTokenHash = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshTokenHash },
  });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshTokenHash: null },
  });
};
