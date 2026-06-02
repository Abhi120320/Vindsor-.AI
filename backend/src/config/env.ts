import "dotenv/config";
import { z } from "zod";
import { resolveDatabaseUrl } from "./database-url";

const resolvedDatabaseUrl = resolveDatabaseUrl();
if (resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

const isProduction = process.env.NODE_ENV === "production";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(8080),
    FRONTEND_URL: z.string().url().default("http://127.0.0.1:3000"),
    DATABASE_URL: isProduction
      ? z.string().min(1, "DATABASE_URL is required in production")
      : z.string().default("postgresql://postgres:postgres@localhost:5432/vendor_saathi"),
    REDIS_URL: z.string().optional(),
    JWT_ACCESS_SECRET: isProduction
      ? z.string().min(16, "JWT_ACCESS_SECRET must be at least 16 characters in production")
      : z.string().min(10).default("dev_access_secret_12345"),
    JWT_REFRESH_SECRET: isProduction
      ? z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters in production")
      : z.string().min(10).default("dev_refresh_secret_12345"),
    JWT_ACCESS_EXPIRES: z.string().default("15m"),
    JWT_REFRESH_EXPIRES: z.string().default("7d"),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SECURE: z.coerce.boolean().optional(),
    GROQ_API_KEY: z.string().optional(),
    GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    WEATHER_API_KEY: z.string().optional(),
    RUN_SEED: z.enum(["true", "false"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") {
      return;
    }

    if (/localhost|127\.0\.0\.1/.test(data.DATABASE_URL)) {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_URL"],
        message: "DATABASE_URL must not point to localhost in production",
      });
    }

    if (data.JWT_ACCESS_SECRET.startsWith("dev_") || data.JWT_REFRESH_SECRET.startsWith("dev_")) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_ACCESS_SECRET"],
        message: "Set strong JWT secrets in production (not dev defaults)",
      });
    }
  });

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  COOKIE_SECURE: parsed.COOKIE_SECURE ?? parsed.NODE_ENV === "production",
  REDIS_URL: parsed.REDIS_URL ?? "redis://127.0.0.1:6379",
};
