import { Request, Response } from "express";
import { prisma } from "../../database/prisma";
import { AuthenticatedRequest } from "../../middleware/auth.middleware";
import {
  loginWithPassword,
  logoutUser,
  refreshAccess,
  registerUser,
  sendOtp,
  verifyOtpAndLogin,
} from "./auth.service";

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });
};

export const register = async (req: Request, res: Response) => {
  const user = await registerUser(req.body);
  res.status(201).json({ user });
};

export const login = async (req: Request, res: Response) => {
  const { phone, password } = req.body;
  const payload = await loginWithPassword(phone, password);
  setRefreshCookie(res, payload.refreshToken);
  res.json(payload);
};

export const sendOtpController = async (req: Request, res: Response) => {
  const result = await sendOtp(req.body.phone);
  res.json({
    message: "OTP generated (mocked for hackathon)",
    debugOtp: process.env.NODE_ENV !== "production" ? result.otp : undefined,
  });
};

export const verifyOtpController = async (req: Request, res: Response) => {
  const payload = await verifyOtpAndLogin(req.body.phone, req.body.otp);
  setRefreshCookie(res, payload.refreshToken);
  res.json(payload);
};

export const refreshTokenController = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken ?? req.body.refreshToken;
  const payload = await refreshAccess(token);
  setRefreshCookie(res, payload.refreshToken);
  res.json(payload);
};

export const logoutController = async (req: AuthenticatedRequest, res: Response) => {
  await logoutUser(req.user!.userId);
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ message: "Logged out successfully" });
};

export const profileController = async (req: AuthenticatedRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { vendor: true, supplier: true },
  });
  res.json({ user });
};
