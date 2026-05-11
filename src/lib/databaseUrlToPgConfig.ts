import type { ClientConfig } from "pg";

/**
 * Build a `node-pg` config from `DATABASE_URL` using WHATWG `URL` parsing.
 * Avoids passing a raw connection string into `pg`, which uses libpq-style
 * parsing and mishandles some passwords (e.g. `!`) that psql and postgres.js accept.
 */
export function databaseUrlToPgConfig(
  connectionString?: string
): ClientConfig {
  const raw = (connectionString ?? process.env.DATABASE_URL)?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (Supabase: Project Settings → Database → Connection string, URI)."
    );
  }

  let url: URL;
  try {
    const forUrl = raw.replace(/^postgres(ql)?:/i, "http:");
    url = new URL(forUrl);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid URL. Percent-encode reserved characters in the password (e.g. @ as %40) if needed."
    );
  }

  const hostname = url.hostname;
  if (!hostname) {
    throw new Error("DATABASE_URL is missing a host.");
  }

  const database = url.pathname.replace(/^\//, "") || "postgres";
  const port = url.port ? parseInt(url.port, 10) : 5432;
  const user = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);

  if (!user) {
    throw new Error("DATABASE_URL is missing a user.");
  }

  const useSsl =
    hostname.includes("supabase") ||
    hostname.includes("neon.tech") ||
    /sslmode=require/i.test(raw);

  return {
    user,
    password,
    host: hostname,
    port,
    database,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } as const } : {}),
  };
}
