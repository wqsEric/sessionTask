import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = postgres(process.env.DATABASE_URL, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: 'postgres-drizzle' });
await client.end();
console.log('PostgreSQL migrations applied');
