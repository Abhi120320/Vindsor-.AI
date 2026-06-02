import { Request, Response } from "express";
import { AppError } from "../../utils/app-error";
import {
  createProduct,
  deleteProduct,
  getProductById,
  listProducts,
  updateProduct,
} from "./products.service";

export const createProductController = async (req: Request, res: Response) => {
  const product = await createProduct(req.body);
  res.status(201).json({ product });
};

export const listProductsController = async (req: Request, res: Response) => {
  const payload = await listProducts(req.query);
  res.json(payload);
};

export const getProductController = async (req: Request, res: Response) => {
  const product = await getProductById(String(req.params.id));
  if (!product) throw new AppError("Product not found", 404);
  res.json({ product });
};

export const updateProductController = async (req: Request, res: Response) => {
  const product = await updateProduct(String(req.params.id), req.body);
  res.json({ product });
};

export const deleteProductController = async (req: Request, res: Response) => {
  await deleteProduct(String(req.params.id));
  res.status(204).send();
};
