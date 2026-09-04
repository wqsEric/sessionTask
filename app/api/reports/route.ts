import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { listings, reports } from '@/db/schema';
import { jsonError } from '@/lib/listings';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const raw = await request.json() as { listingId?: string; reason?: string }; const listingId = raw.listingId?.trim(); const reason = raw.reason?.trim().slice(0, 300);
  if (!listingId || !reason) return jsonError('请选择举报原因并补充说明');
  const [listing] = await getDb().select({ id: listings.id }).from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) return jsonError('信息不存在', 404);
  const id = crypto.randomUUID(); await getDb().insert(reports).values({ id, listingId, reporterId: user.userId, reason, createdAt: new Date() });
  return Response.json({ id, received: true }, { status: 201 });
}
