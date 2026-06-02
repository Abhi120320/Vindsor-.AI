# Deploy backend on Render

## Steps (only)

1. **Delete** the old Docker web service on [Render Dashboard](https://dashboard.render.com) (you can delete Postgres too if you want a clean slate).

2. **New → Blueprint** → connect repo **`Abhi120320/Vindsor-.AI`** → apply **`render.yaml`**.

3. When prompted, set **`GROQ_API_KEY`** (from [console.groq.com](https://console.groq.com)).

4. Wait until the service is **Live**, then open:

   `https://<your-service-name>.onrender.com/health`

   Expected: `{"status":"ok","database":"connected"}`

---

## Vercel (after backend is Live)

```
BACKEND_API_URL=https://<your-service-name>.onrender.com
NEXT_PUBLIC_BACKEND_URL=https://<your-service-name>.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://<your-service-name>.onrender.com
```

Redeploy Vercel.

## Demo login (after first deploy)

| Role | Phone | Password |
|------|-------|----------|
| Customer | 9000000003 | password123 |
| Vendor | 9000000002 | password123 |
