import { Router } from "express";
import { authenticate, authorize } from "../../middleware/auth.middleware";
import {
  createProductController,
  deleteProductController,
  getProductController,
  listProductsController,
  updateProductController,
} from "./products.controller";

const router = Router();

router.post("/", authenticate, authorize("ADMIN", "VENDOR", "SUPPLIER"), createProductController);
router.get("/", listProductsController);
router.get("/:id", getProductController);
router.put("/:id", authenticate, authorize("ADMIN", "VENDOR", "SUPPLIER"), updateProductController);
router.delete("/:id", authenticate, authorize("ADMIN", "VENDOR"), deleteProductController);

export default router;
