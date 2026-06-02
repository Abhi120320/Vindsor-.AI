import { prisma } from "../../database/prisma";
import { getPagination } from "../../utils/pagination";

export const createProduct = (data: {
  vendorId?: string;
  supplierId?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  quality?: string;
  expiryDate?: string | Date;
  lowestPrice?: number;
  rescueThresholdDays?: number;
}) => {
  const { vendorId, supplierId, expiryDate, ...fields } = data;

  return prisma.product.create({
    data: {
      ...fields,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      rescueNotifiedAt: null,
      ...(vendorId ? { vendor: { connect: { id: vendorId } } } : {}),
      ...(supplierId ? { supplier: { connect: { id: supplierId } } } : {}),
    },
  });
};

export const listProducts = async (query: Record<string, unknown>) => {
  const { page, limit, skip, take } = getPagination(
    Number(query.page),
    Number(query.limit)
  );
  const search = (query.search as string) ?? "";
  const category = query.category as string | undefined;

  const where = {
    AND: [
      category ? { category } : {},
      search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
    prisma.product.count({ where }),
  ]);

  return { items, page, limit, total };
};

export const getProductById = (id: string) =>
  prisma.product.findUnique({ where: { id } });

export const updateProduct = (id: string, data: Record<string, unknown>) =>
  prisma.product.update({ where: { id }, data });

export const deleteProduct = (id: string) =>
  prisma.product.delete({ where: { id } });
