import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { prisma } from "./database/prisma";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/users.routes";
import vendorRoutes from "./modules/vendors/vendors.routes";
import supplierRoutes from "./modules/suppliers/suppliers.routes";
import productRoutes from "./modules/products/products.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import orderRoutes from "./modules/orders/orders.routes";
import marketplaceRoutes from "./modules/marketplace/marketplace.routes";
import wasteRoutes from "./modules/waste-exchange/waste-exchange.routes";
import forecastingRoutes from "./modules/forecasting/forecasting.routes";
import analyticsRoutes from "./modules/analytics/analytics.routes";
import healthScoreRoutes from "./modules/health-score/health-score.routes";
import notificationRoutes from "./modules/notifications/notifications.routes";
import paymentRoutes from "./modules/payments/payments.routes";
import aiRoutes from "./modules/ai-assistant/ai-assistant.routes";
import ocrRoutes from "./modules/ocr/ocr.routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export const app = express();

app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Behind the Next.js proxy, all requests can share one IP unless x-forwarded-for is set.
// Keep limits generous for local/dev; only tighten in production.
if (env.NODE_ENV === "production") {
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === "/health" || req.path === "/",
    })
  );
}
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "degraded", database: "disconnected" });
  }
});

app.get("/", (_req, res) => {
  res.json({
    name: "Vendsor .AI Backend",
    status: "running",
    health: "/health",
    docs: "/api/docs",
  });
});

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/products", productRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/waste-exchange", wasteRoutes);
app.use("/api/forecast", forecastingRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/health-score", healthScoreRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ocr", ocrRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
