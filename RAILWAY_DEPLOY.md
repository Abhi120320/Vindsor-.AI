# Deploy Vendsor .AI Backend on Railway

One-time setup — follow in order.

## 1. Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select `Abhi120320/Vindsor-.AI`
3. Railway detects the root **`Dockerfile`** automatically (see `railway.toml`)

## 2. Add PostgreSQL

1. On the project canvas → **+ New** → **Database** → **PostgreSQL**
2. Wait until Postgres shows **Active**

## 3. Link database to API service

1. Click your **web service** (from GitHub)
2. **Variables** tab → **+ New Variable** → **Add Reference**
3. Select the **PostgreSQL** service → variable **`DATABASE_URL`**
4. Add these variables manually:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` | Random 32+ characters |
| `JWT_REFRESH_SECRET` | Different random 32+ characters |
| `FRONTEND_URL` | `https://vindsor-ai.vercel.app` |
| `GROQ_API_KEY` | Your Groq API key |
| `RUN_SEED` | `true` (first deploy only) |
| `COOKIE_SECURE` | `true` |

**Do not set `PORT`** — Railway injects it.

**Do not set `REDIS_URL`** unless you add Redis — optional.

## 4. Public URL

1. Web service → **Settings** → **Networking** → **Generate Domain**
2. Copy the URL (e.g. `https://vindsor-ai-production.up.railway.app`)

## 5. Deploy

Railway deploys on every push to `main`. Or click **Deploy** on the service.

Success logs:

```
Applying database schema...
Database schema applied.
Running database seed...
Seed complete: demo users and sample data created.
Starting application...
Vendsor .AI backend listening on 0.0.0.0:8080
```

Verify:

```bash
curl https://YOUR-DOMAIN.up.railway.app/health
```

Expected: `{"status":"ok","database":"connected"}`

## 6. Connect Vercel frontend

Vercel → Environment Variables:

```
BACKEND_API_URL=https://YOUR-DOMAIN.up.railway.app
NEXT_PUBLIC_BACKEND_URL=https://YOUR-DOMAIN.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://YOUR-DOMAIN.up.railway.app
```

Redeploy Vercel. Confirm Railway `FRONTEND_URL` matches your Vercel domain exactly.

## Demo login (after seed)

| Role | Phone | Password |
|------|-------|----------|
| Admin | 9000000001 | password123 |
| Vendor | 9000000002 | password123 |
| Customer | 9000000003 | password123 |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DATABASE_URL is not set` | Add Postgres + reference `DATABASE_URL` on web service |
| `DATABASE_URL points to localhost` | Use Railway reference variable, not a local URL |
| `prisma db push failed` | Postgres must be Active; redeploy after linking DB |
| Build succeeds, crash on start | Check runtime logs after `Applying database schema...` |
| CORS errors | `FRONTEND_URL` must match Vercel URL (https, no trailing slash) |

## What runs on deploy

1. Docker build: `npm ci` → `prisma generate` → `tsc` (includes seed)
2. Container start: validate `DATABASE_URL` → `prisma db push` (retries) → optional seed → Node server on `0.0.0.0:$PORT`
