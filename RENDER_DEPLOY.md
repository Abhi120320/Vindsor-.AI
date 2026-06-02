# Deploy Vendsor .AI Backend on Render

## Fix: `DATABASE_URL is not set`

Your **web service** does not have `DATABASE_URL`. Postgres on Render does **not** share env vars automatically unless you link them.

### Quick fix (2 minutes)

1. Open [Render Dashboard](https://dashboard.render.com)
2. If you have **no** Postgres yet: **New → PostgreSQL** (same region as your web app)
3. Click your **Docker web service** (e.g. `Vindsor-.AI`) — **not** the Postgres box alone
4. **Environment** → **Add Environment Variable**
5. Choose **Add from database** (or **Link database**) → select your **PostgreSQL** service
6. Add **`DATABASE_URL`** from the list (recommended)

   **Or** add these four together from the same Postgres service:
   `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (the app builds `DATABASE_URL` automatically)

7. Click **Save Changes** — Render redeploys
8. Logs should show `Database schema applied.` then `Starting application...`

**Common mistake:** Variables only exist on the Postgres service. They must be on the **web/API** service that runs the Dockerfile.

---

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
| `buildcache: not found` / `registry cache importer` | **Render-side** — no code fix. See below |
| CORS errors | `FRONTEND_URL` must match Vercel URL exactly |

### `buildcache: not found` (registry cache importer)

Render tries to load a **previous build cache** that does not exist yet (new service, first deploy, or after **Clear build cache**).

**This is not a bug in your Dockerfile.**

1. Click **Manual Deploy** again (do **not** clear cache this time).
2. If it still fails: **Manual Deploy → Clear build cache & deploy** once.
3. If both fail: wait 2 minutes and deploy again, or create a fresh web service linked to the same repo.

On many first deploys the log shows this message but the build **continues** and finishes. Only worry if the deploy status is **Failed** and no image was pushed.
