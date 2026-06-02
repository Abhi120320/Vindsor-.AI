# Vendsor .AI Backend

Production-ready Express + TypeScript backend for Vendsor .AI.

## Features

- JWT auth + refresh token + OTP login
- RBAC (ADMIN, CUSTOMER, VENDOR, SUPPLIER)
- Prisma + PostgreSQL schema for commerce workflows
- Product, inventory, orders, marketplace, waste exchange modules
- Razorpay payments with signature verification
- AI consultant via Groq
- OCR invoice extraction via Tesseract.js
- Demand forecasting + health score + analytics
- Socket.IO real-time event bus and notification persistence
- Swagger docs at `/api/docs`
- Jest + Supertest setup
- Docker + docker-compose + Railway config

## Quick Start

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

## Core Endpoints

- Auth: `/api/auth/*`
- Products: `/api/products`
- Marketplace: `/api/marketplace/*`
- Inventory: `/api/inventory/*`
- Orders: `/api/orders/*`
- Payments: `/api/payments/*`
- Waste Exchange: `/api/waste-exchange/*`
- AI: `/api/ai/chat`
- Forecasting: `/api/forecast/*`
- OCR: `/api/ocr/upload`
- Analytics: `/api/analytics/*`

## Frontend Integration

In frontend `.env.local` set:

```bash
BACKEND_API_URL=http://127.0.0.1:8080
```

The Next.js route `src/app/api/chat/route.ts` proxies AI requests to backend `/api/ai/chat`.
