import { desc, eq } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { listings } from '@/db/schema';
import { jsonError } from '@/lib/listings';

export async function GET() {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const rows = await getDb().select().from(listings).where(eq(listings.ownerId, user.userId)).orderBy(desc(listings.createdAt)).limit(100);
  return Response.json({ listings: rows });
}
