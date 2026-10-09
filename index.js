"use strict";

// CELESTIAL — Messenger control dashboard + API (single file, same-origin)
// Open the Render URL "/" to see the dashboard. No VITE_* config needed.

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CELESTIAL</title>
<style>
:root{--bg:#07060f;--card:#0e0c1c;--line:#26214a;--tx:#ece9ff;--mut:#8b86b8;--ac:#8b7bff;--ac2:#4fd1ff;--ok:#38e0a0;--bad:#ff5a7a}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:var(--tx);min-height:100vh;
background:radial-gradient(900px 500px at 80% -10%,#2a1f6b55,transparent),radial-gradient(700px 400px at -10% 30%,#0b4a6b44,transparent),var(--bg)}
header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)}
.logo{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-size:22px;background:linear-gradient(135deg,var(--ac),var(--ac2))}
h1{font-size:17px;letter-spacing:.3em;margin:0}small{color:var(--mut);letter-spacing:.2em;font-size:10px}
main{padding:14px;max-width:720px;margin:auto;display:grid;gap:12px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:14px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.k{font-size:10px;letter-spacing:.18em;color:var(--mut);text-transform:uppercase}
.v{font-size:18px;font-weight:700;margin-top:4px;word-break:break-word}
.ok{color:var(--ok)}.bad{color:var(--bad)}
.pill{display:inline-block;padding:5px 12px;border-radius:99px;font-size:13px;font-weight:600}
.pill.ok{background:#38e0a022}.pill.bad{background:#ff5a7a22}
h2{margin:0 0 10px;font-size:15px}
textarea,input{width:100%;background:#09081a;border:1px solid var(--line);color:var(--tx);border-radius:12px;padding:12px;font:13px monospace}
textarea{min-height:110px}
button{border:0;border-radius:12px;padding:12px 14px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--ac),#5a4bd8);cursor:pointer}
button.g{background:#1a1735;border:1px solid var(--line)}button.r{background:#a8233f}button.s{background:#16825a}
.row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}.row button{flex:1;min-width:110px}
.ev{font:12px monospace;padding:7px 0;border-bottom:1px solid var(--line);color:var(--mut)}.ev b{color:var(--tx)}
.kv{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px}
.kv span:first-child{color:var(--mut)}.kv span:last-child{text-align:right;word-break:break-all}
#err{display:none;background:#ff5a7a1c;border:1px solid #ff5a7a66;color:#ffb3c1;border-radius:12px;padding:10px;font-size:13px}
#login{display:none}
</style></head><body>
<header><div class="logo">✦</div><div><h1>CELESTIAL</h1><small>MESSENGER CONTROL</small></div></header>
<main>
<div id="err"></div>
<div class="card" id="login"><h2>Dashboard key</h2>
<input id="key" type="password" placeholder="ECLIPSE_DASHBOARD_API_KEY" autocomplete="off">
<div class="row"><button onclick="saveKey()">Unlock</button></div></div>

<div id="app" style="display:none;gap:12px;grid-template-columns:1fr">
<div class="card"><div class="k">Control room</div>
<div style="margin-top:8px"><span id="conn" class="pill bad">Disconnected</span></div></div>
<div class="grid">
<div class="card"><div class="k">Messenger</div><div class="v" id="m">—</div></div>
<div class="card"><div class="k">Bot</div><div class="v" id="b">—</div></div>
<div class="card"><div class="k">Server uptime</div><div class="v" id="u">—</div></div>
<div class="card"><div class="k">Bot uptime</div><div class="v" id="cu">—</div></div>
<div class="card"><div class="k">Last connected</div><div class="v" id="lc" style="font-size:14px">Never</div></div>
<div class="card"><div class="k">Last disconnected</div><div class="v" id="ld" style="font-size:14px">Never</div></div>
</div>
<div class="card"><h2>Controls</h2>
<div class="row"><button class="s" onclick="act('bot/start')">▶ Start</button>
<button class="r" onclick="act('bot/stop')">■ Stop</button></div>
<div class="row"><button class="g" onclick="act('reconnect')">Reconnect</button>
<button class="g" onclick="act('disconnect')">Disconnect</button></div></div>

<div class="card"><h2>Facebook session</h2>
<div class="kv"><span>Account</span><span id="acc">Not linked</span></div>
<div class="kv"><span>Cookie saved</span><span id="saved">No</span></div>
<div class="kv"><span>Saved at</span><span id="savedAt">—</span></div>
<textarea id="cookie" placeholder="Paste cookie / appstate here (JSON array or c_user=...; xs=...)" spellcheck="false"></textarea>
<div class="row"><button onclick="sendCookie()">Save &amp; connect</button></div></div>

<div class="card"><h2>All status data</h2><div id="all"></div></div>
<div class="card"><h2>Activity</h2><div id="ev"><div class="ev">No activity yet.</div></div></div>
<div class="row"><button class="g" onclick="localStorage.removeItem('cel_key');location.reload()">Lock dashboard</button></div>
</div></main>
<script>
var KEY=localStorage.getItem('cel_key')||'';
function $(i){return document.getElementById(i)}
function showErr(t){var e=$('err');e.textContent=t||'';e.style.display=t?'block':'none'}
function saveKey(){KEY=$('key').value.trim();localStorage.setItem('cel_key',KEY);start()}
function api(p,o){o=o||{};o.headers=Object.assign({'x-eclipse-dashboard-key':KEY,'Content-Type':'application/json'},o.headers||{});
return fetch('/api/dashboard/'+p,o).then(function(r){return r.json().then(function(j){if(r.status===401){localStorage.removeItem('cel_key');KEY='';throw new Error('Wrong dashboard key')}if(!r.ok||j.ok===false)throw new Error(j.error||('HTTP '+r.status));return j})})}
function fmt(s){s=+s||0;var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return (d?d+'d ':'')+(h?h+'h ':'')+m+'m '+(s%60)+'s'}
function flat(o,p,out){out=out||[];for(var k in o){var v=o[k],n=p?p+'.'+k:k;if(v&&typeof v==='object'&&!Array.isArray(v))flat(v,n,out);else out.push([n,Array.isArray(v)?JSON.stringify(v):String(v)])}return out}
function esc(s){return String(s).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}
function act(p){api(p,{method:'POST',body:'{}'}).then(function(){showErr('');refresh()}).catch(function(e){showErr(e.message)})}
function sendCookie(){var c=$('cookie').value.trim();if(!c)return showErr('Paste a cookie first.');
api('connect-session',{method:'POST',body:JSON.stringify({cookie:c})}).then(function(){$('cookie').value='';showErr('');refresh()}).catch(function(e){showErr(e.message)})}
function refresh(){
Promise.all([api('status'),api('health').catch(function(){return {}}),api('session').catch(function(){return {}}),api('events').catch(function(){return {events:[]}})]).then(function(r){
var s=r[0],h=(r[1].runtime||{}),ss=r[2].session||{},ev=r[3].events||[];
$('login').style.display='none';$('app').style.display='grid';showErr('');
var on=!!s.facebook_connected;
$('conn').textContent=on?'Connected':'Disconnected';$('conn').className='pill '+(on?'ok':'bad');
$('m').textContent=on?'ONLINE':'OFFLINE';$('m').className='v '+(on?'ok':'bad');
var run=s.bot_running!==undefined?s.bot_running:(s.paused!==undefined?!s.paused:on);
$('b').textContent=run?'RUNNING':'PAUSED';$('b').className='v '+(run?'ok':'bad');
$('u').textContent=fmt(h.uptime_seconds!==undefined?h.uptime_seconds:s.uptime_seconds);
$('cu').textContent=on&&s.bot_uptime_seconds!==undefined?fmt(s.bot_uptime_seconds):'0s';$('cu').className='v '+(on?'ok':'bad');
function dt(x){return x?new Date(x).toLocaleString():'Never'}
$('lc').textContent=dt(s.last_connected);$('ld').textContent=dt(s.last_disconnected);
$('acc').textContent=ss.account||s.account||'Not linked';
$('saved').textContent=ss.saved?'Yes':'No';$('saved').className=ss.saved?'ok':'bad';
$('savedAt').textContent=ss.saved_at?new Date(ss.saved_at).toLocaleString():'—';
var rows=flat(s).concat(flat({node:h.node_version,pid:h.pid,database:h.database,memory_mb:h.memory?Math.round(h.memory.rss/1048576):null},'runtime'));
$('all').innerHTML=rows.map(function(x){return '<div class="kv"><span>'+esc(x[0])+'</span><span>'+esc(x[1])+'</span></div>'}).join('');
$('ev').innerHTML=ev.length?ev.map(function(e){return '<div class="ev"><b>'+esc(e.type)+'</b> '+esc(e.message)+'<br>'+new Date(e.at).toLocaleTimeString()+'</div>'}).join(''):'<div class="ev">No activity yet.</div>';
}).catch(function(e){if(!KEY){$('app').style.display='none';$('login').style.display='block'}showErr(e.message)})}
function start(){if(!KEY){$('login').style.display='block';return}refresh()}
start();setInterval(function(){if(KEY)refresh()},5000);
</script></body></html>`;

module.exports = function startDashboardApi(port, getStatus, controls = {}) {
  const key = String(process.env.CELESTIAL_DASHBOARD_API_KEY || process.env.ECLIPSE_DASHBOARD_API_KEY || "").trim();
  const origin = String(process.env.ECLIPSE_DASHBOARD_ORIGIN || "*");
  const SESSION_FILE = process.env.CELESTIAL_SESSION_FILE || path.join(process.cwd(), "appstate.json");
  const events = [];
  const session = { saved: false, account: null, saved_at: null };

  const log = (type, message) => {
    events.unshift({ type, message, at: new Date().toISOString() });
    if (events.length > 200) events.length = 200;
  };

  // Track Messenger connection uptime by watching getStatus().facebook_connected
  const conn = { since: null, last_connected: null, last_disconnected: null, was: false };
  setInterval(() => {
    let on = false;
    try { on = Boolean(getStatus().facebook_connected); } catch (_) {}
    if (on && !conn.was) {
      conn.since = Date.now();
      conn.last_connected = new Date().toISOString();
      log("connection", "Messenger connected");
    } else if (!on && conn.was) {
      conn.since = null;
      conn.last_disconnected = new Date().toISOString();
      log("connection", "Messenger disconnected");
    }
    conn.was = on;
  }, 2000).unref();

  // Detect an already-saved session on boot (account id only, never the cookie)
  try {
    const raw = fs.readFileSync(SESSION_FILE, "utf8");
    const p = parseCookie(raw);
    if (p) {
      session.saved = true;
      session.account = p.account;
      session.saved_at = fs.statSync(SESSION_FILE).mtime.toISOString();
    }
  } catch (_) {}

  function parseCookie(raw) {
    let pairs = [];
    try {
      const j = JSON.parse(raw);
      const arr = Array.isArray(j) ? j : Array.isArray(j.cookies) ? j.cookies : null;
      if (arr) pairs = arr.map((c) => [c.key || c.name, c.value]);
    } catch (_) {
      pairs = String(raw).split(";").map((s) => {
        const i = s.indexOf("=");
        return i < 0 ? [] : [s.slice(0, i).trim(), s.slice(i + 1).trim()];
      });
    }
    const map = Object.fromEntries(pairs.filter((p) => p[0]));
    if (!map.c_user || !map.xs) return null;
    return { account: "c_user " + map.c_user, id: map.c_user };
  }

  const send = (res, status, body) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let data = "";
      req.on("data", (c) => {
        data += c;
        if (data.length > 200000) { reject(new Error("Body too large")); req.destroy(); }
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

  const authorized = (req) => {
    if (!key) return false;
    const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const supplied = String(req.headers["x-eclipse-dashboard-key"] || bearer);
    const a = Buffer.from(supplied);
    const b = Buffer.from(key);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  const runtime = () => ({
    watchdog: { ok: true },
    database: null,
    uptime_seconds: Math.floor(process.uptime()),
    node_version: process.version,
    pid: process.pid,
    memory: process.memoryUsage()
  });

  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-ECLIPSE-DASHBOARD-KEY");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

    const url = new URL(req.url || "/", "http://localhost");

    if (url.pathname === "/health") {
      return send(res, 200, { ok: true, service: "celestial", dashboard_api: Boolean(key) });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(PAGE);
    }
    if (!url.pathname.startsWith("/api/dashboard/")) {
      return send(res, 404, { ok: false, error: "Not found" });
    }
    if (!key) return send(res, 503, { ok: false, error: "Set ECLIPSE_DASHBOARD_API_KEY on this service" });
    if (!authorized(req)) return send(res, 401, { ok: false, error: "Dashboard authorization required" });

    const p = url.pathname;
    const isGet = req.method === "GET";
    const isPost = req.method === "POST";

    try {
      if (isGet && p === "/api/dashboard/status") {
        return send(res, 200, Object.assign({}, getStatus(), {
          session_saved: session.saved,
          bot_uptime_seconds: conn.since ? Math.floor((Date.now() - conn.since) / 1000) : 0,
          last_connected: conn.last_connected,
          last_disconnected: conn.last_disconnected
        }));
      }
      if (isGet && p === "/api/dashboard/health") return send(res, 200, { ok: true, runtime: runtime() });
      if (isGet && p === "/api/dashboard/session") return send(res, 200, { ok: true, session });
      if (isGet && p === "/api/dashboard/events") {
        const extra = typeof controls.getEvents === "function" ? controls.getEvents() : [];
        const merged = [...events, ...extra].sort((a, b) => new Date(b.at) - new Date(a.at));
        return send(res, 200, { ok: true, events: merged.slice(0, 80) });
      }
      if (isGet && p === "/api/dashboard/snapshot") return send(res, 200, { ok: true, snapshot: null, degraded: true });
      if (isGet && p === "/api/dashboard/analytics") {
        return send(res, 200, { ok: true, analytics: { generated_at: new Date().toISOString(), hours: 24, economy: [], rpg: [], battles: [], moderation: [] } });
      }
      if (isGet && p === "/api/dashboard/user") {
        return send(res, 200, { ok: true, inspector: { generated_at: new Date().toISOString(), user: null } });
      }

      if (isPost && p === "/api/dashboard/bot/start") {
        if (typeof controls.setPaused !== "function") return send(res, 501, { ok: false, error: "Bot start control is unavailable" });
        controls.setPaused(false);
        log("bot", "Bot started");
        return send(res, 200, { ok: true, bot_running: Boolean(getStatus().facebook_connected) });
      }
      if (isPost && p === "/api/dashboard/bot/stop") {
        if (typeof controls.setPaused !== "function") return send(res, 501, { ok: false, error: "Bot stop control is unavailable" });
        controls.setPaused(true);
        log("bot", "Bot paused");
        return send(res, 200, { ok: true, bot_running: false });
      }

      if (isPost && p === "/api/dashboard/connect-session") {
        let body;
        try { body = JSON.parse((await readBody(req)) || "{}"); } catch (_) { return send(res, 400, { ok: false, error: "Invalid request" }); }
        const raw = String(body.cookie || "").trim();
        const parsed = parseCookie(raw);
        if (!parsed) return send(res, 400, { ok: false, error: "Cookie must contain c_user and xs" });
        fs.writeFileSync(SESSION_FILE, raw, { mode: 0o600 });
        session.saved = true;
        session.account = parsed.account;
        session.saved_at = new Date().toISOString();
        log("session", "Cookie saved for " + parsed.account);
        // Hook into the bot: index.js can pass controls.connectSession(raw, parsed)
        if (typeof controls.connectSession === "function") {
          try { await controls.connectSession(raw, parsed); log("session", "Connect requested"); }
          catch (e) { log("error", "Connect failed: " + e.message); return send(res, 500, { ok: false, error: "Saved, but connect failed: " + e.message }); }
        }
        return send(res, 200, { ok: true, session });
      }

      if (isPost && p === "/api/dashboard/reconnect") {
        if (typeof controls.reconnect !== "function") return send(res, 501, { ok: false, error: "Reconnect is not wired in index.js yet" });
        await controls.reconnect(); log("session", "Reconnect requested");
        return send(res, 200, { ok: true });
      }
      if (isPost && p === "/api/dashboard/disconnect") {
        if (typeof controls.disconnect === "function") await controls.disconnect();
        try { fs.unlinkSync(SESSION_FILE); } catch (_) {}
        session.saved = false; session.account = null; session.saved_at = null;
        log("session", "Disconnected and cookie removed");
        return send(res, 200, { ok: true });
      }

      return send(res, 404, { ok: false, error: "Unsupported dashboard endpoint" });
    } catch (e) {
      return send(res, 500, { ok: false, error: e.message });
    }
  });

  server.listen(port, () => console.log("[CELESTIAL] dashboard + API server :" + port));
  return server;
};
