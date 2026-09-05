import { and, desc, eq, gt, like, or, type SQL } from 'drizzle-orm';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import { listings } from '@/db/schema';
import { jsonError, parseListingInput } from '@/lib/listings';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const filters: SQL[] = [eq(listings.status, 'active'), gt(listings.expiresAt, new Date())];
  const kind = params.get('kind'); const trade = params.get('trade'); const city = params.get('city'); const district = params.get('district'); const query = params.get('q')?.trim();
  if (kind === 'hiring' || kind === 'available') filters.push(eq(listings.kind, kind));
  if (trade) filters.push(eq(listings.trade, trade.slice(0, 30)));
  if (city) filters.push(eq(listings.city, city.slice(0, 30)));
  if (district) filters.push(eq(listings.district, district.slice(0, 40)));
  if (query) filters.push(or(like(listings.title, `%${query.slice(0, 30)}%`), like(listings.machineType, `%${query.slice(0, 30)}%`), like(listings.trade, `%${query.slice(0, 30)}%`))!);
  const rows = await getDb().select({ id: listings.id, kind: listings.kind, trade: listings.trade, title: listings.title, city: listings.city, district: listings.district, machineType: listings.machineType, engagement: listings.engagement, startDate: listings.startDate, durationText: listings.durationText, payText: listings.payText, accommodation: listings.accommodation, description: listings.description, status: listings.status, verification: listings.verification, expiresAt: listings.expiresAt, createdAt: listings.createdAt }).from(listings).where(and(...filters)).orderBy(desc(listings.createdAt)).limit(100);
  return Response.json({ listings: rows });
}

export async function POST(request: Request) {
  const isForm = request.headers.get('content-type')?.includes('application/x-www-form-urlencoded') ?? false;
  const publicOrigin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const user = await getChatGPTUser();
  if (!user) return isForm ? Response.redirect(new URL('/login?return_to=%2Fpublish', publicOrigin), 303) : jsonError('请先登录后再发布信息', 401);
  try {
    const raw = isForm ? Object.fromEntries(await request.formData()) : await request.json();
    const input = parseListingInput(raw); const now = new Date(); const id = crypto.randomUUID();
    const { expiryDays, ...values } = input;
    await getDb().insert(listings).values({ id, ownerId: user.userId, ...values, status: 'active', verification: 'self_reported', expiresAt: new Date(now.getTime() + expiryDays * 86400000), createdAt: now, updatedAt: now });
    return isForm ? Response.redirect(new URL('/', publicOrigin), 303) : Response.json({ id, status: 'active', verification: 'self_reported' }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '发布失败';
    return isForm ? Response.redirect(new URL(`/publish?error=${encodeURIComponent(message)}`, publicOrigin), 303) : jsonError(message);
  }
}
