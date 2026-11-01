/**
 * Xapp relay credentials — Cloudflare Worker.
 * Gives Xapp fresh Cloudflare TURN login details (valid 12 hours) so calls use the nearest
 * Cloudflare data centre (Doha for calls inside Qatar).
 *
 * Secrets to add in the Worker (Settings → Variables and Secrets → Add → type "Secret"):
 *   TURN_KEY_ID         = the "Turn Token ID" from Realtime → TURN Server → xapp
 *   TURN_KEY_API_TOKEN  = the "API Token" shown when you created it
 *   APP_KEY             = any password you choose (Xapp sends it; others are refused)
 */
export default {
  async fetch(request, env) {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "x-app-key, content-type", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return json({ error: "Worker secrets missing" }, 500, cors);
    if (env.APP_KEY && request.headers.get("x-app-key") !== env.APP_KEY) return json({ error: "forbidden" }, 403, cors);

    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.TURN_KEY_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 43200 })
    });
    if (!r.ok) return json({ error: "cloudflare " + r.status }, 502, cors);
    const data = await r.json();
    // drop port 53 (often blocked) so calls don't wait on it
    const iceServers = (data.iceServers || []).map(s => ({ ...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u)) }));
    return json({ iceServers, ttl: 43200 }, 200, { ...cors, "Cache-Control": "no-store" });
  }
};
const json = (o, status, headers) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...headers } });
