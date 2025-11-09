import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: process.env.DATABASE_URL ? 'postgresql' : 'sqlite',
  dbCredentials: process.env.DATABASE_URL ? {
    url: process.env.DATABASE_URL,
  } : {
    url: 'lms.db',
  },
} satisfies Config;
