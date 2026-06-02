import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";

const router = Router();

router.post("/", authenticate, authorize("VENDOR", "ADMIN"), async (req, res) => {
  const listing = await prisma.wasteListing.create({ data: req.body });
  res.status(201).json({ listing });
});

router.put("/:id", authenticate, authorize("VENDOR", "ADMIN"), async (req, res) => {
  const listing = await prisma.wasteListing.update({
    where: { id: String(req.params.id) },
    data: req.body,
  });
  res.json({ listing });
});

router.delete("/:id", authenticate, authorize("VENDOR", "ADMIN"), async (req, res) => {
  await prisma.wasteListing.delete({ where: { id: String(req.params.id) } });
  res.status(204).send();
});

router.post("/:id/buy", authenticate, async (req, res) => {
  const listing = await prisma.wasteListing.findUnique({ where: { id: String(req.params.id) } });
  if (!listing) return res.status(404).json({ message: "Listing not found" });
  res.json({ message: "Waste listing purchased", listing });
});

router.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "");
  const listings = await prisma.wasteListing.findMany({
    where: { productName: { contains: q, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ listings });
});

export default router;
