import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    role: z.enum(["ADMIN", "CUSTOMER", "VENDOR", "SUPPLIER"]),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    phone: z.string(),
    password: z.string(),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string(),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string(),
    otp: z.string().length(6),
  }),
});
