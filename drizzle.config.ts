import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './postgres-drizzle',
  schema: './db/schema.ts',
  dialect: 'postgresql',
});
