/**
 * Xapp Cloudflare Worker (version 5: groups)
 *  1. Relay: fresh Cloudflare TURN login details (12 hours) so calls use the nearest data centre (Doha).
 *  2. Google push: wakes the other phone for calls and messages (like WhatsApp), so Xapp needs no always-on connection.
 *
 * Fill the four MY_... values below, then click Deploy.
 */
// ===== 1. Copy these three lines from your CURRENT Worker code (the values you typed before) =====
const MY_TURN_KEY_ID        = "PASTE_TURN_TOKEN_ID_HERE";
const MY_TURN_KEY_API_TOKEN = "PASTE_API_TOKEN_HERE";
const MY_APP_KEY            = "PASTE_YOUR_APP_KEY_HERE";   // same as XAPP_CF_KEY in GitHub
// ===== 2. Firebase key file: open the downloaded .json file, copy EVERYTHING (from { to }), and paste it
//         between the two ` marks on the next line, replacing the PASTE... words =====
const MY_FIREBASE_KEY = String.raw`PASTE_THE_WHOLE_KEY_FILE_HERE`;
// ===================================================================================================================

const FIREBASE_WEB_API_KEY = "AIzaSyAfvocJ8xYish8hfItCh9MwHue8-cFsHJA";   // Xapp's public web key (same as in the app)
const VERSION = 5;

export default {
  async fetch(request, env0) {
    const real = v => v && !String(v).startsWith("PASTE_") ? String(v).trim() : "";
    const env = {
      TURN_KEY_ID: real(env0.TURN_KEY_ID) || real(MY_TURN_KEY_ID),
      TURN_KEY_API_TOKEN: real(env0.TURN_KEY_API_TOKEN) || real(MY_TURN_KEY_API_TOKEN),
      APP_KEY: real(env0.APP_KEY) || real(MY_APP_KEY)
    };
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "x-app-key, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const path = new URL(request.url).pathname;
    const sa = serviceAccount(env0.FIREBASE_KEY || MY_FIREBASE_KEY);

    if (env.APP_KEY && request.headers.get("x-app-key") !== env.APP_KEY)
      return json({ error: "forbidden", version: VERSION, ok: "Worker is set up. This browser has no app key, which is expected.", push: !!sa.ok, pushError: sa.ok ? undefined : sa.error }, 403, cors);

    if (path === "/status") return json({ version: VERSION, relay: !!(env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN), push: !!sa.ok, pushError: sa.ok ? undefined : sa.error }, 200, cors);

    if (path === "/notify") {
      if (!sa.ok) return json({ ok: false, error: sa.error }, 500, cors);
      try { return json(await notify(await request.json(), sa), 200, cors); }
      catch (e) { return json({ ok: false, error: String(e && e.message || e) }, 500, cors); }
    }

    // ---- relay (default) ----
    const missing = ["TURN_KEY_ID", "TURN_KEY_API_TOKEN"].filter(k => !env[k]);
    if (missing.length) return json({ error: "missing: " + missing.join(", "), version: VERSION, tip: "Fill the MY_... lines at the top of the code, then Deploy" }, 500, cors);
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 43200 })
    });
    if (!r.ok) return json({ error: "cloudflare " + r.status }, 502, cors);
    const data = await r.json();
    const iceServers = (data.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }));
    return json({ iceServers, ttl: 43200 }, 200, { ...cors, "Cache-Control": "no-store" });
  }
};

/* ---------------- Google push ---------------- */
async function notify(b, sa) {
  const type = String(b.type || ""), to = String(b.to || "");
  if (!["call", "cancel", "msg", "test", "gcall", "gcancel"].includes(type) || !to) return { ok: false, error: "bad request" };
  const uid = await whoIs(b.idToken);                         // the signed-in Xapp user sending this
  if (!uid) return { ok: false, error: "not signed in" };
  const token = await googleToken(sa);
  const doc = p => fsGet(sa, token, p);

  let data = { type, from: uid }, targets = [to];
  if (type === "gcall" || type === "gcancel") {                // group call: ring every member except the caller
    const c = await doc(`calls/${b.id}`);
    if (!c || !c.group || c.caller !== uid || !Array.isArray(c.members) || !c.members.includes(uid)) return { ok: false, error: "not your group call" };
    if (type === "gcall" && c.status !== "ringing") return { ok: false, error: "call not ringing" };
    const g = c.chat ? await doc(`chats/${c.chat}?mask.fieldPaths=name`) : null;
    data = { type: type === "gcall" ? "call" : "cancel", from: uid, id: String(b.id), video: c.video ? "1" : "0", group: "1", title: (g && g.name) || "Group call" };
    targets = c.members.filter(m => m !== uid);
  } else if (type === "msg" && String(b.chat || "").startsWith("grp_")) {   // group message: every member except the sender
    const g = await doc(`chats/${b.chat}?mask.fieldPaths=members&mask.fieldPaths=name`);
    if (!g || !Array.isArray(g.members) || !g.members.includes(uid)) return { ok: false, error: "not in this group" };
    data.chat = String(b.chat); data.text = String(b.text || "New message").slice(0, 200); data.title = g.name || "Group";
    targets = g.members.filter(m => m !== uid);
  } else if (type === "call" || type === "cancel") {
    const c = await doc(`calls/${b.id}`);                     // only the real caller of a real call can ring someone
    if (!c || c.caller !== uid || c.callee !== to) return { ok: false, error: "not your call" };
    if (type === "call" && c.status !== "ringing") return { ok: false, error: "call not ringing" };
    data.id = String(b.id); data.video = c.video ? "1" : "0";
  } else if (type === "msg") {
    if (String(b.chat || "") !== [uid, to].sort().join("_")) return { ok: false, error: "not your chat" };
    data.chat = String(b.chat); data.text = String(b.text || "New message").slice(0, 200);
  } else if (type === "test") {
    if (to !== uid) return { ok: false, error: "test only to yourself" };
    data = { type: "call", from: uid, id: "test", video: "0" };
  }
  const me = await doc(`users/${uid}?mask.fieldPaths=name&mask.fieldPaths=username`);
  data.name = type === "test" ? "Xapp test call" : ((me && (me.name || me.username)) || "Xapp");
  if (data.group === "1") data.name = data.name + " · " + data.title;

  const results = await Promise.all(targets.slice(0, 256).map(async target => {
    const t = await doc(`tokens/${target}`);
    if (!t || !t.fcm) return "no push token (old Xapp version?)";
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: t.fcm, data, android: { priority: "HIGH", ttl: data.type === "msg" ? "86400s" : "45s" } } })
    });
    return r.ok ? "ok" : "fcm " + r.status + " " + (await r.text()).slice(0, 120);
  }));
  const sent = results.filter(x => x === "ok").length;
  return targets.length === 1 ? (sent ? { ok: true } : { ok: false, error: results[0] }) : { ok: sent > 0, sent, of: targets.length };
}

/* Firebase ID token → user ID */
async function whoIs(idToken) {
  if (!idToken) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken })
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.users && j.users[0] ? j.users[0].localId : null;
}

/* read one Firestore document with the Firebase key (plain values) */
async function fsGet(sa, token, path) {
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const j = await r.json(), out = {};
  const val = v => v.arrayValue ? (v.arrayValue.values || []).map(val) : v.stringValue ?? v.booleanValue ?? (v.integerValue != null ? Number(v.integerValue) : v.doubleValue);
  for (const [k, v] of Object.entries(j.fields || {})) out[k] = val(v);
  return out;
}

/* Google access token from the Firebase key (cached ~50 minutes) */
let cached = { token: null, exp: 0 };
async function googleToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.exp > now + 60) return cached.token;
  const enc = o => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ alg: "RS256", typ: "JWT" });
  const claim = enc({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(head + "." + claim));
  const jwt = head + "." + claim + "." + b64url(new Uint8Array(sig));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + jwt });
  const j = await r.json();
  if (!j.access_token) throw new Error("Google login failed: " + (j.error_description || j.error || r.status));
  cached = { token: j.access_token, exp: now + (j.expires_in || 3600) };
  return cached.token;
}

function serviceAccount(v) {
  try {
    if (!v || (typeof v === "string" && v.startsWith("PASTE_"))) return { ok: false, error: "Firebase key not added yet (MY_FIREBASE_KEY)" };
    const sa = typeof v === "string" ? JSON.parse(v) : v;
    if (!sa.private_key || !sa.client_email || !sa.project_id) return { ok: false, error: "Firebase key looks incomplete" };
    return { ok: true, ...sa };
  } catch (e) { return { ok: false, error: "Firebase key is not valid JSON" }; }
}
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const json = (o, status, headers) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...headers } });
