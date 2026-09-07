import 'server-only';

const inputClass = 'h-11 w-full rounded-xl border border-input bg-background px-3 text-base outline-none focus:border-primary';
const labelClass = 'grid gap-1.5 text-sm font-bold text-foreground/80';

export function MapAddressFields() {
  const key = process.env.AMAP_JS_KEY?.trim() ?? '';
  const configured = /^[a-f0-9]{32}$/i.test(key) && Boolean(process.env.AMAP_SECURITY_CODE?.trim());

  return <fieldset id="work-address" className="grid min-w-0 gap-4" data-map-key={configured ? key : ''}>
    <legend className="mb-3 text-base font-bold">工作地点</legend>
    <section className="min-w-0 rounded-2xl border border-border bg-muted/40 p-3" aria-label="地图选址">
      <p className="text-sm leading-6">地图由高德提供。开启后会向高德发送地图请求；搜索词和所选点位用于查询地址。只有点击定位并授权后，才会获取当前位置。</p>
      <button id="map-open" type="button" disabled={!configured} className="mt-3 h-11 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">开启地图选址</button>
      <output id="map-status" className="mt-2 block text-sm leading-6" aria-live="polite">{configured ? '可以先填城市，再打开地图搜索。地图不会自动发布或分享地址。' : '地图暂未启用，可以继续手动填写地址。'}</output>
      <noscript><p className="mt-2 text-sm">浏览器未启用脚本，暂不能使用地图；下方地址仍可手动填写并发布。</p></noscript>
      <div id="map-panel" hidden>
        <div className="mt-3 flex gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">搜索工地、道路或附近建筑</span><input id="map-query" className={inputClass} type="search" maxLength={80} placeholder="搜索工地、道路或附近建筑" /></label>
          <button id="map-search" type="button" disabled className="rounded-xl border border-border px-4 text-sm font-bold disabled:opacity-50">搜索</button>
        </div>
        <ul id="map-results" className="mt-2 max-h-52 space-y-1 overflow-y-auto" aria-label="地点搜索结果" />
        <section id="map-canvas" className="mt-3 w-full overflow-hidden rounded-xl border border-border" style={{ height: 280 }} aria-label="工地选址地图，点击设置地点" />
        <p className="mt-2 text-sm text-muted-foreground">初始显示全国范围，不代表当前位置。可缩放地图后点击选点。</p>
        <button id="map-locate" type="button" disabled className="mt-2 h-11 rounded-xl border border-border px-4 text-sm font-bold disabled:opacity-50">定位当前位置</button>
        <p id="map-selection" className="my-2 break-words text-sm leading-6">尚未选择地点</p>
        <button id="map-confirm" type="button" disabled className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">使用此地址</button>
      </div>
    </section>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className={labelClass}>城市<input id="address-city" className={inputClass} name="city" maxLength={30} required placeholder="例如：成都市" /></label>
      <label className={labelClass}>区县<input id="address-district" className={inputClass} name="district" maxLength={40} required placeholder="例如：双流区" /></label>
    </div>
    <label className={labelClass}>详细地址（选填）<input id="address-detail" className={inputClass} name="locationDetail" maxLength={80} placeholder="例如：道路、工地名称、入口；不公开展示" /></label>
    <p className="text-sm text-muted-foreground">地图地址可继续修改和补充。确认发布后才保存，详细地址不会显示在公开列表。</p>
    <script src="/map-picker.js?v=20260907" defer />
  </fieldset>;
}
