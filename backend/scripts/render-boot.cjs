/**
 * Runs before the API starts (Docker entrypoint + Render pre-deploy).
 * Resolves DATABASE_URL, applies schema, optional seed.
 */
const { execSync } = require("child_process");
const path = require("path");

const URL_KEYS = [
  "DATABASE_URL",
  "DATABASE_PRIVATE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRIVATE_URL",
];

function resolveDatabaseUrl(env) {
  for (const key of URL_KEYS) {
    const value = env[key]?.trim();
    if (value) return value;
  }
  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || "5432";
    return `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${port}/${PGDATABASE}`;
  }
  return null;
}

function normalizeDatabaseUrl(url) {
  if (/localhost|127\.0\.0\.1/.test(url)) return url;
  if (/sslmode=|ssl=/.test(url)) return url;
  if (/render\.com|rlwy\.net|railway\.app/.test(url)) {
    return url.includes("?") ? `${url}&sslmode=require` : `${url}?sslmode=require`;
  }
  return url;
}

function log(msg) {
  // eslint-disable-next-line no-console
  console.log(msg);
}

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

const resolved = resolveDatabaseUrl(process.env);
if (!resolved) {
  fail(`No database URL found.

Render — on your WEB service (not Postgres only):
  Environment → Add from database → PostgreSQL → add DATABASE_URL
  (or PGHOST + PGUSER + PGPASSWORD + PGDATABASE)

Then Save Changes and redeploy.`);
}

process.env.DATABASE_URL = normalizeDatabaseUrl(resolved);
log("Applying database schema...");

const maxAttempts = 30;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    execSync("npx prisma db push --skip-generate", { stdio: "inherit", env: process.env });
    log("Database schema applied.");
    break;
  } catch {
    if (attempt >= maxAttempts) {
      fail("prisma db push failed. Link Postgres DATABASE_URL to this web service.");
    }
    log(`Database not ready (${attempt}/${maxAttempts}), retrying in 3s...`);
    execSync("sleep 3");
  }
}

if (process.env.RUN_SEED === "true") {
  log("Running database seed...");
  const seedPath = path.join(process.cwd(), "dist", "prisma", "seed.js");
  try {
    execSync(`node "${seedPath}"`, { stdio: "inherit", env: process.env });
    log("Seed finished.");
  } catch {
    log("Seed skipped (already seeded or unavailable).");
  }
}
