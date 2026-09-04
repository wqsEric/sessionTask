import { and, eq } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { contactRequests, listings } from '@/db/schema';
import { jsonError } from '@/lib/listings';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const { id } = await context.params; const body = await request.json() as { status?: string };
  if (body.status !== 'accepted' && body.status !== 'declined') return jsonError('状态值不正确');
  const [row] = await getDb().select({ id: contactRequests.id }).from(contactRequests).innerJoin(listings, eq(contactRequests.listingId, listings.id)).where(and(eq(contactRequests.id, id), eq(listings.ownerId, user.userId))).limit(1);
  if (!row) return jsonError('申请不存在或无权处理', 404);
  await getDb().update(contactRequests).set({ status: body.status }).where(eq(contactRequests.id, id));
  return Response.json({ id, status: body.status });
}
