// ==UserScript==
// @name         PokeCatch 辅助面板（Edge / 安卓 Firefox）
// @namespace    local.pokecatch.custom
// @version      0.6.2
// @description  只读游戏版本兼容监测与官方树果效果说明；不拦截或修改游戏代码和结算
// @match        https://pokecatch-online.app/*
// @match        https://www.pokecatch-online.app/*
// @match        https://pokecatch-online.netlify.app/*
// @match        https://pokecatch-online.pages.dev/*
// @run-at       document-start
// @noframes
// @grant        none
// @homepageURL  https://github.com/taozhongsha10086-dev/pokecatch114
// @supportURL   https://github.com/taozhongsha10086-dev/pokecatch114/issues
// @updateURL    https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.meta.js
// @downloadURL  https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.user.js
// ==/UserScript==
(() => {
  'use strict';

  const SCRIPT_VERSION = '0.6.2';
  const HOST_ID = 'pc-helper-readonly-host';
  const KNOWN_GAME_ASSETS = {
    // Inspected bundle: its newest changelog entry is game version v0.5.161.
    d8622a1fb3: { version: '0.5.161', checked: '2026-11-24' }
  };
  const BERRIES = [
    ['Razz Berry', '捕捉率 ×1.25', '提高捕捉概率'],
    ['Golden Razz Berry', '捕捉率 ×1.5', '提高捕捉概率'],
    ['Nanab Berry', '稀有种类出现率 ×2', '提高稀有宝可梦出现权重'],
    ['Enigma Berry', '未捕捉种类出现率 ×3', '按当前游玩地区的捕捉记录判断'],
    ['Pinap Berry', '战斗经验 ×1.25', '提高战斗获得的经验'],
    ['Lansat Berry', 'Pokédollars ×1.25', '提高获得的游戏货币'],
    ['Starf Berry', '野外闪光率 ×2', '野外闪光加成，不代表孵蛋闪光率']
  ];

  let host = null;
  let shadow = null;
  let currentAssetName = '';
  let perfObserver = null;

  const CSS = [
    ':host{all:initial;color-scheme:dark;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
    '#pc-toggle{all:initial;position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483647;pointer-events:auto;cursor:pointer;background:#263b60;color:#fff;border:1px solid #91baff;border-radius:22px;padding:11px 15px;font:700 13px/1.2 system-ui;box-shadow:0 4px 18px #0009}',
    '#pc-panel{position:fixed;right:12px;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 54px);z-index:2147483647;pointer-events:auto;width:min(410px,calc(100vw - 24px));max-height:min(82vh,760px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#19202d;color:#f5f7ff;border:1px solid #55627c;border-radius:13px;padding:13px;font:13px/1.5 system-ui;box-shadow:0 5px 24px #000b}',
    '#pc-panel[hidden]{display:none!important}#pc-panel *{box-sizing:border-box}',
    '.pc-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.pc-top strong{font-size:15px}',
    '.pc-btn{cursor:pointer;border:1px solid #647794;border-radius:7px;background:#344968;color:#fff;padding:7px 10px;font:inherit}',
    '.pc-muted,.pc-note{color:#aebbd0;font-size:11px}.pc-section{margin-top:12px;padding-top:10px;border-top:1px solid #ffffff22;font-weight:700;color:#dce8ff}',
    '.pc-status{margin-top:9px;padding:10px;border:1px solid #53627b;border-radius:9px;background:#121a27}.pc-status strong{display:block;color:#b9dcff;margin-bottom:3px}.pc-status p{margin:3px 0;overflow-wrap:anywhere}',
    '.pc-berry{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px 0;border-bottom:1px solid #ffffff14}.pc-berry:last-child{border-bottom:0}.pc-berry-name{font-weight:600}.pc-berry-effect{color:#a8d4ff;font-weight:700;text-align:right;white-space:nowrap}.pc-berry-note{grid-column:1/-1;color:#aebbd0;font-size:11px;margin-top:-5px}',
    '.pc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}.pc-actions button{flex:1 1 120px}.pc-note{margin:10px 0 0}',
    '@media(max-width:600px){#pc-toggle{right:10px}#pc-panel{right:8px;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px);width:calc(100vw - 16px);max-height:72dvh;padding:12px;font-size:14px}.pc-berry{padding:9px 0}}'
  ].join('');

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function ensureHost() {
    if (!document.documentElement) return false;
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = 'all:initial!important;position:fixed!important;inset:0 auto auto 0!important;width:100%!important;height:0!important;z-index:2147483647!important;pointer-events:none!important';
      shadow = host.attachShadow({ mode: 'open' });
      const style = element('style', '', CSS);
      const toggle = element('button', '', '⚙ PokeCatch');
      toggle.id = 'pc-toggle';
      toggle.type = 'button';
      const panel = element('section');
      panel.id = 'pc-panel';
      panel.hidden = true;
      panel.innerHTML = '<div class="pc-top"><strong>PokeCatch 辅助面板 v' + SCRIPT_VERSION + '</strong><button class="pc-btn" id="pc-close" type="button">收起</button></div>' +
        '<p class="pc-muted">只读兼容监测 · 不拦截、不修改游戏 JS、存档或服务器结算</p>' +
        '<div class="pc-status"><strong id="pc-status-title">正在检测游戏资源…</strong><p id="pc-game-version">游戏版本：检测中</p><p id="pc-game-asset">游戏资源：检测中</p><p id="pc-check-date">检查记录：—</p></div>' +
        '<div class="pc-section">官方树果效果（当前游戏更新日志）</div><div id="pc-berry-list"></div>' +
        '<p class="pc-note">树果加成持续 1 小时，按现实时间计时（离线也会继续）。同类加成同一时间只生效一种；再次使用同一种会重置时长。更弱的树果替换当前加成时，游戏会要求确认。</p>' +
        '<div class="pc-actions"><button class="pc-btn" id="pc-refresh" type="button">重新检测游戏版本</button><button class="pc-btn" id="pc-copy" type="button">复制游戏资源名</button></div>' +
        '<p class="pc-note">自动更新由 Tampermonkey 管理。若检测到未知游戏资源，本面板只会标记为待检查，不会尝试套用旧版规则。</p>';
      const berryList = panel.querySelector('#pc-berry-list');
      BERRIES.forEach((berry) => {
        const row = element('div', 'pc-berry');
        row.append(element('div', 'pc-berry-name', berry[0]));
        row.append(element('div', 'pc-berry-effect', berry[1]));
        row.append(element('div', 'pc-berry-note', berry[2]));
        berryList.append(row);
      });
      toggle.addEventListener('click', () => { panel.hidden = !panel.hidden; });
      panel.querySelector('#pc-close').addEventListener('click', () => { panel.hidden = true; });
      panel.querySelector('#pc-refresh').addEventListener('click', scanGameAsset);
      panel.querySelector('#pc-copy').addEventListener('click', copyAssetName);
      shadow.append(style, toggle, panel);
    }
    if (!host.isConnected || host.parentNode !== document.documentElement) document.documentElement.appendChild(host);
    return true;
  }

  function getGameAsset() {
    const candidates = [];
    try {
      performance.getEntriesByType('resource').forEach((entry) => {
        const url = new URL(entry.name, location.href);
        const match = url.pathname.match(/(?:^|\/)app(?:\.([a-z0-9_-]+))?\.js$/i);
        if (match) candidates.push({ name: url.pathname.split('/').pop(), hash: match[1] || '', time: entry.startTime || 0 });
      });
    } catch (_) {}
    try {
      document.querySelectorAll('script[src]').forEach((script) => {
        const url = new URL(script.src, location.href);
        const match = url.pathname.match(/(?:^|\/)app(?:\.([a-z0-9_-]+))?\.js$/i);
        if (match) candidates.push({ name: url.pathname.split('/').pop(), hash: match[1] || '', time: Number.MAX_SAFE_INTEGER });
      });
    } catch (_) {}
    candidates.sort((a, b) => b.time - a.time);
    return candidates[0] || null;
  }

  function scanGameAsset() {
    if (!ensureHost()) return;
    const asset = getGameAsset();
    const title = shadow.getElementById('pc-status-title');
    const version = shadow.getElementById('pc-game-version');
    const name = shadow.getElementById('pc-game-asset');
    const date = shadow.getElementById('pc-check-date');
    const copy = shadow.getElementById('pc-copy');
    if (!asset) {
      title.textContent = '暂未检测到游戏主脚本';
      version.textContent = '游戏版本：未知';
      name.textContent = '游戏资源：尚未发现 app.*.js';
      date.textContent = '检查记录：页面加载后可重新检测';
      copy.disabled = true;
      currentAssetName = '';
      return;
    }
    const known = KNOWN_GAME_ASSETS[asset.hash];
    title.textContent = known ? '已识别已检查的游戏资源' : '发现未登记的游戏资源';
    version.textContent = known ? '游戏版本：v' + known.version : '游戏版本：暂未确认（不要按旧版本适配）';
    name.textContent = '游戏资源：' + asset.name;
    date.textContent = known ? '检查记录：' + known.checked + ' · 仅确认资源身份，不代表游戏逻辑补丁' : '检查记录：待检查；本脚本保持只读';
    copy.disabled = false;
    currentAssetName = asset.name;
  }

  function copyAssetName() {
    if (!currentAssetName) return;
    const button = shadow.getElementById('pc-copy');
    const done = (message) => {
      button.textContent = message;
      window.setTimeout(() => { if (button.isConnected) button.textContent = '复制游戏资源名'; }, 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentAssetName).then(() => done('已复制')).catch(() => fallbackCopy(done));
    } else fallbackCopy(done);
  }

  function fallbackCopy(done) {
    const input = document.createElement('textarea');
    input.value = currentAssetName;
    input.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.documentElement.appendChild(input);
    input.select();
    try { document.execCommand('copy'); done('已尝试复制'); }
    catch (_) { done('复制失败'); }
    input.remove();
  }

  function start() {
    try {
      ensureHost();
      scanGameAsset();
      if (typeof PerformanceObserver === 'function' && !perfObserver) {
        perfObserver = new PerformanceObserver(() => { try { scanGameAsset(); } catch (_) {} });
        perfObserver.observe({ type: 'resource', buffered: true });
      }
    } catch (error) {
      console.error('[PokeCatch Helper v0.6.2] 初始化失败：', error);
    }
  }

  start();
  document.addEventListener('readystatechange', start);
  window.addEventListener('load', scanGameAsset, { once: true });
  window.setInterval(() => { try { ensureHost(); } catch (_) {} }, 2000);
})();