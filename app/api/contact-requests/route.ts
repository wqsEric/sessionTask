import { and, eq, gt } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { contactRequests, listings } from '@/db/schema';
import { jsonError } from '@/lib/listings';

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const raw = await request.json() as { listingId?: string; message?: string }; const listingId = raw.listingId?.trim(); const message = raw.message?.trim().slice(0, 200) || '我想进一步了解这条信息';
  if (!listingId) return jsonError('缺少信息编号');
  const [listing] = await getDb().select({ id: listings.id, ownerId: listings.ownerId }).from(listings).where(and(eq(listings.id, listingId), eq(listings.status, 'active'), gt(listings.expiresAt, new Date()))).limit(1);
  if (!listing) return jsonError('信息已失效或不存在', 404); if (listing.ownerId === user.userId) return jsonError('不能申请联系自己发布的信息');
  const [existing] = await getDb().select({ id: contactRequests.id }).from(contactRequests).where(and(eq(contactRequests.listingId, listingId), eq(contactRequests.requesterId, user.userId))).limit(1);
  if (existing) return Response.json({ id: existing.id, status: 'pending', duplicate: true });
  const id = crypto.randomUUID(); await getDb().insert(contactRequests).values({ id, listingId, requesterId: user.userId, message, status: 'pending', createdAt: new Date() });
  return Response.json({ id, status: 'pending' }, { status: 201 });
}
