import { Router } from "express";
import multer from "multer";
import { AuthenticatedRequest, authenticate } from "../../middleware/auth.middleware";
import { uploadToCloudinary } from "../../services/cloudinary/cloudinary.service";
import { parseInvoice } from "./ocr.service";
import { prisma } from "../../database/prisma";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", authenticate, upload.single("invoice"), async (req: AuthenticatedRequest, res) => {
  const file = (req as AuthenticatedRequest & { file?: Express.Multer.File }).file;
  if (!file) return res.status(400).json({ message: "Invoice file is required" });
  const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
  const uploaded = await uploadToCloudinary(base64, "vendor-saathi/invoices");
  const extracted = await parseInvoice(uploaded.secure_url);

  const record = await prisma.extractedInvoice.create({
    data: {
      userId: req.user!.userId,
      imageUrl: uploaded.secure_url,
      vendorName: extracted.vendorName,
      extractedItems: extracted.items,
      quantity: extracted.quantity,
      total: extracted.total,
    },
  });

  res.status(201).json({ record });
});

export default router;
