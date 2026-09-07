import { getChatGPTUser } from '@/app/chatgpt-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A leading underscore makes an App Router folder private; %5F exposes /_AMapService.
// Only services used by the address picker may pass through this authenticated proxy.
const endpoints = new Map([
  ['v3/place/text', 'https://restapi.amap.com/v3/place/text'],
  ['v3/geocode/regeo', 'https://restapi.amap.com/v3/geocode/regeo'],
  ['v3/assistant/coordinate/convert', 'https://restapi.amap.com/v3/assistant/coordinate/convert'],
  ['v4/map/styles', 'https://webapi.amap.com/v4/map/styles'],
]);
const buckets = new Map<string, { count: number; reset: number }>();
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

function error(status: number, message: string) {
  return Response.json({ status: '0', info: message }, { status, headers });
}

function permit(userId: string) {
  const now = Date.now();
  for (const [id, bucket] of buckets) if (bucket.reset <= now) buckets.delete(id);
  let bucket = buckets.get(userId);
  if (!bucket) {
    // Fail closed if the bounded, single-process limiter is full.
    if (buckets.size >= 2000) return false;
    bucket = { count: 0, reset: now + 60_000 };
    buckets.set(userId, bucket);
  }
  bucket.count += 1;
  return bucket.count <= 90;
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const url = new URL(request.url);
    if (request.headers.get('sec-fetch-site') === 'cross-site') return error(403, '不允许跨站地图请求');
    const origin = request.headers.get('origin');
    // As in /api/listings, use the configured public origin behind the ECS reverse proxy.
    const publicOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL || url.origin).origin;
    if (origin && origin !== publicOrigin) return error(403, '不允许跨站地图请求');
    const user = await getChatGPTUser();
    if (!user) return error(401, '请先登录后使用地图');

    const { path } = await context.params;
    const endpoint = endpoints.get(path.join('/'));
    if (!endpoint) return error(404, '不支持的地图服务');
    if (url.search.length > 4096) return error(400, '地图参数过长');
    const callback = url.searchParams.get('callback');
    if (callback !== null && !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(callback)) return error(400, '回调参数无效');
    if (callback && callback.length > 100) return error(400, '回调参数过长');

    const key = process.env.AMAP_JS_KEY?.trim();
    const securityCode = process.env.AMAP_SECURITY_CODE?.trim();
    if (!key || !securityCode) return error(503, '地图尚未配置');
    if (url.searchParams.has('jscode')) return error(400, '不允许传入安全密钥');
    if (url.searchParams.getAll('callback').length > 1) return error(400, '回调参数重复');
    if (!permit(user.userId)) return error(429, '地图请求较多，请稍后重试');

    const upstream = new URL(endpoint);
    upstream.search = url.search;
    upstream.searchParams.set('key', key);
    upstream.searchParams.set('jscode', securityCode);
    // Never forward the session cookie, authorization headers, or upstream redirects.
    const response = await fetch(upstream, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!response.ok) return error(502, '地图服务暂不可用');
    const contentType = response.headers.get('content-type') || 'application/json';
    if (!/^(application\/(json|javascript)|text\/(javascript|plain))(;|$)/i.test(contentType)) return error(502, '地图响应格式异常');
    if (Number(response.headers.get('content-length')) > 1024 * 1024) return error(502, '地图响应过大');
    const body = await response.text();
    if (body.length > 1024 * 1024) return error(502, '地图响应过大');
    if (body.toLowerCase().includes(securityCode.toLowerCase())) return error(502, '地图响应异常');
    return new Response(body, { headers: { ...headers, 'Content-Type': contentType } });
  } catch {
    // Do not log or return upstream URLs: they contain the security code and selected point.
    return error(502, '地图请求失败，请重试或手动填写地址');
  }
}
