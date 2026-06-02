# Deploy Vendsor .AI Backend on Render

Follow this guide exactly for a zero-error deploy.

## Option A — Blueprint (recommended, creates Postgres automatically)

1. Push this repo to GitHub (`Abhi120320/Vindsor-.AI`).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**.
3. Connect the repo and apply `render.yaml`.
4. When prompted, set **`GROQ_API_KEY`** (from [console.groq.com](https://console.groq.com)).
5. Wait for deploy. Open `https://<your-service>.onrender.com/health` — expect:
   ```json
   {"status":"ok","database":"connected"}
   ```
6. After first successful deploy, set **`RUN_SEED=false`** in Environment (optional; seed is idempotent).

## Option B — Manual web service + Postgres

### Step 1 — PostgreSQL

| Setting | Value |
|---------|--------|
| **New → PostgreSQL** | Free tier OK |
| **Region** | Same as web service (e.g. Singapore) |
| **Database** | `vendor_saathi` |

Copy the **Internal Database URL** (not External).

### Step 2 — Web service

| Setting | Value |
|---------|--------|
| **New → Web Service** | Connect GitHub repo |
| **Name** | `vindsor-api` (any name) |
| **Region** | Same as Postgres |
| **Branch** | `main` |
| **Root Directory** | *(leave empty)* |
| **Runtime** | **Docker** |
| **Dockerfile Path** | `Dockerfile` |

### Step 3 — Environment variables

Add these in **Environment** (Web Service → Environment):

| Variable | Value | Required |
|----------|--------|----------|
| `DATABASE_URL` | Internal Database URL from Postgres | **Yes** |
| `NODE_ENV` | `production` | **Yes** |
| `JWT_ACCESS_SECRET` | Random 32+ character string | **Yes** |
| `JWT_REFRESH_SECRET` | Different random 32+ character string | **Yes** |
| `FRONTEND_URL` | `https://vindsor-ai.vercel.app` | **Yes** |
| `GROQ_API_KEY` | Your Groq API key | **Yes** (for AI features) |
| `RUN_SEED` | `true` (first deploy only) | First deploy |
| `COOKIE_SECURE` | `true` | Recommended |

**Do not set** `PORT` — Render injects it automatically.

**Do not set** `REDIS_URL` unless you have Redis — the app runs without it.

### Step 4 — Deploy

**Manual Deploy → Clear build cache & deploy**

### Step 5 — Verify

```bash
curl https://YOUR-SERVICE.onrender.com/health
curl https://YOUR-SERVICE.onrender.com/
```

Expected logs on success:

```
Applying database schema...
Database schema applied.
Running database seed...
Seed complete: demo users and sample data created.
Starting application...
Vendsor .AI backend listening on 0.0.0.0:10000
```

## Connect Vercel frontend

In Vercel → Project → Environment Variables:

```
BACKEND_API_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://YOUR-SERVICE.onrender.com
```

Redeploy frontend. On Render, confirm `FRONTEND_URL` matches your Vercel domain.

## Demo login (after seed)

| Role | Phone | Password |
|------|-------|----------|
| Admin | 9000000001 | password123 |
| Vendor | 9000000002 | password123 |
| Customer | 9000000003 | password123 |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DATABASE_URL is not set` | Create Postgres; paste **Internal** URL into web service env |
| `DATABASE_URL points to localhost` | Replace with Render Postgres Internal URL |
| `prisma db push failed` | Postgres and web service must be same region; use Internal URL |
| Build OK, crash at startup | Check logs above `Applying database schema...` |
| 502 / service sleeping | Free tier spins down; first request wakes it (~30s) |
| CORS errors on frontend | Set `FRONTEND_URL` to exact Vercel URL (https, no trailing slash) |
| AI bot says key missing | Set `GROQ_API_KEY` on Render and redeploy |

## What the Docker image does

1. `npm ci` + `prisma generate` + `tsc` (includes compiled seed)
2. On start: validate `DATABASE_URL` → `prisma db push` (with retries) → optional seed → `node dist/src/server.js`
3. Health check: `GET /health` returns DB status
