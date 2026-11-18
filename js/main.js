(function (g) {
'use strict';
var W = g.WKAL = g.WKAL || {};

/* Proven startChain timings kept (mirror interval, relapse 12s warn, reveal 500ms). */
W.startChain = function (skipElfSend) {
  try {
    W.resetTiming();
    W.markTiming('jb_start');
  } catch (eT0) {}
  try { if (W.resetElapsed) W.resetElapsed(); } catch (eRt) {}
  W.state.jbSuccessLogged = false;
  if (W.els.statusMsg) { W.els.statusMsg.textContent = ''; W.els.statusMsg.style.display = 'none'; }
  W.updateProgress(0, W.t('jailbreakStarted'));
  W.startProgressDriver();
  /* startElapsed armed after iframe request */
  W.startStallWatch();
  W.state.runStage = 'early';

  W.state.autoloadPending = true;
  W.state.finished = false;
  W.state.progressDone = false;
  W.state.launcherHttpOpenStarted = false;
  W.state.payloadLoadingShown = false;
  try { if (W.uiSetPayload) { W.uiSetPayload('plElfldr', 'WAIT', false); W.uiSetPayload('plLauncher', 'WAIT', false); } } catch (ePl0) {}

  if (!W.state.autoloadMsgBound) {
    W.state.autoloadMsgBound = true;
    window.addEventListener('message', function (event) {
      var data = event.data;
      if (!data || data.type !== 'wkal') return;
      if (data.kind === 'jb-success') {
        try {
          if (W.freezeElapsed) W.freezeElapsed(data.at);
          W.state.jbSuccessLogged = true;
        } catch (eJb) {}
        return;
      }
      if (data.kind === 'elfldr-ready-ip') {
        try {
          function takeIp(v) {
            if (!v || !/^\d+\.\d+\.\d+\.\d+$/.test(v) || v.indexOf('127.') === 0) return false;
            if (W.state) W.state.lanIp = v;
            try { if (W.lsSet) W.lsSet(W.LS_IP_KEY, v); } catch (e0) {}
            if (W.ui && W.ui.renderHomeInfo) {
              W.ui._consoleInfoAsked = false;
              W.ui.renderHomeInfo();
            }
            return true;
          }
          var ip = data.ip || (W.state && W.state.lanIp) || (W.lsGet && W.lsGet(W.LS_IP_KEY, '')) || '';
          takeIp(ip);
          if (W.persistCfiFromLauncher) W.persistCfiFromLauncher(function () {});
        } catch (eIp) {}
        return;
      }
      if (data.kind === 'autoload') {
        W.state.runStage = 'armed';
        W.launcher.onAutoloadResult(data);
      }
    });
  }

  var fw = W.detectFirmware();
  var picked = W.pickExploit();
  if (!picked) {
    W.setMeta(fw ? fw.str : '-', 'unsupported');
    W.finishProgressFail(W.t('jailbreakFail'));
    return;
  }
  W.state.exploitMode = picked;
  W.setMeta(fw ? fw.str : '-', picked);
  if (W.els.detectChip) {
    W.els.detectChip.textContent = W.t('fwChain', { fw: fw ? fw.str : '-', chain: W.formatChainLabel(picked) });
    W.els.detectChip.className = 'chip ok';
  }

  /* Bootstrap only the installed EL executable after JB. Never run a WK payload queue. */
  W.state.elInstalledFirst = !skipElfSend && !W.state.forceAutoloadName && !W.state.elfHttpAlreadyUp
    && !!(W.elboot && W.elboot.installedFirstOk(picked));
  /* Out-of-chain tip: never put tip/EL in the Relapse chain (wkal-skip). */
  var autoloadName = (skipElfSend || !W.state.forceAutoloadName) ? 'wkal-skip' : W.state.forceAutoloadName;
  if (!W.state.updateOnlyMode && !W.state.pendingSelfUpdate) autoloadName = 'wkal-skip';
  var urls = W.buildExploitUrls(autoloadName);
  W.state.UMTX2_URL = urls.umtx2;
  W.state.P2JB_URL = urls.p2jb;
  W.state.RELAPSE_URL = urls.relapse;
  W.state.WOBKOT_URL = urls.wobkot;
  W.state.POOPS_URL = urls.poops;
  W.state.EXPLOIT_URL = picked === 'umtx2' ? urls.umtx2
    : picked === 'p2jb' ? urls.p2jb
    : picked === 'poops' ? urls.poops
    : picked === 'wobkot' ? urls.wobkot
    : urls.relapse;

  W.uiLog('Chain: ' + picked + ' + elfldr', 'info');

  if (W.els.splash) {
    W.els.splash.classList.add('hide');
    W.els.splash.hidden = true;
    if (W.els.loader) W.els.loader.hidden = false;
  }

  /* Rare scrape = less main-thread work so Relapse can finish closer to ~1s. */
  var mirrorMs = picked === 'p2jb' ? 2500 : 2200;
  function armMirrorTimer(ms) {
    if (W.state.mirrorTimer) {
      clearInterval(W.state.mirrorTimer);
      W.state.mirrorTimer = 0;
    }
    W.state.mirrorTimer = setInterval(function () {
      if (W.mirrors && W.mirrors.mirrorExploit) W.mirrors.mirrorExploit();
      if (W.state.progressPct >= 32 && W.state.runStage === 'early') {
        W.state.runStage = 'armed';
        if (picked === 'relapse' && W.enterKernelQuiet) W.enterKernelQuiet();
      }
      if (picked === 'relapse' && W.state.progressKernelQuiet && mirrorMs < 3000) {
        mirrorMs = 3000;
        armMirrorTimer(mirrorMs);
      }
    }, ms);
  }
  armMirrorTimer(mirrorMs);

  try {
    if (picked === 'umtx2') {
      sessionStorage.setItem('on_load_autorun', 'kernel');
      sessionStorage.setItem('wkal_autoload', autoloadName);
    } else if (picked === 'relapse') {
      sessionStorage.removeItem('on_load_autorun');
      sessionStorage.setItem('wkal_autoload', autoloadName);
    } else if (picked === 'poops') {
      sessionStorage.removeItem('on_load_autorun');
      sessionStorage.setItem('wkal_autoload', autoloadName);
      W.clearSlopkitState();
    } else if (picked === 'wobkot') {
      sessionStorage.removeItem('on_load_autorun');
      sessionStorage.setItem('wkal_autoload', autoloadName);
    } else {
      sessionStorage.removeItem('on_load_autorun');
      sessionStorage.removeItem('wkal_autoload');
    }
  } catch (e) {}

  W.state.chainStarted = true;
  if (picked === 'p2jb') W.clearSlopkitState();
  /* Wobkot spray ~8MB OOMs under Store iframe. Run top-level on slim page,
     then tip EL / return to Store. Relapse stays in the hidden iframe. */
  try {
    if (picked === 'wobkot') {
      try { if (W.startElapsed) W.startElapsed(); } catch (ePe0) {}
      if (W.bumpProgressFloor) W.bumpProgressFloor(5);
      W.uiLog('Starting WebKit / Wobkot', 'info');
      try { W.markTiming('iframe_request'); } catch (eR0) {}
      location.assign(W.state.EXPLOIT_URL);
      return;
    }
    if (!W.els.exploit) throw new Error('missing #exploit iframe');
    try {
      W.els.exploit.onload = function () {
        try { W.markTiming('iframe_load'); } catch (eL) {}
      };
    } catch (eOn) {}
    if (picked === 'wobkot') {
      try {
        /* Drop heavy Store UI bits so Wobkot spray has room in the shared process. */
        var lw = document.getElementById('logWrapper');
        if (lw) { lw.innerHTML = ''; lw.hidden = true; }
        if (W.els && W.els.logContainer) W.els.logContainer.innerHTML = '';
        try { if (globalThis.gc) globalThis.gc(); } catch (eG) {}
      } catch (eFree) {}
    }
    W.els.exploit.src = W.state.EXPLOIT_URL;
    try { W.markTiming('iframe_request'); } catch (eR) {}
    try { if (W.startElapsed) W.startElapsed(); } catch (ePe) {}
    if (W.bumpProgressFloor) W.bumpProgressFloor(5);
    W.uiLog('Starting WebKit / ' + (picked === 'wobkot' ? 'Wobkot' : 'Relapse') + ' (iframe)', 'info');
  } catch (e2) {
    W.uiLog('Failed to start exploit: ' + (e2 && e2.message ? e2.message : e2), 'error');
    W.finishProgressFail(W.t('jailbreakFail'));
    return;
  }

  if (picked === 'relapse') {
    setTimeout(function () {
      if (W.state.progressDone) return;
      if (W.mirrors && W.mirrors.relapseSawConsole && W.mirrors.relapseSawConsole()) return;
      if (W.mirrors && W.mirrors.setRelapseStatus) {
        W.mirrors.setRelapseStatus('Kernel chain produced no log - iframe or module may have failed to load');
      }
    }, 12000);
  }
};

W.start = function () {
  if (!W.state.pendingSelfUpdate) {
    try {
      var box = document.getElementById('selfupd');
      if (box) box.classList.remove('show');
    } catch (e) {}
  }
  W.state.launcherHttpOpenStarted = false;
  W.state.elfHttpAlreadyUp = false;
  try { if (W.elboot) W.elboot._sent = false; } catch (eSent) {}
  W.state.elInstalledFirst = false;
  W.state.launcherChoice = W.getLauncherChoice ? W.getLauncherChoice() : W.CHOICE_ELF_LAUNCHER;

  if (W.state.pendingSelfUpdate || W.state.updateOnlyMode) {
    W.state.updateOnlyMode = true;
    /* Probe :1000 / force elf-launcher.elf for WK install. */
    W.launcher.probeElfLauncherHttp(function (up) {
      W.state.elfHttpAlreadyUp = !!up;
      if (up) {
        W.uiLog('[update] :1000 up - jailbreak only, WK via Elf Launcher', 'info');
        W.startChain(true);
      } else {
        W.uiLog('[update] :1000 down - send elf-launcher.elf so it can install WK', 'info');
        W.state.forceAutoloadName = 'elf-launcher.elf';
        W.startChain(false);
      }
    });
    return;
  }

  W.state.forceAutoloadName = W.state.forceAutoloadName || '';

  /* Chain = Relapse JB + elfldr only. Tip+open :1000 happens in openCompanionPage after. */
  W.state.elfHttpAlreadyUp = false;
  W.startChain(true);
};

window.wkalAfterLangChange = function () {
  W.ui.syncChainUi();
  var go = document.getElementById('startJailbreak');
  var cancel = document.getElementById('cancelAutoStart');
  if (go && !W.state.chainStarted && !go.disabled) go.textContent = W.t('startJailbreak');
  if (cancel) cancel.textContent = W.t('cancel');
  if (W.state.selfUpdateInfo && W.selfupd && W.selfupd.paint) W.selfupd.paint();
  if (W.ui && W.ui.applyLauncherChoice) W.ui.applyLauncherChoice(W.getLauncherChoice());
};

window.addEventListener('load', function () {
  var t0 = Date.now();
  W.bindEls();
  if (window.WKAL_I18N && typeof window.WKAL_I18N.bindLangUi === 'function') {
    window.WKAL_I18N.bindLangUi();
  }
  W.ui.bindTheme();
  W.ui.bindToast();
  if (W.ui.bindPowerTiles) W.ui.bindPowerTiles();
  /* Choice first so a later bindHome throw cannot leave Start/choice dead. */
  try { if (W.ui.bindLauncherChoice) W.ui.bindLauncherChoice(); } catch (eChoice) {}
  try { W.ui.bindHome(); } catch (eHome) {}
  /* self-update disabled */

  /* Visible version comes from Makefile STORE_VERSION, injected at registry
     build as [[STORE_VERSION_PLACEHOLDER]]. Prefer selfupd.currentAppVersion
     when that script is loaded; otherwise use the injected token. */
  try {
    var ver = (W.selfupd && W.selfupd.currentAppVersion) ? W.selfupd.currentAppVersion() : '';
    if (!ver || String(ver).indexOf('[[') >= 0) ver = '[[STORE_VERSION_PLACEHOLDER]]';
    var appVer = document.getElementById('appVer');
    var storeVer = document.getElementById('storeVer');
    if (ver && String(ver).indexOf('[[') < 0) {
      if (appVer) appVer.textContent = 'v' + ver;
      if (storeVer) storeVer.textContent = 'v' + ver;
    }
  } catch (eV) {}

  /* self-update check disabled */
  /* First-open AppCache fill: show percent while downloading. */
  (function bindCacheFill() {
    var box = document.getElementById('cacheFill');
    var pctEl = document.getElementById('cacheFillPct');
    var barEl = document.getElementById('cacheFillBar');
    var subEl = document.getElementById('cacheFillSub');
    if (!box || !pctEl || !barEl) return;
    var ac = null;
    try { ac = (typeof applicationCache !== 'undefined') ? applicationCache : null; } catch (e0) { return; }
    if (!ac) return;
    var best = 0;
    function paint(p, sub) {
      if (p < best) p = best; else best = p;
      p = Math.max(0, Math.min(100, p | 0));
      pctEl.textContent = p + '%';
      barEl.style.width = p + '%';
      if (sub && subEl) subEl.textContent = sub;
      box.hidden = false;
    }
    function hide() { box.hidden = true; }
    function onProgress(e) {
      var p = 0;
      try {
        if (e && e.total > 0) p = Math.floor((e.loaded * 100) / e.total);
        else if (e && e.loaded > 0) p = Math.min(99, Math.floor(e.loaded));
      } catch (e1) {}
      paint(p, 'Caching files...');
    }
    try {
      ac.addEventListener('checking', function () { paint(Math.max(best, 1), 'Checking cache...'); }, false);
      ac.addEventListener('downloading', function () { paint(Math.max(best, 2), 'Downloading...'); }, false);
      ac.addEventListener('progress', onProgress, false);
      ac.addEventListener('cached', function () { paint(100, 'Ready'); setTimeout(hide, 350); }, false);
      ac.addEventListener('noupdate', hide, false);
      ac.addEventListener('updateready', function () { paint(100, 'Ready'); setTimeout(hide, 350); }, false);
      ac.addEventListener('error', hide, false);
      ac.addEventListener('obsolete', hide, false);
      if (ac.status === 2 || ac.status === 3) paint(Math.max(best, 1), 'Caching...');
    } catch (e2) {}
  })();

  try {
    var ac = (typeof applicationCache !== 'undefined') ? applicationCache : null;
    var st = ac ? ac.status : -1;
    W.uiLog('[boot] ui ready in ' + (Date.now() - t0) + 'ms; AppCache status=' + st
      + (st === 1 ? ' (IDLE/cached)' : ''), 'info');
  } catch (e) {}

  try {
    if (W.maybeResumeAfterWobkot && W.maybeResumeAfterWobkot()) return;
  } catch (ePost) {}
});

/* After Wobkot top-level return: resume Elf Launcher tip like Relapse. */
W.maybeResumeAfterWobkot = function () {
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('postjb') !== '1') return false;
  } catch (e0) { return false; }
  try {
    var u = new URL(location.href);
    u.searchParams.delete('postjb');
    history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
  } catch (e1) {}
  W.state.alreadyJailbroken = true;
  W.state.jbSuccessLogged = true;
  W.state.elInstalledFirst = true;
  try { if (W.elboot) W.elboot._sent = false; } catch (eSent0) {}
  W.state.launcherHttpOpenStarted = false;
  try {
    var go = document.getElementById('startJailbreak');
    if (go) { go.disabled = true; go.textContent = W.t('alreadyJailbroken') || 'Already jailbroken'; }
  } catch (e2) {}
  try { if (W.finishProgressSuccess) W.finishProgressSuccess(W.t('jailbreakSuccess') || 'Done'); } catch (e3) {}
  try { W.uiLog('Wobkot done', 'success'); } catch (e4) {}
  setTimeout(function () {
    try { if (W.launcher && W.launcher.openCompanionPage) W.launcher.openCompanionPage(); } catch (e5) {}
  }, 100);
  return true;
};

})(typeof window !== 'undefined' ? window : this);
