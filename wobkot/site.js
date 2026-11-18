"use strict";
/* Store-style status + Relapse-shaped #console lines for debugging. */
(function () {
  const box = document.getElementById("console");
  const statusMsg = document.getElementById("statusMsg");
  const pctEl = document.getElementById("progressPct");
  const bar = document.getElementById("progressBar");
  const label = document.getElementById("progressLabel");
  const elapsedMsg = document.getElementById("elapsedMsg");
  const t0 = Date.now();
  let stageN = 0;
  const STAGES = 6;

  function setStatus(text, frac) {
    if (text && statusMsg) statusMsg.textContent = text;
    if (pctEl) pctEl.textContent = "";
    if (typeof frac === "number" && bar) {
      var f = Math.max(0, Math.min(1, frac));
      bar.style.webkitTransform = "scaleX(" + f + ")";
      bar.style.transform = "scaleX(" + f + ")";
    }
    if (elapsedMsg) elapsedMsg.textContent = "Elapsed " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
  }

  function stageFromLine(msg) {
    const s = String(msg);
    if (/Initiate ARW|USERLAND|Starting WebKit|starting Wobkot/i.test(s)) return [1, "Preparing"];
    if (/ARW ready|Achieved ARW|ROP/i.test(s)) return [2, "Userland"];
    if (/Initiate jailbreak|Achieved jailbreak/i.test(s)) return [3, "Jailbreak"];
    if (/kernel exploit complete|Wobkot Relapse finished/i.test(s)) return [4, "Kernel"];
    if (/Created bin thread|bin returned|waiting for elfldr|Prefetching kexp/i.test(s)) return [5, "Loading"];
    if (/listening on port 9021|elfldr ready on 9021/i.test(s)) return [6, "Ready"];
    return null;
  }

  window.writeLog = function (message) {
    const text = String(message);
    if (box) {
      const line = document.createElement("div");
      line.textContent = text;
      line.dataset.t = String(Date.now());
      box.appendChild(line);
      try { box.scrollTop = box.scrollHeight; } catch (eS) {}
    }
    const st = stageFromLine(text);
    if (st && st[0] >= stageN) {
      stageN = st[0];
      setStatus(st[1], stageN / STAGES);
    } else if (statusMsg && /^\[\+\]|^\[\-\]|^\[\*]/.test(text)) {
      statusMsg.textContent = text.replace(/^\[.\]\s*/, "").slice(0, 80);
      if (elapsedMsg) elapsedMsg.textContent = "Elapsed " + ((Date.now() - t0) / 1000).toFixed(1) + "s";
    }
  };

  window.__wobkotUi = {
    success() {
      document.body.classList.add("done");
      if (pctEl) pctEl.textContent = "";
      setStatus("Done", 1);
      if (label) label.hidden = true;
    },
    fail(why) {
      document.body.classList.add("fail");
      if (pctEl) pctEl.textContent = "";
      const fail = document.getElementById("failMsg");
      if (fail) fail.textContent = why || "Failed. Restart the console";
      if (label) label.hidden = true;
    }
  };

  setStatus("Preparing", 0.05);
})();

function wkalAutoloadName() {
  try {
    const q = new URLSearchParams(location.search).get("autoload");
    if (q) return q;
    return sessionStorage.getItem("wkal_autoload") || "";
  } catch (_) {
    return "";
  }
}

function postParent(kind, extra) {
  try {
    const msg = Object.assign({ type: "wkal", kind: kind, at: Date.now() }, extra || {});
    if (window.parent && window.parent !== window) window.parent.postMessage(msg, "*");
  } catch (_) {}
}

function waitElfldr(timeoutMs) {
  /* Relapse never HTTP-probes :9021 (raw payload listener). Use connect() like Relapse. */
  const deadline = Date.now() + (timeoutMs || 30000);
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      try {
        if (typeof make_socket === "function" && typeof sockaddr_in !== "undefined"
            && typeof fn !== "undefined" && fn.connect && fn.close) {
          const addr = sockaddr_in.new();
          addr.sin_len = sockaddr_in.sizeof;
          addr.sin_family = (typeof AF_INET !== "undefined") ? AF_INET : 2;
          addr.sin_port = 0x3d23; /* htons(9021) */
          addr.sin_addr = 0x0100007f; /* 127.0.0.1 */
          const sock = make_socket((typeof AF_INET !== "undefined") ? AF_INET : 2,
            (typeof SOCK_STREAM !== "undefined") ? SOCK_STREAM : 1);
          let ok = false;
          try {
            const rc = fn.connect.invoke(sock, addr.addr, sockaddr_in.sizeof);
            ok = (rc !== -1 && rc !== -1n);
          } catch (eC) { ok = false; }
          try { fn.close.invoke(sock); } catch (eCl) {}
          try { if (addr.addr && typeof mem !== "undefined" && mem.free) mem.free(addr.addr); } catch (eF) {}
          if (ok) { resolve(true); return; }
        }
      } catch (e) {}
      if (Date.now() >= deadline) reject(new Error("elfldr not ready on 9021"));
      else setTimeout(tryOnce, 40);
    };
    tryOnce();
  });
}


function clearHistoryForNav() {
  /* fakeobj left crafted history.state; location.replace then shows
     "Unable to deserialize data" and navigation aborts. */
  try { history.replaceState(0, "", " "); } catch (e0) {}
  try { history.replaceState(null, "", location.pathname); } catch (e1) {}
  try { history.replaceState({}, "", location.pathname); } catch (e2) {}
  try { history.replaceState("", "", location.pathname); } catch (e3) {}
}

function goUrl(url) {
  clearHistoryForNav();
  try { window.open(url, "_self"); return; } catch (e0) {}
  try { location.href = url; return; } catch (e1) {}
  try { location.assign(url); return; } catch (e2) {}
  try { location.replace(url); } catch (e3) {}
}


function storeAppVersion() {
  try {
    var c = window.LOADER_CONFIG || {};
    if (c.STORE_ELF) return String(c.STORE_ELF);
  } catch (eC) {}
  try {
    var m = String(location.pathname || "").match(/\/app\/([^/]+)\//);
    if (m && m[1] && m[1] !== "index.html") return m[1];
  } catch (e0) {}
  return "";
}

function leaveToHome() {
  /* Never open("","_self") / about:blank - that leaves a white :1022 page.
     Try close; if ignored keep cream Soft Done with green Jailbreak Successful. */
  try {
    if (window.__wobkotUi) window.__wobkotUi.success();
    var ok = document.getElementById("successMsg");
    if (ok) {
      ok.textContent = "Jailbreak Successful";
      ok.style.background = "transparent";
      ok.style.border = "none";
      ok.style.color = "#047857";
    }
  } catch (eUi) {}
  try { window.close(); } catch (e1) {}
  try {
    if (window.top && window.top !== window) window.top.close();
  } catch (e2) {}
  try {
    document.body.classList.add("done");
    document.body.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7f4ee;color:#047857;font:700 1.25rem system-ui,sans-serif">Jailbreak Successful</div>';
  } catch (e4) {}
  try { setTimeout(function () { try { window.close(); } catch (e5) {} }, 150); } catch (e6) {}
}

function saveRecentOk(ms) {
  /* Same key/schema as Store Recent jailbreaks (wkal_jb_history). */
  var KEY = "wkal_jb_history";
  var fw = "";
  try {
    var m = /PlayStation 5\/(\d+\.\d+)/.exec(navigator.userAgent || "");
    if (m) fw = m[1];
  } catch (e0) {}
  if (!fw) {
    try { fw = String(window.fw_str || ""); } catch (e1) {}
  }
  var ver = storeAppVersion() || "";
  var entry = {
    ts: Date.now(),
    chain: "wobkot",
    fw: fw,
    stage: "done",
    result: "ok",
    ms: ms || 0,
    duration: ((ms || 0) / 1000).toFixed(1) + "s",
    store: ver
  };
  var arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(arr)) arr = [];
  } catch (e2) { arr = []; }
  arr.unshift(entry);
  if (arr.length > 12) arr = arr.slice(0, 12);
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e3) {}
  try {
    logger.info("recent ok | chain Wobkot | Store " + (ver || "?") + " | " + entry.duration + (fw ? (" | FW " + fw) : ""));
  } catch (e4) {}
}

var __elTipKeep = [];
function tipElfUrl(url, tag) {
  /* Image keep-refs like Relapse elboot._img. No XHR to :9021. */
  try { logger.info("tip Elf Launcher (" + tag + ")"); } catch (eL) {}
  try {
    var img = new Image();
    img.src = url;
    __elTipKeep.push(img);
  } catch (e) {}
}

function tipElfLauncherFromDisk() {
  tipElfUrl("http://127.0.0.1:9021/data/elf-launcher/elf-launcher.elf?t=" + Date.now(), "disk");
}

function tipElfLauncherBundled() {
  /* If the home tile / disk ELF was deleted, tip the Store-bundled ELF via elfldr ?uri=. */
  try {
    var m = String(location.pathname || "").match(/^(.*\/app\/[^/]+\/)/);
    var abs = (location.origin || "") + (m ? m[1] : "/app/") + "payloads/elf-launcher.elf";
    var tip = "http://127.0.0.1:9021/?uri=" + encodeURIComponent(abs) + "&t=" + Date.now();
    tipElfUrl(tip, "bundled");
  } catch (e) {
    try { logger.error("bundled tip failed: " + e); } catch (_) {}
  }
}

var __elTipDone = false;
function tipElfLauncherAll() {
  /* One tip pass per run: disk + bundled, same as Store elboot.sendInstalled.
     Never sync-probe :1000 (hangs and blocks page close). */
  if (__elTipDone) return;
  __elTipDone = true;
  tipElfLauncherFromDisk();
  tipElfLauncherBundled();
}

function waitPort(port, ms) {
  return new Promise(function (resolve) {
    var deadline = Date.now() + (ms || 12000);
    function tick() {
      try {
        var x = new XMLHttpRequest();
        x.open("GET", "http://127.0.0.1:" + port + "/version?t=" + Date.now(), true);
        x.timeout = 800;
        x.onload = function () {
          if (x.status === 200) resolve(true);
          else if (Date.now() >= deadline) resolve(false);
          else setTimeout(tick, 400);
        };
        x.onerror = x.ontimeout = function () {
          if (Date.now() >= deadline) resolve(false);
          else setTimeout(tick, 400);
        };
        x.send();
      } catch (e) {
        if (Date.now() >= deadline) resolve(false);
        else setTimeout(tick, 400);
      }
    }
    tick();
  });
}

function browserPrefOpen() {
  return new Promise(function (resolve) {
    try {
      var v = localStorage.getItem("ps5elfs-browser");
      if (v === "closed") { resolve(false); return; }
      if (v === "open") { resolve(true); return; }
    } catch (e0) {}
    try {
      var x = new XMLHttpRequest();
      x.open("GET", "http://127.0.0.1:1000/browser-pref?t=" + Date.now(), true);
      x.timeout = 1500;
      x.onload = function () {
        try {
          var j = JSON.parse(x.responseText || "{}");
          if (typeof j.open === "boolean") {
            try { localStorage.setItem("ps5elfs-browser", j.open ? "open" : "closed"); } catch (e1) {}
            resolve(!!j.open);
            return;
          }
        } catch (e2) {}
        resolve(true);
      };
      x.onerror = x.ontimeout = function () { resolve(true); };
      x.send();
    } catch (e3) { resolve(true); }
  });
}

function returnToStore() {
  try {
    var base = location.origin || (location.protocol + "//" + location.host);
    var url = base + "/app/index.html?postjb=1";
    logger.info("Wobkot done; returning to Store for Elf Launcher");
    goUrl(url);
  } catch (e) {
    try { logger.error("returnToStore failed: " + e); } catch (_) {}
  }
}


async function wobkotJbOkToast() {
  /* Same Sony toast text as Relapse after elfldr is up. */
  var ip = "";
  try {
    var saved = localStorage.getItem("wkal_lan_ip") || "";
    if (/^\d+\.\d+\.\d+\.\d+$/.test(saved) && saved.indexOf("127.") !== 0) ip = saved;
  } catch (e0) {}
  /* Never HTTP :9021 - elfldr treats bytes as payload. */
  if (!ip) {
    try {
      var r2 = await fetch("http://127.0.0.1:1022/api/sysinfo?t=" + Date.now(), { cache: "no-store" });
      var j2 = await r2.json();
      if (j2 && j2.ip && /^\d+\.\d+\.\d+\.\d+$/.test(j2.ip) && j2.ip.indexOf("127.") !== 0) ip = String(j2.ip);
    } catch (e2) {}
  }
  var line = "Mode: JB Ok\nIP Console: " + (ip || "-") + "\nPort: 9021";
  try { logger.info(line); } catch (eL0) {}
  try {
    var nfn = (typeof notify === "function") ? notify
      : ((typeof window !== "undefined" && typeof window.notify === "function") ? window.notify : null);
    if (nfn) {
      nfn(line);
      logger.info("JB Ok toast sent");
    } else {
      logger.error("notify() missing");
    }
  } catch (eN) {
    try { logger.error("JB Ok toast failed: " + eN); } catch (_) {}
  }
}

async function finishAndLeave() {
  if (window.__wobkotUi) window.__wobkotUi.success();
  tipElfLauncherAll();
  await new Promise(function (r) { setTimeout(r, 450); });
  var inIframe = false;
  try { inIframe = (window.top && window.top !== window); } catch (eT) { inIframe = true; }
  if (inIframe) return;
  leaveToHome();
}

async function main() {
  const autoload = wkalAutoloadName();
  window.__wobkotT0 = Date.now();
  var ver0 = storeAppVersion() || "?";
  logger.info("WK Store " + ver0 + " | chain Wobkot | start");
  logger.info("PS5 WebView · thin Wobkot page");
  try {
    var meta = document.getElementById("metaMsg");
    if (meta) meta.textContent = "chain Wobkot";
  } catch (eM) {}

  if (!window.wobkot || typeof window.wobkot.runRelapse !== "function")
    throw new Error("Wobkot runtime missing");

  /* Fast path: grab spray buffers first, no long GC waits, no prefetch. */
  try { clearHistoryForNav(); } catch (eH0) {}
  try {
    var box = document.getElementById("console");
    if (box) { box.textContent = ""; box.style.display = "none"; }
  } catch (eDom) {}
  try {
    window.__wobkotWriteLog = window.writeLog;
    window.writeLog = function () {};
  } catch (eWl) {}
  try {
    window.__wobkotSpray = [new ArrayBuffer(0x400000), new ArrayBuffer(0x400000)];
  } catch (ePre) {
    window.__wobkotSpray = null;
    try { if (globalThis.gc) globalThis.gc(); } catch (eG0) {}
    await new Promise(function (r) { setTimeout(r, 200); });
    try {
      window.__wobkotSpray = [new ArrayBuffer(0x400000), new ArrayBuffer(0x400000)];
    } catch (ePre2) { window.__wobkotSpray = null; }
  }
  logger.info("starting Wobkot");
  var tSpray = Date.now();
  await window.wobkot.runRelapse();
  var jbSec = ((Date.now() - tSpray) / 1000).toFixed(1);
  var totalSec = ((Date.now() - window.__wobkotT0) / 1000).toFixed(1);
  logger.info("Wobkot Relapse finished in " + jbSec + "s (total " + totalSec + "s)");
  logger.info("kernel exploit complete | elfldr :9021");
  logger.info("listening on port 9021");
  postParent("jb-success");

  /* Tip EL ASAP (do not wait 12s first), save Recent, toast, then leave home.
     No return to Store (top-level; parent is gone). */
  try {
    try {
      var boxShow = document.getElementById("console");
      if (boxShow) { boxShow.style.display = "block"; }
      if (window.__wobkotWriteLog) window.writeLog = window.__wobkotWriteLog;
    } catch (eShow) {}
    var ver = storeAppVersion() || "?";
    var msTotal = Date.now() - (window.__wobkotT0 || Date.now());
    var elapsed = (msTotal / 1000).toFixed(1);
    logger.info("JB ok | chain Wobkot | Store " + ver + " | " + elapsed + "s");
    /* Wait socket :9021 then one Image tip (disk+bundled keep-refs). */
    try { window.__wobkotSpray = null; } catch (eSp) {}
    try { if (globalThis.gc) globalThis.gc(); } catch (eG) {}
    try {
      await waitElfldr(250);
      logger.info("elfldr ready on 9021");
    } catch (eW) {
      logger.info("elfldr wait: " + (eW && eW.message ? eW.message : eW));
    }
    tipElfLauncherAll();
    try { saveRecentOk(msTotal); } catch (eH) {
      try { logger.error("recent save failed: " + eH); } catch (_) {}
    }
    try { Promise.resolve(wobkotJbOkToast()).catch(function () {}); } catch (eToast) {}
    await new Promise(function (r) { setTimeout(r, 75); });
    postParent("elfldr-ready-ip");
    postParent("autoload", { ok: true, skipped: autoload === "wkal-skip" || !autoload, name: autoload || "" });
    if (window.__wobkotUi) window.__wobkotUi.success();
    logger.info("Closing to PS5 home (Store " + ver + ", " + elapsed + "s)");
    leaveToHome();
  } catch (e) {
    const why = e && e.message ? e.message : String(e);
    try {
      if (window.__wobkotWriteLog) window.writeLog = window.__wobkotWriteLog;
    } catch (eRest) {}
    logger.error("post-JB leave failed: " + why);
    try { tipElfLauncherAll(); } catch (eT) {}
    try { saveRecentOk(Date.now() - (window.__wobkotT0 || Date.now())); } catch (eH2) {}
    try { leaveToHome(); } catch (eR) {}
    postParent("autoload", { ok: false, why: why });
    if (window.__wobkotUi) window.__wobkotUi.fail(why);
  }
}

main().catch((error) => {
  const why = error && error.message ? error.message : String(error);
  try { clearHistoryForNav(); } catch (eC) {}
  logger.error(why);
  postParent("autoload", { ok: false, why: why });
  if (window.__wobkotUi) window.__wobkotUi.fail(why);
});
