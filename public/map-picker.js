/* eslint-disable no-var -- Served directly without transpilation; retain ES5 parsing for manual-form fallback browsers. */
(function () {
  'use strict';

  // Keep the optional map independent of React hydration and the native publish form.
  function start() {
    var root = document.getElementById('work-address');
    if (!root || root.getAttribute('data-map-ready')) return;
    root.setAttribute('data-map-ready', 'true');
    var key = root.getAttribute('data-map-key');
    if (!key) return;
    var open = document.getElementById('map-open');
    var panel = document.getElementById('map-panel');
    var status = document.getElementById('map-status');
    var query = document.getElementById('map-query');
    var searchButton = document.getElementById('map-search');
    var results = document.getElementById('map-results');
    var locate = document.getElementById('map-locate');
    var confirm = document.getElementById('map-confirm');
    var description = document.getElementById('map-selection');
    var city = document.getElementById('address-city');
    var district = document.getElementById('address-district');
    var detail = document.getElementById('address-detail');
    var map, marker, geocoder, placeSearch, selected;
    var operation = 0;
    var searchOperation = 0;
    var loadOperation = 0;
    var operationTimer, searchTimer, loadTimer;
    var loaded = false;

    function message(text) { status.textContent = text; }
    function text(value) { return typeof value === 'string' ? value.trim() : ''; }
    function coordinates(point) {
      if (!point) return null;
      var lng = typeof point.getLng === 'function' ? point.getLng() : point.lng;
      var lat = typeof point.getLat === 'function' ? point.getLat() : point.lat;
      if (typeof lng !== 'number' || typeof lat !== 'number' || !isFinite(lng) || !isFinite(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
      return [lng, lat];
    }
    function beginOperation(label) {
      operation += 1;
      var current = operation;
      window.clearTimeout(operationTimer);
      selected = null;
      confirm.disabled = true;
      description.textContent = '尚未确认地址';
      message(label);
      operationTimer = window.setTimeout(function () {
        if (current !== operation) return;
        operation += 1;
        message('查询超时，请重试或手动填写地址。');
      }, 15000);
      return current;
    }
    function failOperation(current, label) {
      if (current !== operation) return;
      window.clearTimeout(operationTimer);
      operation += 1;
      message(label);
    }
    function resolvePoint(point, current) {
      var pair = coordinates(point);
      if (!pair) { failOperation(current, '地点坐标无效，请重新选点。'); return; }
      marker.setPosition(pair);
      marker.setMap(map);
      map.setZoomAndCenter(16, pair);
      geocoder.getAddress(pair, function (state, response) {
        if (current !== operation) return;
        if (state !== 'complete' || !response || !response.regeocode) {
          failOperation(current, '未能查询该点的地址，请换一个地点或手动填写。'); return;
        }
        var address = response.regeocode;
        var parts = address.addressComponent || {};
        var cityName = text(parts.city);
        var province = text(parts.province);
        if (!cityName && /^(北京市|上海市|天津市|重庆市)$/.test(province)) cityName = province;
        var districtName = text(parts.district);
        var addressText = text(address.formattedAddress);
        if (!addressText || addressText.length > 80 || cityName.length > 30 || districtName.length > 40) {
          failOperation(current, '地图地址缺失或过长，请按下方输入框的长度要求手动填写。'); return;
        }
        window.clearTimeout(operationTimer);
        selected = { city: cityName, district: districtName, detail: addressText };
        description.textContent = addressText;
        confirm.disabled = false;
        message(cityName && districtName ? '请核对所选地点，再点击“使用此地址”。' : '已找到地址，城市或区县信息不完整，使用后请手动补齐。');
      });
    }
    function pick(point) {
      var current = beginOperation('正在查询所选地点…');
      try { resolvePoint(point, current); }
      catch (error) { void error; failOperation(current, '地图查询失败，请重试或手动填写地址。'); }
    }
    function initialize(currentLoad) {
      if (currentLoad !== loadOperation) return;
      try {
        var AMap = window.AMap;
        if (!AMap || !AMap.Geocoder || !AMap.PlaceSearch) throw new Error('Map not loaded');
        map = new AMap.Map('map-canvas', { viewMode: '2D', zoom: 4, center: [104, 35] });
        marker = new AMap.Marker();
        geocoder = new AMap.Geocoder({ extensions: 'base' });
        placeSearch = new AMap.PlaceSearch({ pageSize: 6, extensions: 'base', citylimit: false });
        map.on('click', function (event) { pick(event.lnglat); });
        map.on('complete', function () {
          if (currentLoad !== loadOperation) return;
          window.clearTimeout(loadTimer);
          loaded = true;
          searchButton.disabled = false;
          locate.disabled = false;
          open.textContent = '地图已开启';
          message('搜索地点或点击地图选点；也可以点击“定位当前位置”。');
        });
      } catch (error) { void error; loadFailed(currentLoad); }
    }
    function loadFailed(currentLoad) {
      if (currentLoad !== loadOperation) return;
      loadOperation += 1;
      window.clearTimeout(loadTimer);
      if (map && typeof map.destroy === 'function') map.destroy();
      map = null;
      open.disabled = false;
      open.textContent = '重新加载地图';
      loaded = false;
      searchButton.disabled = true;
      locate.disabled = true;
      message('地图加载失败，请重试；若持续失败，可以直接手动填写地址。');
    }
    open.addEventListener('click', function () {
      if (loaded) return;
      open.disabled = true;
      loadOperation += 1;
      var currentLoad = loadOperation;
      panel.hidden = false;
      message('正在加载高德地图…');
      loadTimer = window.setTimeout(function () { loadFailed(currentLoad); }, 20000);
      window._AMapSecurityConfig = { serviceHost: window.location.origin + '/_AMapService' };
      if (window.AMap) { initialize(currentLoad); return; }
      var previous = document.getElementById('gongyou-amap-sdk');
      if (previous && previous.parentNode) previous.parentNode.removeChild(previous);
      var script = document.createElement('script');
      script.id = 'gongyou-amap-sdk';
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=' + encodeURIComponent(key) + '&plugin=AMap.Geocoder,AMap.PlaceSearch';
      script.onload = function () { initialize(currentLoad); };
      script.onerror = function () { loadFailed(currentLoad); };
      document.head.appendChild(script);
    });
    function search() {
      if (!loaded) return;
      var keyword = query.value.trim();
      if (!keyword) { message('请输入工地、道路或附近建筑名称。'); return; }
      operation += 1;
      window.clearTimeout(operationTimer);
      selected = null;
      confirm.disabled = true;
      description.textContent = '尚未选择地点';
      searchOperation += 1;
      var current = searchOperation;
      window.clearTimeout(searchTimer);
      results.textContent = '';
      searchButton.disabled = true;
      message('正在搜索地点…');
      searchTimer = window.setTimeout(function () {
        if (current !== searchOperation) return;
        searchOperation += 1;
        searchButton.disabled = false;
        message('搜索超时，请重试或手动填写地址。');
      }, 12000);
      try {
        placeSearch.setCity(city.value.trim() || '全国');
        placeSearch.search(keyword, function (state, response) {
          if (current !== searchOperation) return;
          window.clearTimeout(searchTimer);
          searchButton.disabled = false;
          var pois = response && response.poiList && response.poiList.pois;
          if (state !== 'complete' && state !== 'no_data') { message('地点搜索失败，请重试或手动填写；持续失败时请检查登录和地图配置。'); return; }
          if (!pois || !pois.length) { message('没有查到地点，请加上城市或换个关键词。'); return; }
          var count = 0;
          pois.slice(0, 6).forEach(function (poi) {
            if (!coordinates(poi.location)) return;
            var item = document.createElement('li');
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'w-full rounded-lg border border-border bg-background p-3 text-left text-sm';
            button.textContent = text(poi.name) + ' · ' + [text(poi.pname), text(poi.cityname), text(poi.adname), text(poi.address)].filter(Boolean).join('');
            button.addEventListener('click', function () { pick(poi.location); });
            item.appendChild(button);
            results.appendChild(item);
            count += 1;
          });
          message(count ? '请选择搜索结果，再核对地图上的位置。' : '搜索结果没有可用坐标，请换个关键词。');
        });
      } catch (error) {
        void error;
        window.clearTimeout(searchTimer);
        searchButton.disabled = false;
        message('搜索失败，请重试或手动填写地址。');
      }
    }
    searchButton.addEventListener('click', search);
    query.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); search(); }
    });
    locate.addEventListener('click', function () {
      if (!loaded) return;
      if (!window.isSecureContext) { message('当前位置需要安全连接，请使用 HTTPS 地址打开本站。'); return; }
      if (!navigator.geolocation) { message('浏览器不支持定位，请搜索地点或手动选点。'); return; }
      var current = beginOperation('请允许浏览器获取当前位置，正在定位…');
      try { navigator.geolocation.getCurrentPosition(function (position) {
        if (current !== operation) return;
        // Native GPS is WGS-84; AMap expects GCJ-02. Never plot unconverted GPS.
        try { window.AMap.convertFrom([position.coords.longitude, position.coords.latitude], 'gps', function (state, response) {
          if (current !== operation) return;
          if (state !== 'complete' || !response || !response.locations || !response.locations[0]) {
            failOperation(current, '定位坐标转换失败，请搜索地点或手动选点。'); return;
          }
          try { resolvePoint(response.locations[0], current); }
          catch (error) { void error; failOperation(current, '定位地址查询失败，请手动选点。'); }
        }); } catch (error) { void error; failOperation(current, '定位坐标转换失败，请搜索地点或手动选点。'); }
      }, function (error) {
        failOperation(current, error.code === 1 ? '未获得定位授权，可以搜索地点或手动填写地址。' : '暂时无法获取当前位置，请重试或搜索地点。');
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }); }
      catch (error) { void error; failOperation(current, '浏览器未能启动定位，请搜索地点或手动填写地址。'); }
    });
    confirm.addEventListener('click', function () {
      if (!selected) return;
      city.value = selected.city;
      district.value = selected.district;
      detail.value = selected.detail;
      message('地址已填入下方。请核对并补充工地入口等信息，确认发布后才会保存。');
      detail.focus();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}());
