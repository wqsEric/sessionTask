import { and, asc, eq, or } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { contactRequests, listings, messages } from '@/db/schema';
import { jsonError } from '@/lib/listings';

async function authorizedRequest(requestId: string, userId: string) {
  const [row] = await getDb().select({ id: contactRequests.id, requesterId: contactRequests.requesterId, ownerId: listings.ownerId, status: contactRequests.status }).from(contactRequests).innerJoin(listings, eq(contactRequests.listingId, listings.id)).where(and(eq(contactRequests.id, requestId), or(eq(contactRequests.requesterId, userId), eq(listings.ownerId, userId)))).limit(1);
  return row;
}

export async function GET(request: Request) {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const requestId = new URL(request.url).searchParams.get('requestId')?.trim(); if (!requestId) return jsonError('缺少会话编号');
  const access = await authorizedRequest(requestId, user.userId); if (!access || access.status !== 'accepted') return jsonError('会话不存在或尚未建立', 403);
  const rows = await getDb().select({ id: messages.id, body: messages.body, senderId: messages.senderId, createdAt: messages.createdAt }).from(messages).where(eq(messages.requestId, requestId)).orderBy(asc(messages.createdAt)).limit(200);
  return Response.json({ messages: rows.map((row) => ({ id: row.id, body: row.body, fromMe: row.senderId === user.userId, createdAt: row.createdAt })) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return jsonError('请先登录', 401);
  const raw = await request.json() as { requestId?: string; body?: string }; const requestId = raw.requestId?.trim(); const body = raw.body?.trim().slice(0, 500);
  if (!requestId || !body) return jsonError('消息不能为空'); const access = await authorizedRequest(requestId, user.userId); if (!access || access.status !== 'accepted') return jsonError('会话不存在或尚未建立', 403);
  const id = crypto.randomUUID(); await getDb().insert(messages).values({ id, requestId, senderId: user.userId, body, createdAt: new Date() });
  return Response.json({ id, sent: true }, { status: 201 });
}
