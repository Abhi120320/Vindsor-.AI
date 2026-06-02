const URL_KEYS = [
  "DATABASE_URL",
  "DATABASE_PRIVATE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRIVATE_URL",
] as const;

/** Build or read DATABASE_URL for Render / managed Postgres. */
export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const key of URL_KEYS) {
    const value = env[key]?.trim();
    if (value) {
      return value;
    }
  }

  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = env;
  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    const port = PGPORT || "5432";
    return `postgresql://${encodeURIComponent(PGUSER)}:${encodeURIComponent(PGPASSWORD)}@${PGHOST}:${port}/${PGDATABASE}`;
  }

  return undefined;
}

/** Add SSL for hosted Postgres when required. */
export function normalizeDatabaseUrl(url: string): string {
  if (/localhost|127\.0\.0\.1/.test(url)) {
    return url;
  }
  if (/sslmode=|ssl=/.test(url)) {
    return url;
  }
  if (/render\.com|rlwy\.net|railway\.app/.test(url)) {
    return url.includes("?") ? `${url}&sslmode=require` : `${url}?sslmode=require`;
  }
  return url;
}

export function getDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const resolved = resolveDatabaseUrl(env);
  return resolved ? normalizeDatabaseUrl(resolved) : undefined;
}
