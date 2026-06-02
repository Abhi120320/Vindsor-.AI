import crypto from "crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env";

export const razorpay =
  env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      })
    : null;

export const verifyRazorpaySignature = (input: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const body = `${input.orderId}|${input.paymentId}`;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET ?? "")
    .update(body)
    .digest("hex");
  return expected === input.signature;
};
