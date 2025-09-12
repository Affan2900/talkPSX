import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config({ path: ".env.local" })

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/app/db/schema.ts", 
  dbCredentials: {
    url: process.env.DATABASE_URL!, 
  },
  migrations: {
    table: '__drizzle_migrations', 
    schema: 'public', 
  },
});