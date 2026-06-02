import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { prisma } from "../../database/prisma";
import { getWeatherSnapshot } from "../../services/weather/weather.service";
import { getSocket } from "../../socket";

const router = Router();

router.post("/generate", authenticate, async (req, res) => {
  const { vendorId } = req.body;
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    include: { sellerOrders: true, products: true, user: true },
  });
  if (!vendor) return res.status(404).json({ message: "Vendor not found" });

  const weatherData = await getWeatherSnapshot(vendor.location);
  const historicalSales = vendor.sellerOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const stockPressure = vendor.products.reduce((sum, p) => sum + p.stock, 0);

  const tomorrowDemand = Math.round((historicalSales / Math.max(vendor.sellerOrders.length, 1)) * 0.2);
  const weeklyDemand = tomorrowDemand * 7;
  const seasonalTrends = weatherData.tempC > 30 ? "Cold items demand likely to increase" : "Staples demand stable";
  const confidenceScore = Math.max(0.55, Math.min(0.95, 1 - stockPressure / 10000));

  const forecast = await prisma.forecast.create({
    data: {
      vendorId,
      confidenceScore,
      weatherData,
      predictedDemand: {
        tomorrowDemand,
        weeklyDemand,
        seasonalTrends,
      },
    },
  });

  getSocket().to("vendor-room").emit("forecast-ready", forecast);
  getSocket().to("vendor-room").emit("forecast-generated", forecast);
  res.status(201).json({ forecast });
});

router.get("/:vendorId", authenticate, async (req, res) => {
  const vendorId = String(req.params.vendorId);
  const forecasts = await prisma.forecast.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ forecasts });
});

export default router;
