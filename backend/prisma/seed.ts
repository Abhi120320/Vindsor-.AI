import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function createUserWithRole(input: {
  name: string;
  phone: string;
  email: string;
  role: Role;
}) {
  const password = await bcrypt.hash("password123", 10);
  return prisma.user.upsert({
    where: { phone: input.phone },
    update: {},
    create: {
      ...input,
      password,
    },
  });
}

async function main() {
  const admin = await createUserWithRole({
    name: "Admin",
    phone: "9000000001",
    email: "admin@vendorsaathi.ai",
    role: "ADMIN",
  });

  const vendorUser = await createUserWithRole({
    name: "Vendor One",
    phone: "9000000002",
    email: "vendor@vendorsaathi.ai",
    role: "VENDOR",
  });

  const customer = await createUserWithRole({
    name: "Customer One",
    phone: "9000000003",
    email: "customer@vendorsaathi.ai",
    role: "CUSTOMER",
  });

  const supplierUser = await createUserWithRole({
    name: "Supplier One",
    phone: "9000000004",
    email: "supplier@vendorsaathi.ai",
    role: "SUPPLIER",
  });

  const vendor = await prisma.vendor.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "Fresh Mart",
      location: "Bengaluru",
      category: "Grocery",
      rating: 4.5,
    },
  });

  const supplier = await prisma.supplier.upsert({
    where: { userId: supplierUser.id },
    update: {},
    create: {
      userId: supplierUser.id,
      businessName: "Agri Supply Co",
      location: "Bengaluru",
      verified: true,
      rating: 4.7,
    },
  });

  const product = await prisma.product.create({
    data: {
      vendorId: vendor.id,
      supplierId: supplier.id,
      name: "Organic Tomatoes",
      description: "Fresh farm tomatoes",
      category: "Vegetables",
      price: 40,
      stock: 120,
    },
  });

  await prisma.inventory.upsert({
    where: { vendorId_productId: { vendorId: vendor.id, productId: product.id } },
    update: {},
    create: {
      vendorId: vendor.id,
      productId: product.id,
      quantity: 120,
      threshold: 20,
    },
  });

  const order = await prisma.order.create({
    data: {
      buyerId: customer.id,
      sellerId: vendor.id,
      totalAmount: 80,
      status: "PENDING",
      items: {
        create: [{ productId: product.id, quantity: 2, unitPrice: 40 }],
      },
    },
  });

  await prisma.payment.create({
    data: {
      orderId: order.id,
      amount: 80,
      status: "PENDING",
    },
  });

  await prisma.healthScore.create({
    data: {
      vendorId: vendor.id,
      score: 78,
      profitability: 75,
      inventoryEfficiency: 80,
      customerRating: 90,
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "Seed complete",
      message: "Database seeded successfully.",
      type: "SYSTEM",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
