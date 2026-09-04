import { desc, eq, or } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { contactRequests, listings } from '@/db/schema';
import { jsonError } from '@/lib/listings';

export async function GET() {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const rows = await getDb().select({ id: contactRequests.id, listingId: contactRequests.listingId, listingTitle: listings.title, listingOwnerId: listings.ownerId, requesterId: contactRequests.requesterId, message: contactRequests.message, status: contactRequests.status, createdAt: contactRequests.createdAt }).from(contactRequests).innerJoin(listings, eq(contactRequests.listingId, listings.id)).where(or(eq(contactRequests.requesterId, user.userId), eq(listings.ownerId, user.userId))).orderBy(desc(contactRequests.createdAt)).limit(100);
  return Response.json({ requests: rows.map((row) => ({ id: row.id, listingId: row.listingId, listingTitle: row.listingTitle, direction: row.listingOwnerId === user.userId ? 'incoming' : 'outgoing', message: row.message, status: row.status, createdAt: row.createdAt })) });
}
