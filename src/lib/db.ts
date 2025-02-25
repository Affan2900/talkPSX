// db.ts
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";

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

// This function should only be used in server components or API routes
export const getDB = async () => {
  if (!db) {
    try {
      // For direct database access using Drizzle
      const postgres = (await import('postgres')).default;

      // Use Supabase connection string if available
      const connectionString = process.env.DATABASE_URL;
      
      if (!connectionString) {
        throw new Error("DATABASE_URL is not defined in environment variables");
      }
      
      const sql = postgres(connectionString, { 
        ssl: "require", 
        connect_timeout: 60,
        max: 1
      });
      
      db = drizzle(sql);
    } catch (error) {
      console.error("Database connection error:", error);
      throw error;
    }
  }
  return db;
};