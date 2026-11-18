(function (g) {
'use strict';
var W = g.WKAL = g.WKAL || {};
W.ui = W.ui || {};

W.ui.applyTheme = function (id) {
  var h = document.documentElement;
  if (!id) {
    h.removeAttribute('data-theme');
    h.className = (h.className || '').replace(/\bdark\b/g, '').replace(/\s+/g, ' ').trim();
  } else {
    h.setAttribute('data-theme', id);
    if (id === 'gold' || id === 'black') {
      if (!/\bdark\b/.test(h.className)) h.className = (h.className + ' dark').trim();
    } else {
      h.className = (h.className || '').replace(/\bdark\b/g, '').replace(/\s+/g, ' ').trim();
    }
  }
  W.lsSet(W.LS_THEME_KEY, id || '');
};

W.ui.bindTheme = function () {
  var saved = W.lsGet(W.LS_THEME_KEY, '');
  if (/^(gray|white|gold|black)$/.test(saved)) W.ui.applyTheme(saved);
  else W.ui.applyTheme('');
  function paintOn() {
    var cur = W.lsGet(W.LS_THEME_KEY, '') || '';
    var opts = document.querySelectorAll('.themeopt');
    var i;
    for (i = 0; i < opts.length; i++) {
      var th = opts[i].getAttribute('data-theme') || '';
      if (th === cur) opts[i].classList.add('on');
      else opts[i].classList.remove('on');
    }
  }
  paintOn();
  var opts = document.querySelectorAll('.themeopt');
  var i;
  for (i = 0; i < opts.length; i++) {
    opts[i].addEventListener('click', function () {
      W.ui.applyTheme(this.getAttribute('data-theme') || '');
      paintOn();
    });
  }
};

W.ui.bindSettings = function () {
  var btn = document.getElementById('settingsBtn');
  var panel = document.getElementById('settingsPanel');
  if (!btn || !panel) return;
  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.classList.toggle('drawer-open', open);
  }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  var x = document.getElementById('settingsClose');
  if (x) x.addEventListener('click', function () { setOpen(false); btn.focus(); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.keyCode === 27) && !panel.hidden) setOpen(false);
  });
};

W.ui.toast = function (title, body, kind) {
  var box = document.getElementById('toast');
  if (!box) return;
  var t = document.getElementById('toastTitle');
  var b = document.getElementById('toastBody');
  var s = box.querySelector('s');
  if (t) t.textContent = title || '';
  if (b) b.textContent = body || '';
  box.className = 'show' + (kind === 'ok' ? ' ok' : kind === 'bad' ? ' bad' : kind === 'warn' ? ' warn' : '');
  if (s) { if (kind === 'ok') s.innerHTML = '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-.12em"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'; else s.textContent = (kind === 'warn' || kind === 'bad') ? '!' : '\u2022'; }
  clearTimeout(W.ui._toastT);
  W.ui._toastT = setTimeout(function () { box.className = ''; }, 5000);
};


W.ui.bindPowerTiles = function () {
  var roots = document.querySelectorAll('.power-tiles');
  if (!roots.length) return;
  var onPower = function (ev) {
    var rootEl = ev.currentTarget;
    var btn = ev.target;
    while (btn && btn !== rootEl && !(btn.tagName === 'BUTTON' && btn.getAttribute('data-power'))) {
      btn = btn.parentNode;
    }
    if (!btn || btn === rootEl || btn.disabled) return;
    if (ev && ev.preventDefault) ev.preventDefault();
    var cmd = btn.getAttribute('data-power');
    if (!cmd) return;
    var elfName = (cmd === 'off' || cmd === 'poweroff') ? 'poweroff.elf'
      : (cmd === 'reboot') ? 'reboot.elf'
      : (cmd === 'rest' || cmd === 'suspend') ? 'suspend.elf'
      : '';
    if (!elfName) return;
    btn.disabled = true;
    var fileUrl = 'file:///data/wkal/' + elfName;
    try { if (W.uiLog) W.uiLog('Power: ' + fileUrl + ' -> :9021/?uri=', 'info'); } catch (eL) {}
    /* After JB, Store :1022 is down. elfldr loads the install-time file. */
    try {
      var img = new Image();
      img.src = 'http://127.0.0.1:9021/?uri=' + encodeURIComponent(fileUrl) + '&t=' + Date.now();
    } catch (eImg) {}
    /* Optional: if Store HTTP is still up, also notify + native send. */
    try {
      var x = new XMLHttpRequest();
      x.open('GET', 'http://127.0.0.1:1022/api/power?cmd=' + encodeURIComponent(cmd) + '&t=' + Date.now(), true);
      x.timeout = 2500;
      x.send();
    } catch (eN) {}
    setTimeout(function () {
      try { if (W.setPowerTilesEnabled) W.setPowerTilesEnabled(true); } catch (eR) {}
    }, 8000);
  };
  for (var i = 0; i < roots.length; i++) {
    var rootEl = roots[i];
    if (rootEl.getAttribute('data-bound') === '1') continue;
    rootEl.setAttribute('data-bound', '1');
    try {
      var svgs = rootEl.querySelectorAll('svg');
      for (var si = 0; si < svgs.length; si++) svgs[si].style.pointerEvents = 'none';
    } catch (eSvg) {}
    rootEl.addEventListener('click', onPower);
    rootEl.addEventListener('touchend', onPower, false);
  }
};



W.ui.bindToast = function () {
  var x = document.getElementById('toastx');
  if (x) x.onclick = function () {
    var box = document.getElementById('toast');
    if (box) box.className = '';
  };
};

W.ui.soundOn = function () { return false; };

W.ui.feedback = function (ok) {
  if (!W.ui.soundOn()) return;
  try {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      var ctx = W.ui._ac || (W.ui._ac = new Ctx());
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = ok ? 880 : 220;
      g.gain.value = 0.06;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      setTimeout(function () { try { o.stop(); } catch (e) {} }, ok ? 140 : 220);
    }
  } catch (e0) {}
  try {
    if (navigator.getGamepads) {
      var pads = navigator.getGamepads();
      var i, p;
      for (i = 0; i < pads.length; i++) {
        p = pads[i];
        if (p && p.vibrationActuator && p.vibrationActuator.playEffect) {
          p.vibrationActuator.playEffect('dual-rumble', {
            duration: ok ? 80 : 160,
            strongMagnitude: ok ? 0.3 : 0.6,
            weakMagnitude: ok ? 0.2 : 0.5
          });
        }
      }
    }
  } catch (e1) {}
};

W.ui.renderHistory = function () {

  var list = W.els.historyList;
  var empty = W.els.historyEmpty;
  if (!list) return;
  var arr = W.loadHistory();
  list.innerHTML = '';
  if (!arr.length) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  var i, e, row, left, right, cls, when, dur, chain, ds, cs;
  for (i = 0; i < Math.min(arr.length, 6); i++) {
    e = arr[i];
    row = document.createElement('div');
    row.className = 'hrow';
    left = document.createElement('span');
    left.className = 'hmeta';
    when = '';
    if (e.ts) {
      if (W.formatLocalDateTime) when = W.formatLocalDateTime(e.ts);
      else {
        var dt = new Date(e.ts), p2 = function (n) { return (n < 10 ? '0' : '') + n; };
        if (!isNaN(dt.getTime())) {
          when = p2(dt.getMonth() + 1) + '-' + p2(dt.getDate())
            + ' ' + p2(dt.getHours()) + ':' + p2(dt.getMinutes()) + ':' + p2(dt.getSeconds());
        }
      }
    }
    if (when) {
      ds = document.createElement('span');
      ds.className = 'hdate';
      ds.textContent = when;
      left.appendChild(ds);
    }
    
    right = document.createElement('span');
    cls = e.result === 'ok' ? 'ok' : e.result === 'hang' ? 'hang' : 'fail';
    right.className = cls + ' hdur';
    dur = (e.duration && String(e.duration)) || (e.ms != null && W.formatElapsed ? W.formatElapsed(e.ms) : (e.ms != null ? (e.ms + 'ms') : ''));
    right.textContent = (e.result === 'ok' ? 'OK' : e.result === 'hang' ? 'STALL' : 'FAIL')
      + (dur ? ('  ' + dur) : '');
    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  }

};

W.ui.renderHomeInfo = function () {
  var set = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = v || '-'; };
  var fw = null, chain = null;
  try { fw = W.detectFirmware(); } catch (e) {}
  try {
    if (!fw || W.recommendChain(fw)) {
      chain = W.state && W.state.exploitMode ? W.state.exploitMode : W.getChainPref();
    }
  } catch (e2) {}
  set('hiFw', fw && fw.str ? fw.str : '-');
  set('hiChain', chain ? chain.charAt(0).toUpperCase() + chain.slice(1) : '-');
  set('ldFw', fw && fw.str ? fw.str : '-');
  set('ldChain', chain ? chain.charAt(0).toUpperCase() + chain.slice(1) : '-');

  /* Model: live  ->  cached CFI. Never '-' if we have a saved value. */
  var showModel = function (raw) {
    var p = raw ? W.parseCfi(raw) : null;
    if (!p && W.getCachedCfi) p = W.getCachedCfi();
    var label = '';
    if (p) {
      if (p.kind !== 'PS5') label = p.code + ' \u00b7 ' + p.kind + (p.media && p.kind !== 'Pro' ? ' ' + p.media : '');
      else label = p.code || '';
    } else if (raw) label = String(raw).slice(0, 32);
    else {
      var rawCached = W.lsGet(W.LS_CFI_KEY, '') || '';
      if (rawCached) label = String(rawCached).slice(0, 32);
    }
    set('hiModel', label || '-');
    set('ldModel', label || '-');
  };
  if (W.state && W.state.hwModel) showModel(W.state.hwModel);
  else showModel('');

  /* IP: live  ->  localStorage. Never '-' if saved. */
  var ip = (W.state && W.state.lanIp) ? W.state.lanIp : (W.lsGet(W.LS_IP_KEY, '') || '');
  set('hiIp', ip || '-');
  set('ldIp', ip || '-');

  /* Live fill: prefer Elf Launcher :1000 (after JB), then Store :1022. */
  if (!W.ui._consoleInfoAsked) {
    W.ui._consoleInfoAsked = true;
    W.ui._sysinfoAsked = true;
    W.ui._netinfoAsked = true;
    function applyModel(m) {
      if (!m) return;
      if (W.state) W.state.hwModel = m;
      if (W.parseCfi(m)) W.setCachedCfi(m); else W.lsSet(W.LS_CFI_KEY, m);
      showModel(m);
    }
    function applyIp(ip) {
      if (!ip || !/^\d+\.\d+\.\d+\.\d+$/.test(ip) || ip.indexOf('127.') === 0) return;
      if (W.state) W.state.lanIp = ip;
      W.lsSet(W.LS_IP_KEY, ip);
      set('hiIp', ip); set('ldIp', ip);
      try {
        if (W.state && W.state.progressDone && W.showJbOkToast) W.showJbOkToast(ip);
      } catch (eIpT) {}
    }
    function xhrJson(url, onok) {
      try {
        var x = new XMLHttpRequest();
        x.open('GET', url, true);
        x.timeout = 3000;
        x.onload = function () {
          try { onok(JSON.parse(x.responseText || '{}')); } catch (e0) {}
        };
        x.send();
      } catch (e1) {}
    }
    xhrJson('http://127.0.0.1:9021/sysinfo?t=' + Date.now(), function (j) {
      if (!j) return;
      var m = '';
      if (typeof j.model === 'string') m = j.model;
      else if (typeof j.cfi === 'string') m = j.cfi;
      m = String(m || '').replace(/[^\x20-\x7e]/g, '').trim();
      applyModel(m);
      if (j.ip) applyIp(j.ip);
    });
    xhrJson('http://127.0.0.1:1000/sysinfo?t=' + Date.now(), function (j) {
      if (!j) return;
      var m = '';
      if (typeof j.model === 'string') m = j.model;
      else if (typeof j.cfi === 'string') m = j.cfi;
      else if (typeof j.consoleModel === 'string') m = j.consoleModel;
      else if (typeof j.hwModel === 'string') m = j.hwModel;
      m = String(m || '').replace(/[^\x20-\x7e]/g, '').trim();
      if (!m) {
        try {
          var blob = JSON.stringify(j);
          var mm = blob.match(/CFI-?\d{4}[A-Z0-9]*/i);
          if (mm) m = mm[0];
        } catch (e2) {}
      }
      applyModel(m);
      if (j.ip) applyIp(j.ip);
    });
    xhrJson('http://127.0.0.1:1000/ip?t=' + Date.now(), function (j) {
      if (j) applyIp(j.ip || j.address || '');
    });
    xhrJson('http://127.0.0.1:1022/api/sysinfo?t=' + Date.now(), function (j) {
      if (!j) return;
      var m = typeof j.model === 'string' ? j.model.replace(/[^\x20-\x7e]/g, '').trim() : '';
      applyModel(m);
      if (j.ip) applyIp(j.ip);
    });
    xhrJson('http://127.0.0.1:1022/api/netinfo?t=' + Date.now(), function (j) {
      if (j) applyIp(j.ip || '');
    });
  }
  var a = document.getElementById('autoJailbreak');
  set('hiAuto', a ? (a.checked ? 'On' : 'Off') : '-');
};

W.ui.syncChainUi = function () {
  try { W.ui.renderHomeInfo(); } catch (eh) {}
  var fw = W.detectFirmware();
  var pref = W.getChainPref();
  var rec = fw ? W.recommendChain(fw) : null;
  var chip = W.els.detectChip;
  var unsup = W.els.unsupportedMsg;
  var umtx = document.getElementById('chainUmtx2');
  var poops = document.getElementById('chainPoops');
  var relapse = document.getElementById('chainRelapse');
  var wobkot = document.getElementById('chainWobkot');
  var auto = document.getElementById('chainAuto');
  var hint = W.els.chainHint;
  var start = document.getElementById('startJailbreak');

  /* Always show every chain with its FW range; grey out the ones that
   * cannot run on the detected firmware (unknown FW = leave all enabled). */
  function gate(btn, chain) {
    if (!btn) return;
    var ok = !fw || W.fwSupports(chain, fw);
    btn.hidden = false;
    btn.disabled = !ok;
    btn.setAttribute('aria-disabled', ok ? 'false' : 'true');
    btn.title = ok ? '' : W.t('chainOff');
    if (ok) btn.classList.remove('off'); else btn.classList.add('off');
  }
  /* umtx2 / Poops removed from UI; never show. */
  if (umtx) { umtx.hidden = true; umtx.disabled = true; }
  gate(relapse, 'relapse');
  gate(wobkot, 'wobkot');
  if (poops) { poops.hidden = true; poops.disabled = true; }
  if (auto) { auto.hidden = true; auto.disabled = true; }

  var opts = document.querySelectorAll('#chainRow .opt');
  var i;
  for (i = 0; i < opts.length; i++) {
    var c = opts[i].getAttribute('data-chain');
    if (c === pref) opts[i].classList.add('on');
    else opts[i].classList.remove('on');
  }

  var unsupported = fw && fw.num >= 6.0 && fw.num < 7.0;
  if (unsup) unsup.hidden = !unsupported;
  if (start) start.disabled = !!unsupported || W.state.chainStarted;

  if (chip) {
    if (!fw) {
      chip.textContent = W.t('consoleNotDetected');
      chip.className = 'chip bad';
    } else if (unsupported) {
      chip.textContent = W.t('fwUnsupported', { fw: fw.str });
      chip.className = 'chip bad';
    } else {
      var show = pref === 'auto' ? (rec || 'auto') : pref;
      var cfi = W.getCachedCfi && W.getCachedCfi();
      if (cfi) {
        chip.textContent = W.t('fwModelChain', {
          fw: fw.str,
          model: cfi.code + '  ·  ' + cfi.label,
          chain: W.formatChainLabel(show)
        });
        chip.title = cfi.code + '  ·  ' + cfi.label;
      } else {
        chip.textContent = W.t('fwChain', {
          fw: fw.str,
          chain: W.formatChainLabel(show)
        });
        chip.title = '';
      }
      chip.className = 'chip ok';
    }
  }
  if (hint) {
    if (pref === 'auto' && rec) hint.textContent = W.t('chainAutoPicks', { chain: W.formatChainLabel(rec) });
    else if (pref === 'poops') hint.textContent = W.t('chainPoopsHint');
    else if (pref === 'relapse') hint.textContent = W.t('chainRelapseHint');
    else if (pref === 'wobkot') hint.textContent = W.t('chainWobkotHint');
    else if (pref === 'umtx2') hint.textContent = W.t('chainUmtx2Desc');
    else hint.textContent = '';
  }
  /* Prefetch recommended chain entry for faster arm (no exploit run). */
  if (rec) W.preloadChainFiles(rec);
};

W.ui.showStall = function (allowRestart) {
  var el = W.els.stallMsg;
  if (!el) return;
  el.hidden = false;
  el.innerHTML = '';
  var p = document.createElement('p');
  p.textContent = W.t('stallHint');
  el.appendChild(p);
  if (allowRestart) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'restart';
    btn.textContent = W.t('restartPage');
    btn.onclick = function () { try { location.reload(); } catch (e) {} };
    el.appendChild(btn);
  } else {
    var p2 = document.createElement('p');
    p2.className = 'hint';
    p2.textContent = W.t('stallSensitive');
    el.appendChild(p2);
  }
  W.recordRun('hang');
};

W.ui.hideStall = function () {
  var el = W.els.stallMsg;
  if (el) { el.hidden = true; el.innerHTML = ''; }
};


W.ui.refreshCfiFromLauncher = function () {
  if (W.persistCfiFromLauncher) W.persistCfiFromLauncher(function () {});
};

W.ui.bindHome = function () {
  if (!W.state.pageReadyAt) W.state.pageReadyAt = Date.now();
  if (W.ui.bindSettings) W.ui.bindSettings();
  var go = document.getElementById('startJailbreak');
  var cancel = document.getElementById('cancelAutoStart');
  var auto = document.getElementById('autoJailbreak');
  var delay = document.getElementById('startDelay');
  var retry = document.getElementById('retryCount');
  var delayVal = document.getElementById('startDelayVal');
  var retryVal = document.getElementById('retryCountVal');
  var sound = document.getElementById('soundToggle');
  var openOnly = document.getElementById('openLauncherOnly');
  var autoTimer = 0;
  var remaining = 0;
  var delayCur = 0;

  function delaySec() {
    var n = parseFloat(delayCur);
    if (isNaN(n)) n = 0;
    return Math.round(Math.min(3, Math.max(0, n)));
  }
  function retryN() {
    var n = retry ? parseInt(retry.value, 10) : 1;
    if (isNaN(n) || n < 0) n = 0;
    if (n > 3) n = 3;
    return n;
  }
  function paintSliders() {
    if (delay) {
      var db = delay.querySelectorAll('.opt[data-delay]'), k;
      for (k = 0; k < db.length; k++) {
        if (Number(db[k].getAttribute('data-delay')) === delaySec()) db[k].classList.add('on');
        else db[k].classList.remove('on');
      }
    }
    if (retryVal) retryVal.textContent = String(retryN());
  }

  /* Auto-start ON by default (first visit). */
  var savedAuto = W.lsGet(W.LS_AUTO_KEY, '1');
  if (auto) auto.checked = savedAuto !== '0';
  function paintAuto() {
    var tile = document.getElementById('autoStartTile');
    var st = document.getElementById('autoStartState');
    var on = !!(auto && auto.checked);
    if (tile) { if (on) tile.classList.add('on'); else tile.classList.remove('on'); }
    if (st) st.textContent = on ? 'On' : 'Off';
    try { W.ui.renderHomeInfo(); } catch (eh) {}
  }
  paintAuto();
  var rejb = document.getElementById('rejbConfirm');
  if (rejb) {
    rejb.checked = W.lsGet(W.LS_REJB_KEY, '0') === '1';
    paintRejb();
    rejb.addEventListener('change', function () {
      W.lsSet(W.LS_REJB_KEY, rejb.checked ? '1' : '0');
      paintRejb();
      if (W.state.alreadyJailbroken) markAlreadyJailbroken();
    });
  }
  if (delay) { var dv = parseFloat(W.lsGet(W.LS_DELAY_KEY, '0')); if (isNaN(dv)) dv = 3; delayCur = Math.round(Math.min(3, Math.max(0, dv))); }
  if (retry) { var rv = parseInt(W.lsGet(W.LS_RETRY_KEY, '1'), 10); if (isNaN(rv)) rv = 1; retry.value = String(Math.min(3, Math.max(0, rv))); }
  if (sound) sound.checked = W.ui.soundOn();
  paintSliders();

  function cancelCountdown() {
    if (autoTimer) { clearInterval(autoTimer); autoTimer = 0; }
    W.state.runStage = 'idle';
    if (go && !W.state.chainStarted) {
      go.disabled = false;
      go.classList.remove('is-cancel');
      go.textContent = W.t('startJailbreak');
    }
    if (cancel) cancel.hidden = true;
    if (W.els.countdownHint) W.els.countdownHint.textContent = '';
  }


  /* AppCache must be fully ready before JB. Never arm iframe/startElapsed while
     UNCACHED/CHECKING/DOWNLOADING. No blind timeout that starts JB anyway. */
  function setCacheWaitUi(on, detail) {
    try {
      var box = document.getElementById('cacheFill');
      var pctEl = document.getElementById('cacheFillPct');
      var barEl = document.getElementById('cacheFillBar');
      var subEl = document.getElementById('cacheFillSub');
      if (box) box.hidden = true; /* never show Preparing modal */
      if (on) {
        if (pctEl && !pctEl.textContent) pctEl.textContent = '...';
        if (subEl) subEl.textContent = detail || 'Waiting for cache before jailbreak...';
        if (barEl && !barEl.style.width) barEl.style.width = '2%';
      }
      if (go && on) {
        go.disabled = true;
        go.classList.remove('is-cancel');
        go.textContent = detail || (W.t('caching') || 'Caching...');
      }
      if (W.els && W.els.countdownHint) {
        W.els.countdownHint.textContent = on ? (detail || 'Cache must finish before jailbreak') : '';
      }
    } catch (eUi) {}
  }

  function whenAppCacheReady(done) {
    var ac = null;
    try { ac = (typeof applicationCache !== 'undefined') ? applicationCache : null; } catch (e0) { ac = null; }
    /* No html manifest (GitHub Pages host): start immediately. */
    try {
      var man = document.documentElement && document.documentElement.getAttribute('manifest');
      if (!man) { setCacheWaitUi(false); done(); return; }
    } catch (eMan) {}
    /* No AppCache API (PC preview): allow start. */
    if (!ac) { done(); return; }
    var st = -1;
    try { st = ac.status; } catch (e1) { setCacheWaitUi(true, 'Cache status unknown  -  waiting...'); return; }
    /* 1=IDLE already cached and quiet. */
    if (st === 1) {
      setCacheWaitUi(false);
      done();
      return;
    }
    /* 4=UPDATEREADY: swap into the new cache, then start. */
    if (st === 4) {
      try { ac.swapCache(); } catch (eSwap) {}
      setCacheWaitUi(false);
      done();
      return;
    }
    /* 0=UNCACHED 2=CHECKING 3=DOWNLOADING 5=OBSOLETE  -  wait for a real ready event.
       Never start JB on a timer alone. */
    var finished = false;
    function finishOk(why) {
      if (finished) return;
      finished = true;
      setCacheWaitUi(false);
      try { if (W.uiLog) W.uiLog('[boot] AppCache ready (' + why + ') - starting chain', 'info'); } catch (e2) {}
      done();
    }
    function keepWaiting(why) {
      try { if (W.uiLog) W.uiLog('[boot] AppCache not ready: ' + why, 'warning'); } catch (e3) {}
      setCacheWaitUi(true, 'Cache not ready  -  keep this page open');
    }
    setCacheWaitUi(true, st === 0 ? 'Loading cache before jailbreak...' : 'Caching files before jailbreak...');
    try { if (W.uiLog) W.uiLog('[boot] waiting for AppCache (status=' + st + ')', 'info'); } catch (e4) {}
    /* Soft nudge only: remind UI / poll IDLE; never call done() from a timeout. */
    var nudge = setInterval(function () {
      if (finished) { clearInterval(nudge); return; }
      var cur = -1;
      try { cur = ac.status; } catch (e5) { return; }
      if (cur === 1) { clearInterval(nudge); finishOk('idle-poll'); return; }
      if (cur === 4) {
        clearInterval(nudge);
        try { ac.swapCache(); } catch (eSwap2) {}
        finishOk('updateready-poll');
        return;
      }
      setCacheWaitUi(true, 'Still caching  -  jailbreak waits...');
    }, 1500);
    try {
      ac.addEventListener('cached', function () { clearInterval(nudge); finishOk('cached'); }, false);
      ac.addEventListener('noupdate', function () { clearInterval(nudge); finishOk('noupdate'); }, false);
      ac.addEventListener('updateready', function () {
        try { ac.swapCache(); } catch (eSwap3) {}
        clearInterval(nudge);
        finishOk('updateready');
      }, false);
      ac.addEventListener('progress', function (e) {
        try {
          var box = document.getElementById('cacheFill');
          var pctEl = document.getElementById('cacheFillPct');
          var barEl = document.getElementById('cacheFillBar');
          var subEl = document.getElementById('cacheFillSub');
          var p = 0;
          if (e && e.total > 0) p = Math.floor((e.loaded * 100) / e.total);
          else if (e && e.loaded > 0) p = Math.min(99, Math.floor(e.loaded));
          if (box) box.hidden = false;
          if (pctEl) pctEl.textContent = p + '%';
          if (barEl) barEl.style.width = p + '%';
          if (subEl) subEl.textContent = 'Caching before jailbreak...';
          if (go) { go.disabled = true; go.textContent = 'Cache ' + p + '%'; }
        } catch (eP) {}
      }, false);
      ac.addEventListener('error', function () { keepWaiting('error'); }, false);
      ac.addEventListener('obsolete', function () { keepWaiting('obsolete'); }, false);
    } catch (e6) {
      keepWaiting('listener-failed');
    }
  }

  function beginJailbreak() {
    if (W.state.chainStarted) return;
    cancelCountdown();
    if (go) { go.disabled = true; go.classList.remove('is-cancel'); go.textContent = W.t('caching') || 'Waiting for cache...'; }
    W.state.safeRetryLeft = retryN();
    W.state.launcherChoice = W.getLauncherChoice ? W.getLauncherChoice() : W.CHOICE_ELF_LAUNCHER;
    whenAppCacheReady(function () { if (go) { go.disabled = true; go.textContent = W.t('starting') || 'Starting...'; } if (W.start) W.start(); });
  }

  function rejbOn() {
    return !!(document.getElementById('rejbConfirm') && document.getElementById('rejbConfirm').checked);
  }
  function paintRejb() {
    var tile = document.getElementById('rejbTile');
    var st = document.getElementById('rejbState');
    var on = rejbOn();
    if (tile) { if (on) tile.classList.add('on'); else tile.classList.remove('on'); }
    if (st) st.textContent = on ? 'On' : 'Off';
  }
  function markAlreadyJailbroken() {
  W.state.alreadyJailbroken = true;
  try { if (W.setPowerTilesEnabled) W.setPowerTilesEnabled(true); } catch (ePw) {}
    cancelCountdown();
    if (go) {
      if (rejbOn()) {
        go.disabled = false;
        go.classList.remove('is-cancel');
        go.textContent = W.t('jailbreakAgain') || 'Jailbreak again';
      } else {
        go.disabled = true;
        go.classList.remove('is-cancel');
        go.textContent = W.t('alreadyJailbroken');
      }
    }
    if (openOnly) openOnly.hidden = false;
    try { W.uiLog(W.t('alreadyJailbroken'), 'success'); } catch (eAj) {}
  }

  function startCountdown() {
    if (W.state.alreadyJailbroken && !rejbOn()) { markAlreadyJailbroken(); return; }
    if (W.state.alreadyJailbroken && rejbOn()) {
      var ok = true;
      try { ok = window.confirm(W.t('rejbConfirmPrompt') || 'Run jailbreak again?'); } catch (eC) { ok = true; }
      if (!ok) return;
      W.state.alreadyJailbroken = false;
    }
    if (W.state.chainStarted || autoTimer || !go) return;
    var fw = W.detectFirmware();
    if (fw && fw.num >= 6.0 && fw.num < 7.0) return;
    remaining = delaySec();
    W.state.runStage = 'countdown';
        if (remaining <= 0) {
      /* Delay 0: still give WebKit a short settle after page load, otherwise auto-start fails. */
      cancelCountdown();
      if (go) { go.disabled = true; go.classList.remove("is-cancel"); go.textContent = W.t("caching") || "Waiting for cache..."; }
      W.state.safeRetryLeft = retryN();
      W.state.launcherChoice = W.getLauncherChoice ? W.getLauncherChoice() : W.CHOICE_ELF_LAUNCHER;
      var readyAt = W.state.pageReadyAt || Date.now();
      var settleMs = Math.max(0, 1000 - (Date.now() - readyAt));
      setTimeout(function () {
        whenAppCacheReady(function () { if (go) { go.disabled = true; go.textContent = W.t('starting') || 'Starting...'; } if (W.start) W.start(); });
      }, settleMs);
      return;
    }
    go.disabled = false;
    go.classList.add('is-cancel');
    go.textContent = W.t('cancel') + '  ·  ' + remaining;
    if (cancel) cancel.hidden = true;
    if (W.els.countdownHint) W.els.countdownHint.textContent = '';
    autoTimer = setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(autoTimer); autoTimer = 0;
        if (cancel) cancel.hidden = true;
        beginJailbreak();
        return;
      }
      go.textContent = W.t('cancel') + '  ·  ' + remaining;
    }, 1000);
  }

  var chainBtns = document.querySelectorAll('#chainRow .opt');
  var i;
  for (i = 0; i < chainBtns.length; i++) {
    chainBtns[i].addEventListener('click', function () {
      var c = this.getAttribute('data-chain') || 'relapse';
      if (this.disabled) return;
      W.setChainPref(c);
      W.ui.syncChainUi();
    });
  }
  if (auto) auto.addEventListener('change', function () {
    W.lsSet(W.LS_AUTO_KEY, auto.checked ? '1' : '0');
    paintAuto();
    if (auto.checked) startCountdown();
    else cancelCountdown();
  });
  function onDelayMove() {
    W.lsSet(W.LS_DELAY_KEY, String(delaySec()));
    paintSliders();
  }
  function onRetryMove() {
    W.lsSet(W.LS_RETRY_KEY, String(retryN()));
    paintSliders();
  }
  if (delay) {
    delay.addEventListener('click', function (ev) {
      var b = ev.target;
      while (b && b !== delay && !(b.getAttribute && b.getAttribute('data-delay'))) b = b.parentNode;
      if (!b || b === delay) return;
      delayCur = Number(b.getAttribute('data-delay'));
      if (isNaN(delayCur)) delayCur = 0;
      onDelayMove();
    });
  }
  if (retry) {
    retry.addEventListener('input', onRetryMove);
    retry.addEventListener('change', onRetryMove);
    retry.addEventListener('mousemove', onRetryMove);
    retry.addEventListener('touchmove', onRetryMove);
  }
  if (sound) sound.addEventListener('change', function () {
    W.lsSet(W.LS_SOUND_KEY, sound.checked ? '1' : '0');
  });
  if (cancel) cancel.addEventListener('click', cancelCountdown);
  if (go) {
    var goLock = 0;
    function onGo(e) {
      if (goLock) return;
      goLock = 1;
      setTimeout(function () { goLock = 0; }, 400);
      if (e) {
        try { e.preventDefault(); } catch (e0) {}
        try { e.stopPropagation(); } catch (e1) {}
      }
      if (W.state.chainStarted) return;
      /* Same button: Start -> Cancel during countdown -> Start. */
      if (autoTimer) { cancelCountdown(); return; }
      startCountdown();
    }
    /* Click only: mousedown+click both fired onGo and cancelled the countdown. */
    go.onclick = onGo;
    go.onmousedown = null;
    go.ontouchend = null;
  }
  if (openOnly) {
    openOnly.onclick = function () {
      if (W.launcher && W.launcher.openNow) W.launcher.openNow();
    };
  }

  if (W.detectCfiPreJb) W.detectCfiPreJb();
  W.ui.syncChainUi();
  W.ui.renderHistory();

  /* Quick non-blocking probe: if Elf already up, show Open button.
     If elfldr (:9021) or Elf Launcher (:1000) answers, console is already
     jailbroken  -  do not auto-run the exploit. */
  function afterProbe(elfUp, ldrUp) {
    if (openOnly) openOnly.hidden = !elfUp;
    if (elfUp || ldrUp) try { W.ui.refreshCfiFromLauncher(); } catch (eC) {}
    if (elfUp || ldrUp) { markAlreadyJailbroken(); return; }
    if (auto && auto.checked) startCountdown();
  }
  if (W.launcher && (W.launcher.probeQuick || W.launcher.probeElfldr)) {
    var got = 0, elfUp = false, ldrUp = false;
    function one() {
      got += 1;
      if (got >= 2) afterProbe(elfUp, ldrUp);
    }
    if (W.launcher.probeQuick) W.launcher.probeQuick(function (up) { elfUp = !!up; one(); });
    else one();
    if (W.launcher.probeElfldr) W.launcher.probeElfldr(function (up) { ldrUp = !!up; one(); });
    else one();
  } else if (auto && auto.checked) {
    startCountdown();
  }

  W.ui._cancelCountdown = cancelCountdown;
  W.ui._startCountdown = startCountdown;
};

W.ui.applyLauncherChoice = function (choice) {
  var isPm = choice === W.CHOICE_PAYLOAD_MANAGER;
  var pickElf = document.getElementById('pickElf');
  var pickPm = document.getElementById('pickPm');
  var sub = document.getElementById('homeSubShort');
  var heroIco = document.getElementById('heroIco');
  if (pickElf) {
    if (isPm) pickElf.classList.remove('on');
    else pickElf.classList.add('on');
  }
  if (pickPm) {
    if (isPm) pickPm.classList.add('on');
    else pickPm.classList.remove('on');
  }
  if (sub) {
    if (isPm) {
      sub.removeAttribute('data-i18n');
      sub.textContent = (W.t('afterJb') || 'After jailbreak, open') + ' ' + (W.t('payloadManager') || 'Payload Manager');
    } else {
      sub.setAttribute('data-i18n', 'homeSubShort');
      sub.textContent = W.t('homeSubShort') || 'Then opens Elf Launcher';
    }
  }
  if (heroIco) heroIco.src = 'elf-launcher-icon.png';
  var oo = document.getElementById('openLauncherOnly');
  if (oo && !isPm) {
    /* keep existing probe-driven visibility for Elf Launcher */
  } else if (oo && isPm) {
    oo.hidden = true;
  }
};

W.ui.bindLauncherChoice = function () {
  var pickElf = document.getElementById('pickElf');
  var pickPm = document.getElementById('pickPm');
  function bind(el, choice) {
    if (!el) return;
    function pick(e) {
      if (e) {
        try { e.preventDefault(); } catch (e0) {}
        try { e.stopPropagation(); } catch (e1) {}
      }
      W.setLauncherChoice(choice);
    }
    /* Click only: mousedown+click double-fires on PS5 WebKit. */
    el.onclick = pick;
    el.onmousedown = null;
    el.ontouchend = null;
  }
  bind(pickElf, W.CHOICE_ELF_LAUNCHER);
  bind(pickPm, W.CHOICE_PAYLOAD_MANAGER);
  W.ui.applyLauncherChoice(W.getLauncherChoice());
};
})(typeof window !== 'undefined' ? window : this);