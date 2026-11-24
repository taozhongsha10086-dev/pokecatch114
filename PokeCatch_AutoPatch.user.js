// ==UserScript==
// @name         PokeCatch 自动补丁（Edge / 安卓 Firefox）
// @namespace    local.pokecatch.custom
// @version      0.6.1
// @description  PokeCatch 自动补丁；Edge / 安卓 Firefox；由 GitHub 固定地址自动升级
// @match        https://pokecatch-online.app/*
// @match        https://www.pokecatch-online.app/*
// @match        https://pokecatch-online.netlify.app/*
// @match        https://pokecatch-online.pages.dev/*
// @run-at       document-start
// @noframes
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      pokecatch-online.pages.dev
// @connect      pokecatch-online.netlify.app
// @connect      pokecatch-online.app
// @connect      www.pokecatch-online.app
// @homepageURL  https://github.com/taozhongsha10086-dev/pokecatch114
// @supportURL   https://github.com/taozhongsha10086-dev/pokecatch114/issues
// @updateURL    https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.meta.js
// @downloadURL  https://raw.githubusercontent.com/taozhongsha10086-dev/pokecatch114/main/PokeCatch_AutoPatch.user.js
// ==/UserScript==
(function () {
  'use strict';

  // v0.5.2: The game moved to pokecatch-online.app (2026-11-23).
  // Emergency UI: first, before any patching or game hooks. A ShadowRoot avoids
  // game CSS and body.innerHTML re-renders destroying the floating button.
  const UI_HOST_ID = 'pc-autopatch-isolated-host';
  let uiHost = null;
  let uiRoot = null;
  let uiFailure = '';
  function ensureHost() {
    if (!document.documentElement) return false;
    if (!uiHost) {
      uiHost = document.createElement('div');
      uiHost.id = UI_HOST_ID;
      uiHost.style.cssText = 'all:initial!important;position:fixed!important;left:0!important;top:0!important;width:100%!important;height:0!important;z-index:2147483647!important;pointer-events:none!important';
      uiRoot = uiHost.attachShadow({ mode: 'open' });
      const firstStyle = document.createElement('style');
      firstStyle.textContent = '#pc-toggle{position:fixed;right:12px;bottom:12px;z-index:2147483647;pointer-events:auto;background:#244e7a;color:white;border:1px solid #89a8ce;border-radius:20px;padding:12px 16px;font:700 14px system-ui;box-shadow:0 3px 18px #0009}#pc-rescue{position:fixed;right:12px;bottom:64px;z-index:2147483647;pointer-events:auto;max-width:min(360px,calc(100vw - 24px));box-sizing:border-box;background:#152137;color:#fff;border:1px solid #7b8fb2;border-radius:12px;padding:14px;font:13px/1.5 system-ui;box-shadow:0 4px 20px #000c}#pc-rescue[hidden]{display:none!important}#pc-rescue button{background:#426691;color:#fff;border:0;border-radius:6px;padding:8px;margin-top:8px}';
      uiRoot.appendChild(firstStyle);
      const button = document.createElement('button');
      button.id = 'pc-toggle'; button.type = 'button'; button.textContent = '⚙ PokeCatch';
      const rescue = document.createElement('div');
      rescue.id = 'pc-rescue'; rescue.hidden = true;
      rescue.innerHTML = '<strong>PokeCatch 补丁正在启动</strong><div id="pc-rescue-error">如果完整设置面板未出现，可尝试原版模式恢复。</div><button type="button" id="pc-rescue-original">原版模式并刷新</button>';
      button.onclick = () => { const panel = uiRoot.getElementById('pc-panel'); if (panel) panel.hidden = !panel.hidden; else rescue.hidden = !rescue.hidden; };
      rescue.querySelector('#pc-rescue-original').onclick = () => { try { localStorage.setItem('pc-auto-patch-disable-once','1'); } catch (_) {} location.reload(); };
      uiRoot.append(button, rescue);
    }
    if (!uiHost.isConnected || uiHost.parentNode !== document.documentElement) document.documentElement.appendChild(uiHost);
    return true;
  }
  function showRescue(msg) {
    uiFailure = String(msg || '脚本运行异常');
    if (!ensureHost()) return;
    const rescue = uiRoot.getElementById('pc-rescue');
    const label = uiRoot.getElementById('pc-rescue-error');
    if (label) label.textContent = '界面加载失败：' + uiFailure;
    if (rescue) rescue.hidden = false;
  }
  try { ensureHost(); } catch (_) {}
  if (!uiRoot) document.addEventListener('readystatechange', () => { try { ensureHost(); } catch (_) {} });
  // Deliberately small watchdog: mounting once into <html> means game replacing
  // <body> no longer removes the panel. Re-mount after a full DOM recreation.
  setInterval(() => { try { ensureHost(); } catch (_) {} }, 1500);

  const KEY = 'pc-auto-patch-v4';
  const LEGACY_KEYS = ['pc-auto-patch-v3', 'pc-auto-patch-v2', 'pc-auto-patch-v1'];
  const DISABLE_KEY = 'pc-auto-patch-disable-once';
  const SAFE_PARAM = 'pc_safe';
  const defaults = {
    normalCapture: false, normalRate: 60,
    legendCapture: false, legendRate: 10,
    xp: false, xpRate: 64,
    money: false, moneyRate: 64,
    wildShiny: false, wildRate: 10,
    eggShiny: false,
    uncaught: false, uncaughtRate: 2,
    wildEncounters: false, wildEncounterRate: 2,
    rareItems: false, rareItemRate: 10,
    geode: false, geodeRate: 20,
    shards: false, shardRate: 20,
    undergroundSpeed: false, speedRate: 10
  };

  function readSettings() {
    let value = { ...defaults };
    try {
      for (const key of [...LEGACY_KEYS].reverse()) {
        const old = JSON.parse(localStorage.getItem(key) || 'null');
        if (old && typeof old === 'object') value = { ...value, ...old };
      }
      const current = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (current && typeof current === 'object') value = { ...value, ...current };
    } catch (_) {}

    if (typeof value.normalCapture !== 'boolean') value.normalCapture = value.normalCapture === '60';
    if (typeof value.legendCapture !== 'boolean') value.legendCapture = value.legendCapture === '10';
    if (typeof value.wildShiny !== 'boolean') value.wildShiny = value.wildShiny !== 'off';
    if (typeof value.eggShiny !== 'boolean') value.eggShiny = !!value.eggShiny;
    if (typeof value.geode !== 'boolean') value.geode = Number(value.geode) > 1;
    if (typeof value.undergroundSpeed !== 'boolean') value.undergroundSpeed = !!value.undergroundSpeed;

    const numeric = {
      normalRate: [0, 100], legendRate: [0, 100],
      xpRate: [1, 100000], moneyRate: [1, 100000],
      wildRate: [0, 100], uncaughtRate: [1, 100],
      wildEncounterRate: [1, 10], rareItemRate: [1, 1000],
      geodeRate: [1, 100000], shardRate: [1, 100000], speedRate: [1, 100]
    };
    for (const [key, [min, max]] of Object.entries(numeric)) {
      const n = Number(value[key]);
      value[key] = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : defaults[key];
    }
    for (const key of ['normalCapture', 'legendCapture', 'xp', 'money', 'wildShiny', 'eggShiny', 'uncaught', 'wildEncounters', 'rareItems', 'geode', 'shards', 'undergroundSpeed']) value[key] = !!value[key];
    return value;
  }

  let settings = readSettings();
  let originalMode = false;
  try { originalMode = localStorage.getItem(DISABLE_KEY) === '1' || new URLSearchParams(location.search).get(SAFE_PARAM) === '1'; } catch (_) {}

  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isFirefox = /Firefox\//i.test(ua);
  const isEdge = /Edg\//i.test(ua);
  const platform = isAndroid && isFirefox ? '安卓 Firefox' : isEdge ? '电脑 Edge' : isAndroid ? '安卓浏览器' : '桌面浏览器';
  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  let state = originalMode ? '原版模式：本次不拦截游戏 JS' : '等待游戏主脚本';
  let details = '';
  let sawCandidate = false;
  const handledUrls = new Set();
  const failedUrls = new Set();
  const pendingUrls = new Set();
  const nodeMeta = new WeakMap();

  const rareIds = [
    'rare-candy', 'soul',
    'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone',
    'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'ice-stone',
    'kings-rock', 'metal-coat', 'dragon-scale', 'prism-scale', 'deep-sea-tooth', 'deep-sea-scale',
    'oval-stone', 'protector', 'electirizer', 'magmarizer', 'reaper-cloth', 'razor-claw', 'razor-fang',
    'berry-sitrus', 'golden-razz-berry', 'nanab-berry', 'enigma-berry', 'lansat-berry',
    'starf-berry', 'rowap-berry', 'belue-berry'
  ];

  const rules = [
  {
    "name": "最终捕捉判定（普通 / 神兽 / 游走神兽 / 团战）",
    "variants": [
      {
        "from": "const La=fe?.prob??Fn(Ye),Ka=Math.pow(La,.25);",
        "to": "const __pcDex=p.DEX[f.id],__pcSpecial=!!w||!!__pcDex?.legendary||!!__pcDex?.mythical,__pcFinal=fe?.ball===\"master-ball\"||fe?.prob===1?1:__pcSpecial&&globalThis.__PC_CFG__.legendCapture?globalThis.__PC_CFG__.legendRate/100:!__pcSpecial&&globalThis.__PC_CFG__.normalCapture?globalThis.__PC_CFG__.normalRate/100:(fe?.prob??Fn(Ye)),La=Math.max(0,Math.min(1,__pcFinal)),Ka=Math.pow(La,.25);"
      },
      {
        "from": "const Va=ue?.prob??to(Ge),nt=Math.pow(Va,.25);",
        "to": "const __pcDex=p.DEX[f.id],__pcSpecial=!!b||!!__pcDex?.legendary||!!__pcDex?.mythical,__pcFinal=ue?.ball===\"master-ball\"||ue?.prob===1?1:__pcSpecial&&globalThis.__PC_CFG__.legendCapture?globalThis.__PC_CFG__.legendRate/100:!__pcSpecial&&globalThis.__PC_CFG__.normalCapture?globalThis.__PC_CFG__.normalRate/100:(ue?.prob??to(Ge)),Va=Math.max(0,Math.min(1,__pcFinal)),nt=Math.pow(Va,.25);"
      },
      {
        "from": "const Ha=ae?.prob??fn(Xe),at=Math.pow(Ha,.25);",
        "to": "const __pcLegend=!!(f.DEX[h.id]?.legendary||f.DEX[h.id]?.mythical),__pcFinal=ae?.ball===\"master-ball\"||ae?.prob===1?1:__pcLegend&&globalThis.__PC_CFG__.legendCapture?globalThis.__PC_CFG__.legendRate/100:!__pcLegend&&globalThis.__PC_CFG__.normalCapture&&ae?.prob==null?globalThis.__PC_CFG__.normalRate/100:(ae?.prob??fn(Xe)),Ha=Math.max(0,Math.min(1,__pcFinal)),at=Math.pow(Ha,.25);"
      }
    ],
    "flag": "capture"
  },
  {
    "name": "经验倍率",
    "variants": [
      {
        "from": "const Wt=Ka*(Et?t.XP_ACTIVE_BONUS:1)*(qt.uid===p.S.buddy?.uid?t.BUDDY_XP_MULT:1)*(Q?t.OFFLINE_XP_MULT:1)*p.buffMult(\"xp\"),Rs=p.gainXp(qt,Wt);",
        "to": "const Wt=(globalThis.__PC_CFG__.xp?globalThis.__PC_CFG__.xpRate:1)*Ka*(Et?t.XP_ACTIVE_BONUS:1)*(qt.uid===p.S.buddy?.uid?t.BUDDY_XP_MULT:1)*(Q?t.OFFLINE_XP_MULT:1)*p.buffMult(\"xp\"),Rs=p.gainXp(qt,Wt);"
      },
      {
        "from": "const Jt=nt*(Rt?t.XP_ACTIVE_BONUS:1)*(yt.uid===p.S.buddy?.uid?t.BUDDY_XP_MULT:1)*(ne?t.OFFLINE_XP_MULT:1)*p.buffMult(\"xp\"),as=p.gainXp(yt,Jt);",
        "to": "const Jt=(globalThis.__PC_CFG__.xp?globalThis.__PC_CFG__.xpRate:1)*nt*(Rt?t.XP_ACTIVE_BONUS:1)*(yt.uid===p.S.buddy?.uid?t.BUDDY_XP_MULT:1)*(ne?t.OFFLINE_XP_MULT:1)*p.buffMult(\"xp\"),as=p.gainXp(yt,Jt);"
      },
      {
        "from": "const Yt=at*(it?t.XP_ACTIVE_BONUS:1)*(xt.uid===f.S.buddy?.uid?t.BUDDY_XP_MULT:1)*(re?t.OFFLINE_XP_MULT:1)*f.buffMult(\"xp\")",
        "to": "const Yt=(globalThis.__PC_CFG__.xp?globalThis.__PC_CFG__.xpRate:1)*at*(it?t.XP_ACTIVE_BONUS:1)*(xt.uid===f.S.buddy?.uid?t.BUDDY_XP_MULT:1)*(re?t.OFFLINE_XP_MULT:1)*f.buffMult(\"xp\")"
      }
    ],
    "flag": "xp"
  },
  {
    "name": "金钱正收益倍率",
    "variants": [
      {
        "from": "function R(v){return v=Math.round(v)||0,r.money+=v,r.stats.earned=(r.stats.earned||0)+v,v}",
        "to": "function R(v){return v=Math.round(v)||0,globalThis.__PC_CFG__.money&&v>0&&(v=Math.round(v*globalThis.__PC_CFG__.moneyRate)),r.money+=v,r.stats.earned=(r.stats.earned||0)+v,v}"
      },
      {
        "from": "function $(w){return w=Math.round(w)||0,r.money+=w,r.stats.earned=(r.stats.earned||0)+w,w}",
        "to": "function $(w){return w=Math.round(w)||0,globalThis.__PC_CFG__.money&&w>0&&(w=Math.round(w*globalThis.__PC_CFG__.moneyRate)),r.money+=w,r.stats.earned=(r.stats.earned||0)+w,w}"
      },
      {
        "from": "function S(u){return u=Math.round(u)||0,r.money+=u,r.stats.earned=(r.stats.earned||0)+u,u}",
        "to": "function S(u){return u=Math.round(u)||0,globalThis.__PC_CFG__.money&&u>0&&(u=Math.round(u*globalThis.__PC_CFG__.moneyRate)),r.money+=u,r.stats.earned=(r.stats.earned||0)+u,u}"
      }
    ],
    "flag": "money"
  },
  {
    "name": "野外闪光概率",
    "variants": [
      {
        "from": "Math.random()<Math.min(1,p.shinyRate(g.regionOf(f.chapter).key)*p.buffMult(\"shiny\"))",
        "to": "(globalThis.__PC_CFG__.wildShiny?Math.random()<globalThis.__PC_CFG__.wildRate/100:Math.random()<Math.min(1,p.shinyRate(g.regionOf(f.chapter).key)*p.buffMult(\"shiny\")))"
      },
      {
        "from": "Math.random()<Math.min(1,f.shinyRate(y.regionOf(h.chapter).key)*f.buffMult(\"shiny\"))",
        "to": "(globalThis.__PC_CFG__.wildShiny?Math.random()<globalThis.__PC_CFG__.wildRate/100:Math.random()<Math.min(1,f.shinyRate(y.regionOf(h.chapter).key)*f.buffMult(\"shiny\")))"
      }
    ],
    "flag": "wildShiny"
  },
  {
    "name": "孵蛋闪光概率",
    "variants": [
      {
        "from": "function io(v){return\"shiny\"in v?!!v.shiny:(Number.isInteger(v.k)?ho(\"egg\",v.k):Hn(String(v.uid??v.laidAt)))<Qn(v)}",
        "to": "function io(v){return globalThis.__PC_CFG__.eggShiny?true:\"shiny\"in v?!!v.shiny:(Number.isInteger(v.k)?ho(\"egg\",v.k):Hn(String(v.uid??v.laidAt)))<Qn(v)}"
      },
      {
        "from": "function vo(w){return\"shiny\"in w?!!w.shiny:(Number.isInteger(w.k)?Yn(\"egg\",w.k):no(String(w.uid??w.laidAt)))<Po(w)}",
        "to": "function vo(w){return globalThis.__PC_CFG__.eggShiny?true:\"shiny\"in w?!!w.shiny:(Number.isInteger(w.k)?Yn(\"egg\",w.k):no(String(w.uid??w.laidAt)))<Po(w)}"
      },
      {
        "from": "function _o(u){return\"shiny\"in u?!!u.shiny:(Number.isInteger(u.k)?uo(\"egg\",u.k):Hn(String(u.uid??u.laidAt)))<No(u)}",
        "to": "function _o(u){return globalThis.__PC_CFG__.eggShiny?true:\"shiny\"in u?!!u.shiny:(Number.isInteger(u.k)?uo(\"egg\",u.k):Hn(String(u.uid??u.laidAt)))<No(u)}"
      }
    ],
    "flag": "eggShiny"
  },
  {
    "name": "野外遭遇数量倍率",
    "variants": [
      {
        "from": "for(let ms=0;ms<Et.wild;ms++)As.push({...Wt,type:\"wild\",areas:Et.areas});",
        "to": "for(let ms=0;ms<(globalThis.__PC_CFG__.wildEncounters?Math.ceil(Et.wild*globalThis.__PC_CFG__.wildEncounterRate):Et.wild);ms++)As.push({...Wt,type:\"wild\",areas:Et.areas});"
      },
      {
        "from": "for(let us=0;us<Rt.wild;us++)Ds.push({...Jt,type:\"wild\",areas:Rt.areas});",
        "to": "for(let us=0;us<(globalThis.__PC_CFG__.wildEncounters?Math.ceil(Rt.wild*globalThis.__PC_CFG__.wildEncounterRate):Rt.wild);us++)Ds.push({...Jt,type:\"wild\",areas:Rt.areas});"
      }
    ],
    "flag": "wildEncounters"
  },
  {
    "name": "未捕捉精灵权重开关",
    "variants": [
      {
        "from": "he=()=>!N().event&&!N().zone&&!N().league&&(p.buffMult(\"rare\")>1||p.buffMult(\"dex\")>1)",
        "to": "he=()=>!N().event&&!N().zone&&!N().league&&(globalThis.__PC_CFG__.uncaught||p.buffMult(\"rare\")>1||p.buffMult(\"dex\")>1)"
      },
      {
        "from": "const fe=()=>!D().event&&!D().zone&&!D().league&&(p.buffMult(\"rare\")>1||p.buffMult(\"dex\")>1)",
        "to": "const fe=()=>!D().event&&!D().zone&&!D().league&&(globalThis.__PC_CFG__.uncaught||p.buffMult(\"rare\")>1||p.buffMult(\"dex\")>1)"
      },
      {
        "from": "ke=()=>!j().event&&!j().zone&&!j().league&&(f.buffMult(\"rare\")>1||f.buffMult(\"dex\")>1)",
        "to": "ke=()=>!j().event&&!j().zone&&!j().league&&(globalThis.__PC_CFG__.uncaught||f.buffMult(\"rare\")>1||f.buffMult(\"dex\")>1)"
      }
    ],
    "flag": "uncaught"
  },
  {
    "name": "未捕捉精灵权重倍率",
    "variants": [
      {
        "from": "wa=f=>he()?(p.tierOf(f).key===\"rare\"?p.buffMult(\"rare\"):1)*(p.caughtHere(f)?1:p.buffMult(\"dex\")):1;",
        "to": "wa=f=>he()?(p.tierOf(f).key===\"rare\"?p.buffMult(\"rare\"):1)*(p.caughtHere(f)?1:Math.max(p.buffMult(\"dex\"),globalThis.__PC_CFG__.uncaught?globalThis.__PC_CFG__.uncaughtRate:1)):1;"
      },
      {
        "from": "he=f=>fe()?(p.tierOf(f).key===\"rare\"?p.buffMult(\"rare\"):1)*(p.caughtHere(f)?1:p.buffMult(\"dex\")):1;",
        "to": "he=f=>fe()?(p.tierOf(f).key===\"rare\"?p.buffMult(\"rare\"):1)*(p.caughtHere(f)?1:Math.max(p.buffMult(\"dex\"),globalThis.__PC_CFG__.uncaught?globalThis.__PC_CFG__.uncaughtRate:1)):1;"
      },
      {
        "from": "fe=h=>ke()?(f.tierOf(h).key===\"rare\"?f.buffMult(\"rare\"):1)*(f.caughtHere(h)?1:f.buffMult(\"dex\")):1;",
        "to": "fe=h=>ke()?(f.tierOf(h).key===\"rare\"?f.buffMult(\"rare\"):1)*(f.caughtHere(h)?1:Math.max(f.buffMult(\"dex\"),globalThis.__PC_CFG__.uncaught?globalThis.__PC_CFG__.uncaughtRate:1)):1;"
      }
    ],
    "flag": "uncaught"
  },
  {
    "name": "路线普通道具池稀有物品权重",
    "variants": [
      {
        "from": "const Ye=g.ITEM_TABLE.map(([Gt,ct])=>[Na(Gt,ct.item,f.chapter),ct]),Ia=Ye.reduce((Gt,ct)=>Gt+ct[0],0);",
        "to": "const Ye=g.ITEM_TABLE.map(([Gt,ct])=>[Na(Gt*(globalThis.__PC_CFG__.rareItems&&((ct.stone?(p.shopStones(f.chapter)||[]):[ct.item]).some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(p,id)))?globalThis.__PC_CFG__.rareItemRate:1),ct.item,f.chapter),ct]),Ia=Ye.reduce((Gt,ct)=>Gt+ct[0],0);"
      },
      {
        "from": "const Ge=g.ITEM_TABLE.map(([Ht,jt])=>[_t(Ht,jt.item,f.chapter),jt]),Ba=Ge.reduce((Ht,jt)=>Ht+jt[0],0);",
        "to": "const Ge=g.ITEM_TABLE.map(([Ht,jt])=>{const __pcIds=jt.stone?(p.shopStones(f.chapter)||[]):[jt.item],__pcBoost=globalThis.__PC_CFG__.rareItems&&__pcIds.some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(p,id))?globalThis.__PC_CFG__.rareItemRate:1;return[_t(Ht*__pcBoost,jt.item,f.chapter),jt]}),Ba=Ge.reduce((Ht,jt)=>Ht+jt[0],0);"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "路线道具概率显示同步",
    "variants": [
      {
        "from": "function pt(f){const w=g.ITEM_TABLE.map(([Ze,Ye])=>[Na(Ze,Ye.item,f),Ye]),fe=w.reduce((Ze,Ye)=>Ze+Ye[0],0);",
        "to": "function pt(f){const w=g.ITEM_TABLE.map(([Ze,Ye])=>[Na(Ze*(globalThis.__PC_CFG__.rareItems&&((Ye.stone?(p.shopStones(f)||[]):[Ye.item]).some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(p,id)))?globalThis.__PC_CFG__.rareItemRate:1),Ye.item,f),Ye]),fe=w.reduce((Ze,Ye)=>Ze+Ye[0],0);"
      },
      {
        "from": "function it(f){const b=g.ITEM_TABLE.map(([Qe,Ge])=>[_t(Qe,Ge.item,f),Ge]),ue=b.reduce((Qe,Ge)=>Qe+Ge[0],0);",
        "to": "function it(f){const b=g.ITEM_TABLE.map(([Qe,Ge])=>{const __pcIds=Ge.stone?(p.shopStones(f)||[]):[Ge.item],__pcBoost=globalThis.__PC_CFG__.rareItems&&__pcIds.some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(p,id))?globalThis.__PC_CFG__.rareItemRate:1;return[_t(Qe*__pcBoost,Ge.item,f),Ge]}),ue=b.reduce((Qe,Ge)=>Qe+Ge[0],0);"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "路线稀有道具掉率（未获取优先）",
    "variants": [
      {
        "from": "qt=Object.entries(w.loot||{}).find(([Gt,ct])=>!f.gifts[Gt]&&it(Gt,ct)&&Math.random()<(typeof ct==\"number\"?ct:ct.p));",
        "to": "qt=Object.entries(w.loot||{}).find(([Gt,ct])=>!f.gifts[Gt]&&it(Gt,ct)&&Math.random()<Math.min(1,(typeof ct==\"number\"?ct:ct.p)*(globalThis.__PC_CFG__.rareItems&&!Gt.startsWith(\"egg:\")&&globalThis.__PC_ITEM_MISSING__(p,Gt)?globalThis.__PC_CFG__.rareItemRate:1)));"
      },
      {
        "from": "yt=Object.entries(b.loot||{}).find(([Ht,jt])=>!f.gifts[Ht]&&st(Ht,jt)&&Math.random()<(typeof jt==\"number\"?jt:jt.p));",
        "to": "yt=Object.entries(b.loot||{}).find(([Ht,jt])=>!f.gifts[Ht]&&st(Ht,jt)&&Math.random()<Math.min(1,(typeof jt==\"number\"?jt:jt.p)*(globalThis.__PC_CFG__.rareItems&&!Ht.startsWith(\"egg:\")&&globalThis.__PC_ITEM_MISSING__(p,Ht)?globalThis.__PC_CFG__.rareItemRate:1)));"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "任务稀有道具掉率",
    "variants": [
      {
        "from": "Ws&&!fe.gifts[Ws.until]&&p.itemCount(Ws.item)<Ws.upTo&&Math.random()<Ws.p&&As.splice",
        "to": "Ws&&!fe.gifts[Ws.until]&&p.itemCount(Ws.item)<Ws.upTo&&Math.random()<Math.min(1,Ws.p*(globalThis.__PC_CFG__.rareItems&&globalThis.__PC_IS_RARE_ITEM__(Ws.item)?globalThis.__PC_CFG__.rareItemRate:1))&&As.splice"
      },
      {
        "from": "Ts&&!ue.gifts[Ts.until]&&p.itemCount(Ts.item)<Ts.upTo&&Math.random()<Ts.p&&Ds.splice",
        "to": "Ts&&!ue.gifts[Ts.until]&&p.itemCount(Ts.item)<Ts.upTo&&Math.random()<Math.min(1,Ts.p*(globalThis.__PC_CFG__.rareItems&&globalThis.__PC_IS_RARE_ITEM__(Ts.item)?globalThis.__PC_CFG__.rareItemRate:1))&&Ds.splice"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "城镇稀有道具权重",
    "variants": [
      {
        "from": "Eo=Object.entries(Ye.itemWeights).map(([ho,pn])=>[ho,Na(pn,ho,w)])",
        "to": "Eo=Object.entries(Ye.itemWeights).map(([ho,pn])=>[ho,Na(pn,ho,w)*(globalThis.__PC_CFG__.rareItems&&((ho===\"stone\"?(p.shopStones(w)||[]):[ho]).some(x=>globalThis.__PC_IS_RARE_ITEM__(x)&&globalThis.__PC_ITEM_MISSING__(p,x)))?globalThis.__PC_CFG__.rareItemRate:1)])"
      },
      {
        "from": "Zn=Object.entries(Ge.itemWeights).map(([no,As])=>[no,_t(As,no,b)])",
        "to": "Zn=Object.entries(Ge.itemWeights).map(([no,As])=>{const __pcIds=no===\"stone\"?(p.shopStones(b)||[]):[no],__pcBoost=globalThis.__PC_CFG__.rareItems&&__pcIds.some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(p,id))?globalThis.__PC_CFG__.rareItemRate:1;return[no,_t(As,no,b)*__pcBoost]})"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "城镇稀有道具概率显示同步",
    "flag": "rareItems",
    "variants": [
      {
        "from": "Ia=Object.entries(w.itemWeights).map(([Et,Wt])=>[Et,Na(Wt,Et,f)])",
        "to": "Ia=Object.entries(w.itemWeights).map(([Et,Wt])=>[Et,Na(Wt,Et,f)*(globalThis.__PC_CFG__.rareItems&&((Et===\"stone\"?(p.shopStones(f)||[]):[Et]).some(x=>globalThis.__PC_IS_RARE_ITEM__(x)&&globalThis.__PC_ITEM_MISSING__(p,x)))?globalThis.__PC_CFG__.rareItemRate:1)])"
      }
    ]
  },
  {
    "name": "野生宝可梦稀有材料掉率",
    "variants": [
      {
        "from": "&&Math.random()<As.rate&&oa(As.item)&&Ye.push({type:\"soul\",enemy:w,n:p.itemCount(As.item),need:As.need})",
        "to": "&&Math.random()<Math.min(1,As.rate*(globalThis.__PC_CFG__.rareItems&&p.itemCount(As.item)<As.need?globalThis.__PC_CFG__.rareItemRate:1))&&oa(As.item)&&Ye.push({type:\"soul\",enemy:w,n:p.itemCount(As.item),need:As.need})"
      },
      {
        "from": "&&Math.random()<Ds.rate&&na(Ds.item)&&Ge.push({type:\"soul\",enemy:b,n:p.itemCount(Ds.item),need:Ds.need})",
        "to": "&&Math.random()<Math.min(1,Ds.rate*(globalThis.__PC_CFG__.rareItems&&p.itemCount(Ds.item)<Ds.need?globalThis.__PC_CFG__.rareItemRate:1))&&na(Ds.item)&&Ge.push({type:\"soul\",enemy:b,n:p.itemCount(Ds.item),need:Ds.need})"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "地下通道未获取稀有道具权重",
    "variants": [
      {
        "from": "const zt=pe(ft,hs=>hs.w[G]),Ut=Ke?$().GUARD_MULT:1,Xt=hs=>hs[Math.floor(Math.random()*hs.length)]",
        "to": "const __pcRareGroups=new Set([\"rare-candy\",\"stone\",\"stone2\",\"evo-item\",\"evo-item-sinnoh\",\"berry\",\"berry2\",\"starf-berry\"]),__pcRareBoost=x=>globalThis.__PC_CFG__.rareItems&&__pcRareGroups.has(x.id)&&(x.of||[x.id]).some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(t,id)); const zt=pe(ft,hs=>hs.w[G]*(__pcRareBoost(hs)?globalThis.__PC_CFG__.rareItemRate:1)),Ut=Ke?$().GUARD_MULT:1,Xt=hs=>hs[Math.floor(Math.random()*hs.length)]"
      },
      {
        "from": "const zt=$e(mt,ms=>ms.w[G]),Ut=Je?X().GUARD_MULT:1,Gt=ms=>ms[Math.floor(Math.random()*ms.length)]",
        "to": "const __pcRareGroups=new Set([\"rare-candy\",\"stone\",\"stone2\",\"evo-item\",\"evo-item-sinnoh\",\"berry\",\"berry2\",\"starf-berry\"]),__pcRareBoost=ms=>globalThis.__PC_CFG__.rareItems&&__pcRareGroups.has(ms.id)&&(ms.of||[ms.id]).some(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(t,id)),zt=$e(mt,ms=>ms.w[G]*(__pcRareBoost(ms)?globalThis.__PC_CFG__.rareItemRate:1)),Ut=Je?X().GUARD_MULT:1,Gt=ms=>ms[Math.floor(Math.random()*ms.length)]"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "地下通道优先发放未获取稀有道具",
    "variants": [
      {
        "from": "case\"item\":return{k:\"item\",id:Xt(zt.of)}",
        "to": "case\"item\":{const __pcItems=zt.of||[zt.id],__pcMissing=globalThis.__PC_CFG__.rareItems&&__pcRareGroups.has(zt.id)?__pcItems.filter(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(t,id)):[];return{k:\"item\",id:Xt(__pcMissing.length?__pcMissing:__pcItems)}}"
      },
      {
        "from": "case\"item\":return{k:\"item\",id:Gt(zt.of)}",
        "to": "case\"item\":{const __pcItems=zt.of||[zt.id],__pcMissing=globalThis.__PC_CFG__.rareItems&&__pcRareGroups.has(zt.id)?__pcItems.filter(id=>globalThis.__PC_IS_RARE_ITEM__(id)&&globalThis.__PC_ITEM_MISSING__(t,id)):[];return{k:\"item\",id:Gt(__pcMissing.length?__pcMissing:__pcItems)}}"
      }
    ],
    "flag": "rareItems"
  },
  {
    "name": "地下通道晶洞实际入库倍率",
    "variants": [
      {
        "from": "function Ge(L,G,Ke=1){Ke&&((L.geodes||=[0,0,0,0])[G]+=Ke,(t.S.stats.geoIn||=[0,0,0,0])[G]+=Ke)}",
        "to": "function Ge(L,G,Ke=1){globalThis.__PC_CFG__.geode&&(Ke=Math.round(Ke*globalThis.__PC_CFG__.geodeRate)),Ke&&((L.geodes||=[0,0,0,0])[G]+=Ke,(t.S.stats.geoIn||=[0,0,0,0])[G]+=Ke)}"
      },
      {
        "from": "function Ve(A,G,Je=1){Je&&((A.geodes||=[0,0,0,0])[G]+=Je,(t.S.stats.geoIn||=[0,0,0,0])[G]+=Je)}",
        "to": "function Ve(A,G,Je=1){globalThis.__PC_CFG__.geode&&(Je=Math.round(Je*globalThis.__PC_CFG__.geodeRate)),Je&&((A.geodes||=[0,0,0,0])[G]+=Je,(t.S.stats.geoIn||=[0,0,0,0])[G]+=Je)}"
      },
      {
        "from": "function We(O,H,ea=1){ea&&((O.geodes||=[0,0,0,0])[H]+=ea,(t.S.stats.geoIn||=[0,0,0,0])[H]+=ea)}",
        "to": "function We(O,H,ea=1){globalThis.__PC_CFG__.geode&&(ea=Math.round(ea*globalThis.__PC_CFG__.geodeRate)),ea&&((O.geodes||=[0,0,0,0])[H]+=ea,(t.S.stats.geoIn||=[0,0,0,0])[H]+=ea)}"
      }
    ],
    "flag": "geode"
  },
  {
    "name": "地下通道晶洞奖励显示同步",
    "variants": [
      {
        "from": "ft.geodes.forEach((Xt,is)=>Ge(Ha,is,Xt));",
        "to": "ft.geodes.forEach((Xt,is)=>Ge(Ha,is,Xt));globalThis.__PC_CFG__.geode&&(ft.geodes=ft.geodes.map(x=>Math.round(x*globalThis.__PC_CFG__.geodeRate)));"
      },
      {
        "from": "mt.geodes.forEach((Gt,ns)=>Ve(Ga,ns,Gt));",
        "to": "mt.geodes.forEach((Gt,ns)=>Ve(Ga,ns,Gt));globalThis.__PC_CFG__.geode&&(mt.geodes=mt.geodes.map(Gt=>Math.round(Gt*globalThis.__PC_CFG__.geodeRate)));"
      },
      {
        "from": "rt.geodes.forEach((zt,ts)=>We(Za,ts,zt));",
        "to": "rt.geodes.forEach((zt,ts)=>We(Za,ts,zt));globalThis.__PC_CFG__.geode&&(rt.geodes=rt.geodes.map(zt=>Math.round(zt*globalThis.__PC_CFG__.geodeRate)));"
      }
    ],
    "flag": "geode"
  },
  {
    "name": "地下通道碎片最终结算倍率",
    "variants": [
      {
        "from": "function Ma(L,G,Ke){const Aa=Qe(L,G,Ke),Ha=N(),ft={money:Aa.money,shards:Aa.shards,items:Aa.items,geodes:[...Aa.geodes],plates:[],fossils:[]}",
        "to": "function Ma(L,G,Ke){const Aa=Qe(L,G,Ke);globalThis.__PC_CFG__.shards&&(Aa.shards=Math.round(Aa.shards*globalThis.__PC_CFG__.shardRate));const Ha=N(),ft={money:Aa.money,shards:Aa.shards,items:Aa.items,geodes:[...Aa.geodes],plates:[],fossils:[]}"
      },
      {
        "from": "function Ea(A,G,Je){const Da=sa(A,G,Je),Ga=D(),mt={money:Da.money,shards:Da.shards,items:Da.items,geodes:[...Da.geodes],plates:[],fossils:[]}",
        "to": "function Ea(A,G,Je){const Da=sa(A,G,Je);globalThis.__PC_CFG__.shards&&(Da.shards=Math.round(Da.shards*globalThis.__PC_CFG__.shardRate));const Ga=D(),mt={money:Da.money,shards:Da.shards,items:Da.items,geodes:[...Da.geodes],plates:[],fossils:[]}"
      },
      {
        "from": "const Ia=Qe(O,H,ea),Za=j(),rt={money:Ia.money,shards:Ia.shards,items:Ia.items,geodes:[...Ia.geodes],plates:[],fossils:[]}",
        "to": "const Ia=Qe(O,H,ea);globalThis.__PC_CFG__.shards&&(Ia.shards=Math.round(Ia.shards*globalThis.__PC_CFG__.shardRate));const Za=j(),rt={money:Ia.money,shards:Ia.shards,items:Ia.items,geodes:[...Ia.geodes],plates:[],fossils:[]}"
      }
    ],
    "flag": "shards"
  },
  {
    "name": "地下通道速度倍率",
    "variants": [
      {
        "from": "STEP_MS:2800,FLOOR_EXTRA:.83,WALL_MS:45e3",
        "to": "STEP_MS:globalThis.__PC_CFG__.undergroundSpeed?2800/globalThis.__PC_CFG__.speedRate:2800,FLOOR_EXTRA:.83,WALL_MS:globalThis.__PC_CFG__.undergroundSpeed?45e3/globalThis.__PC_CFG__.speedRate:45e3"
      }
    ],
    "flag": "undergroundSpeed"
  },
  {
    "name": "服务器账号只读诊断",
    "variants": [
      {
        "from": "a.__seal?.()",
        "to": "globalThis.__PC_DIAG__=()=>{const h=a.Cloud?.hold;return{signedIn:!!a.Cloud?.user,cloudSaveState:a.Cloud?.saveState??\"unknown\",holdPresent:!!h,holdHidden:h?!!h.hidden:null,holdRef:h?.ref??null}};a.__seal?.()"
      }
    ],
    "flag": "diag"
  }
];

  function countOf(source, needle) {
    if (!needle) return 0;
    let count = 0, at = 0;
    while ((at = source.indexOf(needle, at)) !== -1) { count++; at += needle.length; }
    return count;
  }

  function makePrefix() {
    return 'globalThis.__PC_CFG__=' + JSON.stringify(settings) + ';\n' +
      'globalThis.__PC_RARE_ITEM_IDS__=new Set(' + JSON.stringify(rareIds) + ');\n' +
      'globalThis.__PC_IS_RARE_ITEM__=function(id){return typeof id==="string"&&globalThis.__PC_RARE_ITEM_IDS__.has(id)};\n' +
      'globalThis.__PC_ITEM_MISSING__=function(game,id){try{if(typeof id!=="string")return false;const s=game&&game.S||{},held=typeof game?.keyHeld==="function"?Number(game.keyHeld(id)||0):Number(game?.itemCount?.(id)||0),base=Number(s.itemSince?.items?.[id]||0),incoming=Number(s.stats?.itemIn?.[id]||0);return !(held>0||base>0||incoming>0)}catch(_){return false}};\n';
  }

  function patch(source) {
    let text = source;
    const applied = [], missing = [], ambiguous = [];
    const activeRules = rules.filter(rule => rule.flag === 'diag' || (rule.flag === 'capture' ? settings.normalCapture || settings.legendCapture : !!settings[rule.flag]));
    for (const rule of activeRules) {
      const found = [];
      for (const variant of rule.variants) {
        const count = countOf(text, variant.from);
        if (count > 0) found.push({ variant, count });
      }
      if (found.length === 0) { missing.push(rule.name); continue; }
      if (found.length !== 1 || found[0].count !== 1) { ambiguous.push(rule.name); continue; }
      const { from, to } = found[0].variant;
      const index = text.indexOf(from);
      text = text.slice(0, index) + to + text.slice(index + from.length);
      applied.push(rule.name);
    }
    if (!applied.length) return { text: source, applied, missing, ambiguous, requested: activeRules.length };
    return { text: makePrefix() + text, applied, missing, ambiguous, requested: activeRules.length };
  }

  function update() {
    const status = uiRoot?.getElementById('pc-status');
    if (status) status.textContent = state;
    const detail = uiRoot?.getElementById('pc-detail');
    if (detail) detail.textContent = details;
    const mode = uiRoot?.getElementById('pc-mode');
    if (mode) mode.textContent = originalMode ? '原版模式：补丁停用' : platform + ' · 自动识别主脚本';
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (_) {}
    state = originalMode ? '设置已保存；当前为原版模式，请启用补丁后生效' : '设置已保存；刷新游戏后生效';
    update();
  }

  function applyAndReload() {
    try { localStorage.removeItem(DISABLE_KEY); } catch (_) {}
    try { const u=new URL(location.href);u.searchParams.delete(SAFE_PARAM);if(u.href!==location.href)history.replaceState(null,'',u.href); } catch (_) {}
    originalMode = false;
    location.reload();
  }

  function resetAll() {
    if (!confirm('将所有修改开关关闭、数值恢复默认预设，并刷新游戏。确定继续？')) return;
    settings = { ...defaults };
    try { localStorage.setItem(KEY, JSON.stringify(settings)); localStorage.removeItem(DISABLE_KEY); } catch (_) {}
    originalMode = false;
    location.reload();
  }

  function disablePatch() {
    if (!confirm('将停用补丁并刷新；之后会保持原版模式，直到你再次点击“刷新并应用设置”。确定继续？')) return;
    try { localStorage.setItem(DISABLE_KEY, '1'); } catch (_) {}
    originalMode = true;
    location.reload();
  }

  function addSetting(container, flag, numberKey, label, unit, min, max, step, help) {
    const line = document.createElement('div');
    line.className = 'pc-line';
    const left = document.createElement('div');
    left.className = 'pc-label-wrap';
    const caption = document.createElement('span');
    caption.className = 'pc-label';
    caption.textContent = label;
    left.appendChild(caption);
    if (help) {
      const note = document.createElement('small');
      note.className = 'pc-help';
      note.textContent = help;
      left.appendChild(note);
    }
    const group = document.createElement('div');
    group.className = 'pc-inputs';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = !!settings[flag];
    check.setAttribute('aria-label', '启用' + label);
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(settings[numberKey]);
    input.disabled = !check.checked;
    const suffix = document.createElement('span');
    suffix.className = 'pc-unit';
    suffix.textContent = unit;
    check.addEventListener('change', () => { settings[flag] = check.checked; input.disabled = !check.checked; save(); });
    input.addEventListener('change', () => {
      const n = Number(input.value);
      settings[numberKey] = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : defaults[numberKey];
      input.value = String(settings[numberKey]);
      save();
    });
    group.append(check, input, suffix);
    line.append(left, group);
    container.appendChild(line);
  }

  function addToggle(container, flag, label, help) {
    const line = document.createElement('label');
    line.className = 'pc-line';
    const left = document.createElement('div');
    left.className = 'pc-label-wrap';
    const caption = document.createElement('span');
    caption.className = 'pc-label';
    caption.textContent = label;
    left.appendChild(caption);
    if (help) {
      const note = document.createElement('small');
      note.className = 'pc-help';
      note.textContent = help;
      left.appendChild(note);
    }
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = !!settings[flag];
    check.addEventListener('change', () => { settings[flag] = check.checked; save(); });
    line.append(left, check);
    container.appendChild(line);
  }

  function runAccountDiagnostic() {
    const output = uiRoot?.getElementById('pc-diagnostic-result');
    if (!output) return;
    let data;
    try { data = typeof pageWindow.__PC_DIAG__ === 'function' ? pageWindow.__PC_DIAG__() : null; }
    catch (err) { output.textContent = '读取失败：' + String(err?.message || err); return; }
    if (!data) { output.textContent = '游戏尚未完成初始化，或当前版本未匹配诊断接口。不会影响游戏运行。'; return; }
    const lines = [
      '登录状态：' + (data.signedIn ? '已登录' : '未登录 / 云端尚未就绪'),
      '云端存档状态：' + String(data.cloudSaveState || '未知'),
      '服务器 hold 限制：' + (data.holdPresent ? '存在' : data.signedIn ? '未检测到' : '暂不可判断')
    ];
    if (data.holdPresent) {
      lines.push('服务器 hidden 标记：' + (data.holdHidden ? 'true' : 'false'));
      lines.push('服务器参考编号：' + (data.holdRef || '未提供'));
      lines.push('结论：服务器返回了 hold 对象；具体限制原因需向游戏官方核实。');
    } else if (data.signedIn) {
      lines.push('结论：当前客户端未检测到 Cloud hold。公开训练师卡片没有成就列表字段，不能仅凭卡片缺少成就判断账号被隐藏。');
    } else {
      lines.push('结论：尚未取得已登录的云端状态，暂时不能判断账号是否受限。');
    }
    output.textContent = lines.join('\n');
  }

  function ui() {
    if (!ensureHost() || uiRoot.getElementById('pc-panel')) return;
    const style = document.createElement('style');
    style.textContent = `
      #pc-toggle{pointer-events:auto;position:fixed;right:12px;bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483647;background:#263b60;color:#fff;border:1px solid #91baff;border-radius:22px;padding:11px 15px;font:600 13px system-ui;box-shadow:0 4px 18px #0009;cursor:pointer}
      #pc-panel{pointer-events:auto;position:fixed;right:12px;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 54px);z-index:2147483647;width:min(410px,calc(100vw - 24px));max-height:min(84vh,780px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;background:#19202d;color:#f5f7ff;border:1px solid #55627c;border-radius:13px;padding:13px;font:13px/1.45 system-ui,-apple-system,sans-serif;box-shadow:0 5px 24px #000b}
      #pc-panel[hidden]{display:none!important}#pc-panel *{box-sizing:border-box}#pc-panel button,#pc-panel input{font:inherit}#pc-panel button{cursor:pointer}#pc-panel input[type=number]{width:78px;max-width:25vw;padding:6px;border-radius:6px;border:1px solid #8292ae;background:#111b2c;color:#fff;text-align:right}#pc-panel input[type=number]:disabled{opacity:.45}#pc-panel input[type=checkbox]{width:18px;height:18px;accent-color:#65a9ff;flex:none}
      #pc-panel .pc-top{display:flex;justify-content:space-between;align-items:center;gap:8px}#pc-panel .pc-top b{font-size:15px}#pc-panel .pc-close{border:0;border-radius:6px;background:#3c4c68;color:#fff;padding:5px 10px}#pc-panel .pc-sub{font-size:11px;color:#b2bfd2;margin:5px 0}#pc-panel #pc-status{font-size:12px;color:#a7ddff;margin:8px 0 3px}#pc-panel #pc-detail{font-size:11px;color:#b2bfd2;white-space:pre-wrap;overflow-wrap:anywhere;margin:3px 0 8px}
      #pc-panel .pc-section{margin-top:11px;padding-top:9px;border-top:1px solid #ffffff22;font-weight:700;color:#dce8ff}#pc-panel .pc-line{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #ffffff13}#pc-panel .pc-label-wrap{display:flex;flex-direction:column;gap:2px;min-width:0}#pc-panel .pc-label{font-weight:500}#pc-panel .pc-help{font-size:10px;line-height:1.3;color:#9daec5}#pc-panel .pc-inputs{display:flex;align-items:center;gap:6px;flex:none}#pc-panel .pc-unit{color:#c0cce0;min-width:12px}
      #pc-panel .pc-actions{display:flex;gap:7px;margin:12px 0 5px;flex-wrap:wrap}#pc-panel .pc-actions button{flex:1 1 105px;padding:9px 7px;border-radius:7px;border:1px solid #647794;color:#fff;background:#344968}#pc-panel .pc-actions .pc-reset{background:#713c40;border-color:#ad696c}#pc-panel .pc-actions .pc-muted{background:#303b4e}#pc-panel .pc-diag{margin-top:12px;padding:10px;border:1px solid #53627b;border-radius:9px;background:#121a27}#pc-panel .pc-diag button{padding:7px 10px;border:1px solid #647794;border-radius:7px;background:#344968;color:#fff}#pc-panel #pc-diagnostic-result{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.45;color:#d4e1f4;margin:8px 0 0}
      @media(max-width:600px){#pc-toggle{right:10px}#pc-panel{right:8px;bottom:calc(max(10px,env(safe-area-inset-bottom)) + 52px);width:calc(100vw - 16px);max-height:72dvh;font-size:14px;padding:12px}#pc-panel .pc-line{padding:9px 0}#pc-panel input[type=number]{width:82px}}
    `;
    uiRoot.appendChild(style);

    const toggle = uiRoot.getElementById('pc-toggle');
    const panel = document.createElement('section');
    panel.id = 'pc-panel'; panel.hidden = true;
    panel.innerHTML = `
      <div class="pc-top"><b>PokeCatch 自动补丁 v0.6.0</b><button type="button" class="pc-close" id="pc-close">收起</button></div>
      <div class="pc-sub" id="pc-mode"></div><div id="pc-status"></div><div id="pc-detail"></div>
      <div class="pc-section">捕捉与野外遭遇</div><div id="pc-capture-fields"></div>
      <div class="pc-section">闪光</div><div id="pc-shiny-fields"></div>
      <div class="pc-section">经验、金钱与稀有道具</div><div id="pc-reward-fields"></div>
      <div class="pc-section">地下通道</div><div id="pc-underground-fields"></div>
      <div class="pc-actions">
        <button type="button" id="pc-apply">刷新并应用设置</button>
        <button type="button" class="pc-reset" id="pc-reset">↺ 一键还原默认值</button>
        <button type="button" class="pc-muted" id="pc-disable">停用补丁 / 原版模式</button>
      </div>
      <div class="pc-diag"><b>服务器账号诊断（只读）</b><p class="pc-sub">不会修改账号或云端存档；请先登录游戏，再执行检查。</p><button type="button" id="pc-diagnose">检查服务器账号状态</button><div id="pc-diagnostic-result">尚未检查。</div></div>
      <p class="pc-sub" style="margin-top:10px">神兽概率直接作用于最终捕获率；四次摇球判定仍按该最终概率计算。大师球和团战保底 100% 保留。</p>
      <p class="pc-sub">稀有道具倍率会提高路线特殊掉落、任务道具、城镇稀有物品和地下通道稀有物品的掉落权重；已获取记录会尽量参考当前持有量与存档获取统计。概率上限为 100%，权重倍率不等于最终概率倍率。</p>
      <p class="pc-sub">每条补丁规则独立检测。新版结构不匹配时会跳过对应功能并放行原版 JS，不会因单条规则失效而阻止游戏启动。</p>
    `;
    uiRoot.appendChild(panel);
    toggle.onclick = () => { panel.hidden = !panel.hidden; };
    panel.querySelector('#pc-close').addEventListener('click', () => { panel.hidden = true; });
    panel.querySelector('#pc-apply').addEventListener('click', applyAndReload);
    panel.querySelector('#pc-reset').addEventListener('click', resetAll);
    panel.querySelector('#pc-disable').addEventListener('click', disablePatch);
    panel.querySelector('#pc-diagnose').addEventListener('click', runAccountDiagnostic);

    const capture = panel.querySelector('#pc-capture-fields');
    addSetting(capture, 'normalCapture', 'normalRate', '普通宝可梦最终捕捉概率', '%', 0, 100, 1, '关闭时使用原版概率；默认预设 60%。');
    addSetting(capture, 'legendCapture', 'legendRate', '神兽 / 游走神兽 / 团战最终捕捉概率', '%', 0, 100, 1, '同步传说区域、野外游走神兽和团战；默认预设 10%。');
    addSetting(capture, 'wildEncounters', 'wildEncounterRate', '野外遭遇数量倍率', '×', 1, 10, 0.5, '按路线增加野生遭遇节点数量；默认 2 倍，不是每一步必遇。');
    addSetting(capture, 'uncaught', 'uncaughtRate', '未捕捉精灵出现权重', '×', 1, 100, 0.5, '借用谜芝果 dex 权重机制；默认 2 倍。');

    const shiny = panel.querySelector('#pc-shiny-fields');
    addSetting(shiny, 'wildShiny', 'wildRate', '野外闪光最终概率', '%', 0, 100, 1, '关闭时使用原版概率与原版加成；默认预设 10%。');
    addToggle(shiny, 'eggShiny', '孵蛋必闪（100%）', '开启后新孵化判定固定为闪光。');

    const reward = panel.querySelector('#pc-reward-fields');
    addSetting(reward, 'xp', 'xpRate', '经验获取倍率', '×', 1, 100000, 1, '默认预设 64 倍，离线经验仍受游戏原版离线系数影响。');
    addSetting(reward, 'money', 'moneyRate', '金钱正收益倍率', '×', 1, 100000, 1, '只放大正向收入，不放大购买支出；默认 64 倍。');
    addSetting(reward, 'rareItems', 'rareItemRate', '未获取稀有道具掉落权重', '×', 1, 1000, 1, '默认 10 倍；包括路线稀有掉落、任务道具、城镇稀有物品、野生灵魂材料及地下通道稀有物品。');

    const underground = panel.querySelector('#pc-underground-fields');
    addSetting(underground, 'geode', 'geodeRate', '晶洞获取倍率', '×', 1, 100000, 1, '同步地下通道库存、统计与奖励显示；默认 20 倍。');
    addSetting(underground, 'shards', 'shardRate', '地下通道碎片获取倍率', '×', 1, 100000, 1, '在原版奖励结算后放大最终碎片数量；默认 20 倍。');
    addSetting(underground, 'undergroundSpeed', 'speedRate', '地下通道速度倍率', '×', 1, 100, 1, '缩短地下通道步进和墙体耗时；默认 10 倍。');
    update();
  }

  function scriptUrl(node) {
    const raw = node?.src || node?.getAttribute?.('src') || '';
    if (!raw) return '';
    try { return new URL(raw, location.href).href; } catch (_) { return raw; }
  }
  const scriptRe = /(?:^|\/)app(?:\.[a-z0-9_-]+)?\.js(?:[?#]|$)/i;

  function isTargetUrl(url) {
    try { return scriptRe.test(new URL(url, location.href).pathname); }
    catch (_) { return scriptRe.test(url); }
  }

  function copyScriptAttributes(from, to, includeIntegrity) {
    for (const attr of Array.from(from?.attributes || [])) {
      if (attr.name === 'src' || (!includeIntegrity && attr.name === 'integrity')) continue;
      try { to.setAttribute(attr.name, attr.value); } catch (_) {}
    }
    try { to.async = !!from.async; } catch (_) {}
    try { to.defer = !!from.defer; } catch (_) {}
    try { to.noModule = !!from.noModule; } catch (_) {}
  }

  function restoreOriginal(node, meta, message) {
    pendingUrls.delete(meta.url);
    failedUrls.add(meta.url);
    const script = document.createElement('script');
    copyScriptAttributes(node, script, true);
    if (meta.type) script.type = meta.type; else script.removeAttribute('type');
    script.async = meta.async;
    script.defer = meta.defer;
    script.src = meta.url;
    if (node?.parentNode) node.replaceWith(script);
    else (document.head || document.documentElement).appendChild(script);
    state = message || '补丁未应用，已放行原版 JS';
    update();
  }

  function handle(node, meta) {
    if (typeof GM_xmlhttpRequest !== 'function') {
      restoreOriginal(node, meta, '当前脚本管理器没有跨域请求接口，已放行原版 JS');
      return;
    }
    state = '正在下载并逐项检查新版游戏脚本';
    details = '资源：' + meta.url.split('/').pop();
    update();
    try { GM_xmlhttpRequest({
      method: 'GET', url: meta.url, timeout: 8000,
      onload(response) {
        if (response.status !== 200 || !response.responseText) {
          restoreOriginal(node, meta, '下载失败（HTTP ' + response.status + '），已放行原版 JS');
          return;
        }
        const result = patch(response.responseText);
        details = '资源：' + meta.url.split('/').pop() + '\n匹配成功：' + result.applied.length + '/' + result.requested + '\n' +
          (result.missing.length ? '未匹配：' + result.missing.join('、') + '\n' : '') +
          (result.ambiguous.length ? '重复匹配：' + result.ambiguous.join('、') : '');
        if (!result.applied.filter(name => name !== '服务器账号只读诊断').length) {
          restoreOriginal(node, meta, '未识别当前 JS 结构，已安全放行原版游戏');
          return;
        }
        let blobUrl;
        try {
          const BlobCtor = pageWindow.Blob || Blob;
          const URLApi = pageWindow.URL || URL;
          blobUrl = URLApi.createObjectURL(new BlobCtor([result.text + '\n//# sourceURL=pc-patched-app-v0.6.0.js'], { type: 'text/javascript' }));
        } catch (err) {
          restoreOriginal(node, meta, '创建补丁脚本失败，已放行原版 JS：' + String(err?.message || err));
          return;
        }
        const replacement = document.createElement('script');
        copyScriptAttributes(node, replacement, false);
        if (meta.type) replacement.type = meta.type; else replacement.removeAttribute('type');
        replacement.async = meta.async;
        replacement.defer = meta.defer;
        replacement.onload = () => {
          try { (pageWindow.URL || URL).revokeObjectURL(blobUrl); } catch (_) {}
          pendingUrls.delete(meta.url);
          handledUrls.add(meta.url);
          state = '补丁已应用：' + result.applied.length + '/' + result.requested + ' 项；未匹配项已跳过';
          update();
        };
        replacement.onerror = () => {
          try { (pageWindow.URL || URL).revokeObjectURL(blobUrl); } catch (_) {}
          restoreOriginal(replacement, meta, '浏览器阻止补丁脚本，已回退原版 JS');
        };
        replacement.src = blobUrl;
        if (node?.parentNode) node.replaceWith(replacement);
        else (document.head || document.documentElement).appendChild(replacement);
      },
      onerror() { restoreOriginal(node, meta, '网络请求错误，已放行原版 JS'); },
      ontimeout() { restoreOriginal(node, meta, '下载超时，已放行原版 JS'); }
    }); } catch (err) { restoreOriginal(node, meta, '跨域下载接口异常，已放行原版 JS：'+String(err?.message || err)); }
  }

  const anyPatchRequested = Object.keys(defaults).some(k => typeof defaults[k] === 'boolean' && settings[k]);
  if (!anyPatchRequested && !originalMode) { state = '全部补丁关闭：安全加载原版游戏'; details = '需要修改时，打开对应开关后点击“刷新并应用设置”。'; update(); }
  function intercept(node) {
    if (originalMode || !anyPatchRequested || !node || node.tagName !== 'SCRIPT') return false;
    const url = scriptUrl(node);
    if (!url || !isTargetUrl(url) || handledUrls.has(url) || failedUrls.has(url) || pendingUrls.has(url) || nodeMeta.has(node)) return false;
    sawCandidate = true;
    const meta = { url, type: node.type || '', async: !!node.async, defer: !!node.defer };
    nodeMeta.set(node, meta);
    pendingUrls.add(url);
    node.type = 'javascript/blocked-pc';
    handle(node, meta);
    return true;
  }

  // Post-append observers cannot reliably cancel an already scheduled external
  // script and may execute both patched and original copies. Observe for status,
  // never mutate scripts after their insertion.
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node.nodeType !== 1) continue;
      const scripts = node.tagName === 'SCRIPT' ? [node] : node.querySelectorAll ? [...node.querySelectorAll('script[src]')] : [];
      for (const script of scripts) {
        const url = scriptUrl(script);
        if (url && isTargetUrl(url) && !nodeMeta.has(script)) {
          sawCandidate = true;
          if (anyPatchRequested && !originalMode) {
            state = '检测到游戏 JS，但此加载方式未被提前拦截；已保持原版运行';
            details = '资源：' + url.split('/').pop() + '\n如无修改效果，请检查 Tampermonkey 的页面注入模式。';
            update();
          }
        }
      }
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  try {
    if (originalMode || !anyPatchRequested) throw new Error("原版/无补丁模式，不修改全局 DOM API");
    const NodeCtor = pageWindow.Node || Node;
    const proto = NodeCtor.prototype;
    const nativeAppend = proto.appendChild;
    proto.appendChild = function (node) {
      if (!originalMode && node?.tagName === 'SCRIPT') {
        const url = scriptUrl(node);
        if (url && isTargetUrl(url) && !handledUrls.has(url) && !failedUrls.has(url) && !pendingUrls.has(url) && !nodeMeta.has(node)) {
          const meta = { url, type: node.type || '', async: !!node.async, defer: !!node.defer };
          nodeMeta.set(node, meta); pendingUrls.add(url); sawCandidate = true;
          node.type = 'javascript/blocked-pc';
          const result = nativeAppend.call(this, node);
          handle(node, meta);
          return result;
        }
      }
      return nativeAppend.call(this, node);
    };
    const nativeInsertBefore = proto.insertBefore;
    proto.insertBefore = function (node, reference) {
      if (!originalMode && node?.tagName === 'SCRIPT') {
        const url = scriptUrl(node);
        if (url && isTargetUrl(url) && !handledUrls.has(url) && !failedUrls.has(url) && !pendingUrls.has(url) && !nodeMeta.has(node)) {
          const meta = { url, type: node.type || '', async: !!node.async, defer: !!node.defer };
          nodeMeta.set(node, meta); pendingUrls.add(url); sawCandidate = true;
          node.type = 'javascript/blocked-pc';
          const result = nativeInsertBefore.call(this, node, reference);
          handle(node, meta);
          return result;
        }
      }
      return nativeInsertBefore.call(this, node, reference);
    };
  } catch (_) {
    // MutationObserver remains as a fallback if prototype interception is unavailable.
  }

  function installUI() { try { ui(); } catch (err) { showRescue(err?.stack || err?.message || err); console.error('[PokeCatch AutoPatch] UI initialization failed:', err); } }
  installUI();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installUI, { once: true });
  window.addEventListener('load', () => {
    if (!originalMode && !sawCandidate && !handledUrls.size) {
      state = '未检测到 app 主脚本；当前网站可能更换了资源路径，已不拦截其他脚本';
      details = '游戏应继续使用原版 JS。请把此状态和页面地址截图发回以便更新匹配规则。';
      update();
    }
  }, { once: true });
})();
