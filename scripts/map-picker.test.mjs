import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const source = fs.readFileSync(new URL('../public/map-picker.js', import.meta.url), 'utf8');
// Test-only dummy values. No real credentials, geolocation or database are used.
const env = { AMAP_JS_KEY: 'a'.repeat(32), AMAP_SECURITY_CODE: 'b'.repeat(32) };

function moduleAt(relative, overrides = {}, globals = {}) {
  const file = new URL(relative, import.meta.url);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file.pathname,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  const context = vm.createContext({ exports, require: (id) => id in overrides ? overrides[id] : require(id), process: { env }, URL, Request, Response, AbortSignal, ...globals });
  vm.runInContext(compiled, context);
  return exports;
}

function browser({ configured = true, secure = true } = {}) {
  const elements = {}, timers = new Map(), reverse = [], searches = [], conversions = [];
  let id = 0, map, geoSuccess, geoError;
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.attributes = {}; this.listeners = {}; this.children = []; this.value = ''; this.disabled = false; this.textContent = ''; }
    getAttribute(name) { return this.attributes[name]; }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    appendChild(child) { this.children.push(child); child.parentNode = this; if (child.id) elements[child.id] = child; }
    removeChild(child) { this.children = this.children.filter((item) => item !== child); delete elements[child.id]; }
    focus() { this.focused = true; }
    fire(name, event = {}) { this.listeners[name]?.(event); }
  }
  for (const name of ['work-address', 'map-open', 'map-panel', 'map-status', 'map-query', 'map-search', 'map-results', 'map-locate', 'map-confirm', 'map-selection', 'address-city', 'address-district', 'address-detail']) elements[name] = new Element();
  elements['work-address'].setAttribute('data-map-key', configured ? env.AMAP_JS_KEY : '');
  elements['map-confirm'].disabled = true;
  elements['map-panel'].hidden = true;
  const document = { getElementById: (name) => elements[name], createElement: (tag) => new Element(tag), head: new Element('head'), readyState: 'complete' };
  const AMap = {
    Map: class { constructor() { this.events = {}; map = this; } on(name, callback) { this.events[name] = callback; } setZoomAndCenter() {} destroy() { this.destroyed = true; } },
    Marker: class { setPosition(pair) { this.pair = pair; } setMap() {} },
    Geocoder: class { getAddress(pair, callback) { reverse.push({ pair, callback }); } },
    PlaceSearch: class { setCity(value) { this.city = value; } search(keyword, callback) { searches.push({ keyword, city: this.city, callback }); } },
    convertFrom: (pair, type, callback) => conversions.push({ pair, type, callback }),
  };
  const window = { location: { origin: 'https://example.test' }, isSecureContext: secure, setTimeout: (callback, delay) => { timers.set(++id, { callback, delay }); return id; }, clearTimeout: (timer) => timers.delete(timer) };
  const navigator = { geolocation: { getCurrentPosition(success, failure) { geoSuccess = success; geoError = failure; } } };
  vm.runInNewContext(source, { document, window, navigator });
  return { elements, document, window, navigator, reverse, searches, conversions, timers,
    open() { elements['map-open'].fire('click'); window.AMap = AMap; elements['gongyou-amap-sdk'].onload(); map.events.complete(); },
    pick(point = { lng: 104.1, lat: 30.6 }) { map.events.click({ lnglat: point }); },
    deny() { geoError({ code: 1 }); },
    locate() { geoSuccess({ coords: { longitude: 104, latitude: 30 } }); },
    timeout(delay) { for (const [timer, entry] of timers) if (entry.delay === delay) { timers.delete(timer); entry.callback(); } },
  };
}

const address = (detail = '测试市测试区测试工地', city = '测试市', district = '测试区', province = '测试省') => ({ regeocode: { formattedAddress: detail, addressComponent: { city, district, province } } });

test('map script uses ES5 syntax and is opt-in; missing configuration preserves manual input', () => {
  require('acorn').parse(source, { ecmaVersion: 5 });
  for (const configured of [true, false]) {
    const app = browser({ configured });
    assert.equal(app.document.head.children.length, 0);
    assert.equal(app.conversions.length, 0);
    assert.equal(app.elements['map-panel'].hidden, true);
    app.elements['address-detail'].value = '手填入口';
    assert.equal(app.elements['address-detail'].value, '手填入口');
  }
});

test('server markup preserves native field names; secret never rendered, including unconfigured fallback', () => {
  for (const configured of [true, false]) {
    const { MapAddressFields } = moduleAt('../app/publish/map-address-fields.tsx', { 'server-only': {} }, { process: { env: configured ? env : {} } });
    const html = renderToStaticMarkup(MapAddressFields());
    for (const name of ['city', 'district', 'locationDetail']) assert.equal((html.match(new RegExp('name="' + name + '"', 'g')) || []).length, 1);
    assert.ok(!html.includes(env.AMAP_SECURITY_CODE));
    assert.ok(!html.includes('name="latitude"') && !html.includes('name="longitude"'));
    assert.ok(html.includes('<noscript>'));
    if (!configured) assert.match(html, /地图暂未启用/);
  }
});

test('selecting a map point changes no form values until explicit confirmation', () => {
  const app = browser(); app.open();
  assert.equal(app.window._AMapSecurityConfig.serviceHost, 'https://example.test/_AMapService');
  app.pick(); app.reverse[0].callback('complete', address());
  assert.equal(app.elements['address-detail'].value, '');
  assert.equal(app.elements['map-confirm'].disabled, false);
  app.elements['map-confirm'].fire('click');
  assert.equal(app.elements['address-city'].value, '测试市');
  assert.equal(app.elements['address-district'].value, '测试区');
  assert.equal(app.elements['address-detail'].value, '测试市测试区测试工地');
});

test('stale map responses cannot replace the most recent point', () => {
  const app = browser(); app.open(); app.pick(); app.pick();
  app.reverse[1].callback('complete', address('新地点'));
  app.reverse[0].callback('complete', address('旧地点'));
  app.elements['map-confirm'].fire('click');
  assert.equal(app.elements['address-detail'].value, '新地点');
});

test('missing city is not guessed except for the four municipalities', () => {
  const app = browser(); app.open(); app.pick();
  app.reverse[0].callback('complete', address('北京市测试地址', [], '测试区', '北京市'));
  app.elements['map-confirm'].fire('click');
  assert.equal(app.elements['address-city'].value, '北京市');
  app.pick(); app.reverse[1].callback('complete', address('测试省测试地址', [], [], '测试省'));
  app.elements['map-confirm'].fire('click');
  assert.equal(app.elements['address-city'].value, '');
  assert.equal(app.elements['address-district'].value, '');
});

test('invalid coordinates, failed reverse geocoding and oversized address keep confirmation disabled', () => {
  const app = browser(); app.open(); app.pick({ lng: NaN, lat: 31 });
  assert.equal(app.reverse.length, 0);
  app.pick(); app.reverse[0].callback('error', {});
  assert.equal(app.elements['map-confirm'].disabled, true);
  app.pick(); app.reverse[1].callback('complete', address('测'.repeat(81)));
  assert.equal(app.elements['map-confirm'].disabled, true);
  assert.equal(app.elements['address-detail'].value, '');
});

test('search Enter never submits; result text is not interpreted as HTML', () => {
  const app = browser(); app.open(); app.pick(); app.reverse[0].callback('complete', address());
  app.elements['map-query'].value = '测试工地';
  let prevented = false;
  app.elements['map-query'].fire('keydown', { key: 'Enter', preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(app.elements['map-confirm'].disabled, true);
  app.searches[0].callback('complete', { poiList: { pois: [{ name: '<img src=x onerror=alert(1)>', location: { lng: 104, lat: 30 }, address: '测试地址' }] } });
  const button = app.elements['map-results'].children[0].children[0];
  assert.match(button.textContent, /<img/);
  assert.equal(button.children.length, 0);
  button.fire('click');
  assert.equal(app.reverse.length, 2);
});

test('search timeout and empty results offer manual fallback', () => {
  const app = browser(); app.open(); app.elements['map-query'].value = '测试';
  app.elements['map-search'].fire('click'); app.timeout(12000);
  assert.equal(app.elements['map-search'].disabled, false);
  assert.match(app.elements['map-status'].textContent, /超时/);
  app.elements['map-search'].fire('click'); app.searches[1].callback('complete', { poiList: { pois: [] } });
  assert.match(app.elements['map-status'].textContent, /没有查到/);
  app.elements['map-search'].fire('click'); app.searches[2].callback('error', {});
  assert.match(app.elements['map-status'].textContent, /搜索失败/);
});

test('denied geolocation and insecure contexts do not change manual fields', () => {
  const app = browser(); app.open(); app.elements['address-detail'].value = '原地址';
  app.elements['map-locate'].fire('click'); app.deny();
  assert.match(app.elements['map-status'].textContent, /未获得定位授权/);
  assert.equal(app.elements['address-detail'].value, '原地址');
  const http = browser({ secure: false }); http.open(); http.elements['map-locate'].fire('click');
  assert.match(http.elements['map-status'].textContent, /HTTPS/);
  assert.equal(http.conversions.length, 0);
});

test('native GPS is converted before reverse geocoding; confirmation is still required', () => {
  const app = browser(); app.open(); app.elements['map-locate'].fire('click'); app.locate();
  assert.equal(app.conversions[0].type, 'gps'); assert.equal(app.reverse.length, 0);
  app.conversions[0].callback('complete', { locations: [{ lng: 104.004, lat: 29.997 }] });
  assert.equal(app.reverse[0].pair[0], 104.004);
  app.reverse[0].callback('complete', address());
  assert.equal(app.elements['address-detail'].value, '');
});

test('browser geolocation and coordinate conversion exceptions are visible without losing manual values', () => {
  const app = browser(); app.open(); app.elements['address-detail'].value = '手填地址';
  app.navigator.geolocation.getCurrentPosition = () => { throw Error('Geolocation unavailable'); };
  app.elements['map-locate'].fire('click');
  assert.match(app.elements['map-status'].textContent, /未能启动定位/);
  assert.equal(app.elements['address-detail'].value, '手填地址');
  const conversion = browser(); conversion.open();
  conversion.window.AMap.convertFrom = () => { throw Error('Conversion unavailable'); };
  conversion.elements['map-locate'].fire('click'); conversion.locate();
  assert.match(conversion.elements['map-status'].textContent, /坐标转换失败/);
  assert.equal(conversion.elements['map-confirm'].disabled, true);
});

test('SDK load failures and timeouts allow retries without late initialization', () => {
  const app = browser(); app.elements['map-open'].fire('click');
  const oldScript = app.elements['gongyou-amap-sdk'];
  app.timeout(20000);
  assert.equal(app.elements['map-open'].disabled, false);
  oldScript.onload();
  assert.equal(app.elements['map-search'].disabled, true);
  app.open();
  assert.equal(app.elements['map-search'].disabled, false);
});

function proxy({ user = { userId: 'test-user' }, fetcher = async () => Response.json({ status: '1' }), variables = env, host = 'https://example.test' } = {}) {
  const calls = [];
  const { GET } = moduleAt('../app/%255FAMapService/[...path]/route.ts', { '@/app/chatgpt-auth': { getChatGPTUser: async () => user } }, {
    process: { env: variables },
    fetch: async (...args) => { calls.push(args); return fetcher(...args); },
  });
  return { calls, request: (path = 'v3/geocode/regeo', query = '', extraHeaders = {}) => GET(new Request(host + '/_AMapService/' + path + query, { headers: extraHeaders }), { params: Promise.resolve({ path: path.split('/') }) }) };
}

test('proxy denies anonymous, cross-site, unsupported path and unsafe JSONP before upstream calls', async () => {
  const anonymous = proxy({ user: null }); assert.equal((await anonymous.request()).status, 401); assert.equal(anonymous.calls.length, 0);
  const app = proxy();
  assert.equal((await app.request('v3/ip')).status, 404);
  assert.equal((await app.request('v3/geocode/regeo', '?callback=alert(1)')).status, 400);
  assert.equal((await app.request('v3/geocode/regeo', '?callback=a&callback=b')).status, 400);
  assert.equal((await app.request('v3/geocode/regeo', '?jscode=override')).status, 400);
  assert.equal((await app.request('v3/geocode/regeo', '', { 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal((await app.request('v3/geocode/regeo', '', { origin: 'https://elsewhere.test' })).status, 403);
  assert.equal(app.calls.length, 0);
});

test('proxy forces own credentials and fixed upstream; forwards no cookies and never caches private points', async () => {
  const app = proxy(); const response = await app.request('v3/geocode/regeo', '?key=other&location=104,30&callback=AMap.Test1', { cookie: 'private-session=not-forwarded' });
  assert.equal(response.status, 200);
  const [url, options] = app.calls[0];
  assert.equal(url.origin, 'https://restapi.amap.com'); assert.equal(url.searchParams.get('key'), env.AMAP_JS_KEY);
  assert.equal(url.searchParams.get('jscode'), env.AMAP_SECURITY_CODE);
  assert.equal(options.headers, undefined); assert.equal(options.redirect, 'error');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.ok(!(await response.text()).includes(env.AMAP_SECURITY_CODE));
});

test('proxy origin validation uses the existing public site URL behind Caddy', async () => {
  const app = proxy({ variables: { ...env, NEXT_PUBLIC_SITE_URL: 'https://example.test' }, host: 'http://localhost:3000' });
  assert.equal((await app.request('v3/geocode/regeo', '', { origin: 'https://example.test' })).status, 200);
  assert.equal((await app.request('v3/geocode/regeo', '', { origin: 'https://attacker.test' })).status, 403);
});

test('proxy rejects configuration gaps, secret echoes, wrong content types, timeouts and upstream failures', async () => {
  assert.equal((await proxy({ variables: {} }).request()).status, 503);
  for (const fetcher of [async () => new Response(env.AMAP_SECURITY_CODE), async () => new Response('<html>', { headers: { 'content-type': 'text/html' } }), async () => { throw Error('private upstream URL'); }, async () => new Response('', { status: 500 })]) {
    const response = await proxy({ fetcher }).request();
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes(env.AMAP_SECURITY_CODE));
  }
});

test('proxy uses a bounded per-user request budget', async () => {
  const app = proxy();
  for (let count = 0; count < 90; count++) assert.equal((await app.request()).status, 200);
  assert.equal((await app.request()).status, 429); assert.equal(app.calls.length, 90);
});

test('native listing parser accepts both map-filled and manual addresses without coordinate schema changes', () => {
  const { parseListingInput } = moduleAt('../lib/listings.ts');
  const input = { kind: 'hiring', trade: '挖机司机', title: '测试', city: '测试市', district: '测试区', engagement: '短期', startDate: '2026-09-07', durationText: '1天', payText: '面议', accommodation: '不包吃住', description: '测试', contactName: '测试联系人', contactPhone: '000000', expiryDays: 1 };
  for (const locationDetail of ['', '手填工地入口', '测试市测试区测试工地']) {
    const parsed = parseListingInput({ ...input, locationDetail });
    assert.equal(parsed.locationDetail, locationDetail); assert.equal(parsed.city, input.city);
    assert.ok(!('latitude' in parsed) && !('longitude' in parsed));
  }
});
