import { eq } from 'drizzle-orm';
import { clearUserSession, hashPassword, setUserSession, verifyPassword } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { users } from '@/db/schema';
import { jsonError } from '@/lib/listings';

const phonePattern = /^1[3-9]\d{9}$/;

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (action === 'logout') { await clearUserSession(); return Response.json({ ok: true }); }
  const body = await request.json() as { phone?: string; password?: string; displayName?: string };
  const phone = String(body.phone ?? '').trim(); const password = String(body.password ?? '');
  if (!phonePattern.test(phone)) return jsonError('请输入正确的11位手机号');
  if (password.length < 8 || password.length > 72) return jsonError('密码需为8至72位');
  if (action === 'register') {
    const displayName = String(body.displayName ?? '').trim().slice(0, 30);
    if (displayName.length < 2) return jsonError('称呼至少需要2个字符');
    const [existing] = await getDb().select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1);
    if (existing) return jsonError('该手机号已经注册', 409);
    const id = crypto.randomUUID(); const now = new Date();
    await getDb().insert(users).values({ id, phone, displayName, passwordHash: await hashPassword(password), status: 'active', createdAt: now, updatedAt: now });
    await setUserSession(id); return Response.json({ ok: true }, { status: 201 });
  }
  if (action === 'login') {
    const [user] = await getDb().select().from(users).where(eq(users.phone, phone)).limit(1);
    if (!user || user.status !== 'active' || !(await verifyPassword(password, user.passwordHash))) return jsonError('手机号或密码不正确', 401);
    await setUserSession(user.id); return Response.json({ ok: true });
  }
  return jsonError('不支持的操作', 404);
}

export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params; if (action !== 'logout') return jsonError('不支持的操作', 404);
  await clearUserSession(); const target = new URL(request.url).searchParams.get('return_to') ?? '/';
  return Response.redirect(new URL(target.startsWith('/') && !target.startsWith('//') ? target : '/', request.url));
}
