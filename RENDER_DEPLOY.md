# Deploy backend on Render (simplest path)

Docker on Render often fails (`buildcache not found`, cache errors). **Use Node runtime instead** — configured in `render.yaml`.

---

## Recommended: fresh Blueprint deploy (~5 min)

1. **Delete** your old broken Render **web service** (keep Postgres if you already created it, or let Blueprint create a new one).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Repo: `Abhi120320/Vindsor-.AI` → apply **`render.yaml`**
4. Enter **`GROQ_API_KEY`** when asked
5. Wait until status **Live**
6. Open `https://<your-service>.onrender.com/health`  
   → must show: `{"status":"ok","database":"connected"}`

Blueprint auto-creates Postgres and wires **`DATABASE_URL`** — you should not see that error again.

---

## Manual Node service (no Docker)

| Setting | Value |
|---------|--------|
| **Runtime** | **Node** (not Docker) |
| **Root Directory** | `backend` |
| **Build Command** | `npm ci --legacy-peer-deps --no-audit --no-fund && npx prisma generate && npm run build` |
| **Pre-Deploy Command** | `node scripts/render-boot.cjs` |
| **Start Command** | `npm start` |

### Link Postgres (required)

1. **New → PostgreSQL** (same region as web service)
2. Web service → **Environment** → **Add from database** → Postgres → **`DATABASE_URL`**
3. Add: `NODE_ENV=production`, JWT secrets, `FRONTEND_URL`, `GROQ_API_KEY`, `RUN_SEED=true`
4. **Save** → redeploy

---

## Vercel (after backend is Live)

```
BACKEND_API_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://YOUR-SERVICE.onrender.com
```

---

## Demo login (after seed)

| Role | Phone | Password |
|------|-------|----------|
| Customer | 9000000003 | password123 |
| Vendor | 9000000002 | password123 |

---

## If something still fails

| Error | Fix |
|-------|-----|
| `DATABASE_URL is not set` | Link Postgres to **web** service (not Postgres-only) |
| `buildcache not found` | You are still on **Docker** — switch to **Node** runtime |
| `prisma db push failed` | Postgres not linked or wrong region |
| Build OK, app crashes | Paste logs after `Applying database schema...` |

**Do not use Docker on Render for this project** unless you know you need it. Node + `render.yaml` is the supported path.
