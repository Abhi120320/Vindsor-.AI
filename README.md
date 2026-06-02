# Vendsor .AI

Hyperlocal grocery marketplace with AI shopping assistant, vendor bargaining, rescue pricing, voice orders, and live analytics.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React 19, Zustand, Tailwind CSS |
| Backend | Express 5, TypeScript, Prisma, PostgreSQL, Redis |
| Realtime | Socket.IO |
| AI | Groq (grocery bot + vendor advisor) |
| Deploy | Docker Compose, Railway-ready backend |

## Quick start (Docker)

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
# Edit backend/.env — set JWT secrets and GROQ_API_KEY

# 2. Run full stack
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8080 |
| API docs | http://localhost:8080/api/docs |

Seed demo users (first run):

```bash
docker compose exec backend npx prisma db seed
```

### Demo credentials (after seed)

| Role | Phone | Password |
|------|-------|----------|
| Admin | 9000000001 | password123 |
| Vendor | 9000000002 | password123 |
| Customer | 9000000003 | password123 |

## Local development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

## Environment variables

### Backend (`backend/.env`)

See [`backend/.env.example`](backend/.env.example). Required for production:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — strong random strings
- `GROQ_API_KEY` — for AI grocery bot and bargaining advisor
- `FRONTEND_URL` — allowed CORS origin (e.g. `https://your-app.vercel.app`)

Optional: Razorpay, Cloudinary, Weather API keys.

### Frontend (`frontend/.env.local`)

See [`frontend/.env.example`](frontend/.env.example).

- `BACKEND_API_URL` — backend base URL (required)
- Supabase keys — optional shadow logging only

## Production notes

- **Never commit** `.env` or `.env.local` files.
- Rotate any API keys that were used in local development before deploying.
- Backend Docker image runs `prisma db push` on startup; set `RUN_SEED=true` once for fresh DBs.
- Rebuild backend after schema changes: `docker compose build backend && docker compose up -d backend`.

## Project structure

```
├── frontend/          Next.js app (customer, vendor, admin UIs)
├── backend/           Express API + Prisma + Socket.IO
├── docker-compose.yml Full-stack local/production compose
└── README.md
```

## Features

- Customer: browse, cart, bargaining chats, voice orders, grocery AI bot, rescue deals
- Vendor: stock manager, bargaining inbox, order fulfillment, analytics dashboard
- Admin: vendor verification, dispute handling, platform metrics
- Backend: JWT auth, RBAC, marketplace, orders, payments, notifications, forecasting

## License

Private — all rights reserved unless otherwise specified by the repository owner.
