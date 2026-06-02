import { Router } from "express";
import { askGroq } from "../../services/groq/groq.service";
import { prisma } from "../../database/prisma";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { vendorId, message, messages, system } = req.body as {
      vendorId?: string;
      message?: string;
      messages?: Array<{ role: string; content: string }>;
      system?: string;
    };

    let prompt = message ?? "";
    if (!prompt && Array.isArray(messages)) {
      prompt = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
    }

    let context = prompt;
    if (vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: { products: true, sellerOrders: true },
      });
      context = `
Vendor: ${vendor?.businessName}
Location: ${vendor?.location}
Products: ${vendor?.products.length ?? 0}
Orders: ${vendor?.sellerOrders.length ?? 0}
Question: ${prompt}
Provide business recommendations, inventory suggestions, sales insights, supplier recommendations.
`;
    }

    const response = await askGroq(context, system);
    res.json({
      response,
      content: [{ type: "text", text: response }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI chat failed";
    res.status(502).json({ error: message });
  }
});

export default router;
