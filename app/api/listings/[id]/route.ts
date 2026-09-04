import { and, eq } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { listings } from '@/db/schema';
import { jsonError, STATUSES } from '@/lib/listings';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const { id } = await context.params; const body = await request.json() as { status?: string };
  if (!STATUSES.includes(body.status as (typeof STATUSES)[number])) return jsonError('状态值不正确');
  const result = await getDb().update(listings).set({ status: body.status as (typeof STATUSES)[number], updatedAt: new Date() }).where(and(eq(listings.id, id), eq(listings.ownerId, user.userId))).returning({ id: listings.id });
  if (!result.length) return jsonError('信息不存在或无权修改', 404);
  return Response.json({ id, status: body.status });
}
