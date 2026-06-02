# Deploy Vendsor .AI Backend on Render

## Option A — Blueprint (Postgres + API auto-wired)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect repo `Abhi120320/Vindsor-.AI` → apply `render.yaml`
3. Set **`GROQ_API_KEY`** when prompted
4. Wait for **Live**, then open `https://<service>.onrender.com/health`

## Option B — Manual web service

### 1. PostgreSQL

**New → PostgreSQL** — same region as web service (e.g. Singapore). Copy **Internal Database URL**.

### 2. Web service

| Setting | Value |
|---------|--------|
| **Runtime** | Docker |
| **Root Directory** | *(empty)* |
| **Dockerfile Path** | `Dockerfile` |
| **Branch** | `main` |

### 3. Environment variables

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | Internal Database URL from Postgres |
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` | random 32+ chars |
| `JWT_REFRESH_SECRET` | random 32+ chars |
| `FRONTEND_URL` | `https://vindsor-ai.vercel.app` |
| `GROQ_API_KEY` | your Groq key |
| `RUN_SEED` | `true` (first deploy) |
| `COOKIE_SECURE` | `true` |

Do **not** set `PORT` — Render injects it.

### 4. Deploy

**Manual Deploy → Clear build cache & deploy**

Success logs:

```
Applying database schema...
Database schema applied.
Vendsor .AI backend listening on 0.0.0.0:10000
```

Verify: `curl https://YOUR-SERVICE.onrender.com/health` → `{"status":"ok","database":"connected"}`

## Vercel frontend

```
BACKEND_API_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://YOUR-SERVICE.onrender.com
```

## Demo login (after seed)

| Role | Phone | Password |
|------|-------|----------|
| Admin | 9000000001 | password123 |
| Vendor | 9000000002 | password123 |
| Customer | 9000000003 | password123 |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `DATABASE_URL is not set` | Create Postgres; paste Internal URL on web service |
| `Applying database schema...` then exit 1 | Wrong/missing `DATABASE_URL` |
| `npm warn deprecated` during build | Harmless — ignore |
| CORS errors | `FRONTEND_URL` must match Vercel URL exactly |
