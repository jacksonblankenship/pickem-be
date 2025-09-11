import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Determine if we're in CI
const isCI = !!process.env.CI;

if (!isCI) {
  dotenv.config({ path: '.env.development' });
}

export default defineConfig({
  out: './supabase/migrations',
  schema: './src/database/db.schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
