"use strict";

// Host glue for the vendored Wobkot runtime.  Wobkot intentionally uses classic
// scripts and a shared global lexical environment; keep this file classic too.
const logger = {
  verbose: true,
  info(message) { this.log("[+]", message); },
  error(message) { this.log("[-]", message); },
  debug(message) { if (this.verbose) this.log("[*]", message); },
  log(prefix, message) {
    const text = `${prefix} ${String(message)}`;
    if (typeof window.writeLog === "function") window.writeLog(text);
    else console.log(text);
  },
};

const WOBKOT_SCRIPT_MAP = {
  "src/kernel.js": "vendor/wobkot/src/kernel.js",
  "src/lapse.js": "vendor/wobkot/src/lapse.js",
  "src/thread.js": "vendor/wobkot/src/thread.js",
  "src/worker.js": "vendor/wobkot/src/worker.js",
  "src/ps5/relapse.js": "vendor/wobkot/src/ps5/relapse.js",
};

function load_script(source) {
  const mapped = WOBKOT_SCRIPT_MAP[source] || source;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const inline = window.__wobkotScripts && typeof window.__wobkotScripts[mapped] === "string";
    if (inline)
      script.text = window.__wobkotScripts[mapped];
    else
      script.src = new URL(mapped, document.baseURI).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${mapped}`));
    document.head.appendChild(script);
    if (inline) resolve();
  });
}
async function load_file(source) {
  let mapped = source;
  const config = window.LOADER_CONFIG || {};
  if (source === "src/ps5/kexp.bin") mapped = config.KEXP_BIN || "payloads/kexp.bin";
  if (source === "src/ps5/elfldr.elf") mapped = config.ELFLDR_ELF || "payloads/elfldr.elf";

  if (window.__wobkotPrefetch && window.__wobkotPrefetch[mapped])
    return window.__wobkotPrefetch[mapped];

  const response = await fetch(new URL(mapped, document.baseURI).href);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${mapped}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function prefetch_payloads() {
  const config = window.LOADER_CONFIG || {};
  const kexpPath = config.KEXP_BIN || "payloads/kexp.bin";
  const elfPath = config.ELFLDR_ELF || "payloads/elfldr.elf";
  const out = {};
  for (const mapped of [kexpPath, elfPath]) {
    const response = await fetch(new URL(mapped, document.baseURI).href);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${mapped}`);
    out[mapped] = new Uint8Array(await response.arrayBuffer());
  }
  const e = out[elfPath];
  if (e.length < 0x1000 || e[0] !== 0x7f || e[1] !== 0x45 || e[2] !== 0x4c || e[3] !== 0x46) {
    const head = Array.from(e.slice(0, 8)).map(function (b) {
      return (b < 16 ? "0" : "") + b.toString(16);
    }).join(" ");
    throw new Error("prefetched elfldr is not an ELF (" + elfPath + " len=" + e.length + " head=" + head + ")");
  }
  window.__wobkotPrefetch = out;
  logger.info(`Prefetched kexp (${out[kexpPath].length}) + elfldr (${out[elfPath].length})`);
}
