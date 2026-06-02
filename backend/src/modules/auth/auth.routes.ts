import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/auth.middleware";
import { validate } from "../../middleware/validate.middleware";
import {
  login,
  logoutController,
  profileController,
  refreshTokenController,
  register,
  sendOtpController,
  verifyOtpController,
} from "./auth.controller";
import { loginSchema, registerSchema, sendOtpSchema, verifyOtpSchema } from "./auth.schema";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please wait a few minutes and try again." },
});

router.use(authLimiter);

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/send-otp", validate(sendOtpSchema), sendOtpController);
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtpController);
router.post("/refresh-token", refreshTokenController);
router.post("/logout", authenticate, logoutController);
router.get("/profile", authenticate, profileController);

export default router;
