// db.ts
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Create and export Supabase client with service role key for server operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create and export Supabase client - using service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // No need to persist session on server
  }
});

// For server components only
let db: PostgresJsDatabase | null = null;
let sqlClient: ReturnType<typeof postgres> | null = null;
let cachedDatabaseUrl: string | undefined;

// This function should only be used in server components or API routes
export const getDB = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  if (db && cachedDatabaseUrl !== connectionString) {
    await sqlClient?.end({ timeout: 5 });
    db = null;
    sqlClient = null;
    cachedDatabaseUrl = undefined;
  }

  if (!db) {
    try {
      // Direct db.*:5432 is IPv6-first; use Session or Transaction pooler URI from
      // Supabase Connect if you see ECONNRESET on IPv4 networks (e.g. Windows).
      // prepare: false is required for transaction pooler (port 6543).
      sqlClient = postgres(connectionString, {
        ssl: "require",
        connect_timeout: 60,
        max: 3,
        prepare: false,
        keep_alive: 60,
      });

      db = drizzle(sqlClient);
      cachedDatabaseUrl = connectionString;
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }
  return db;
};