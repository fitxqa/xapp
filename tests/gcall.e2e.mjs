// Group call end-to-end: 3 browser "phones" (fake mic) join one group call through the Firebase emulators.
import { chromium } from "playwright";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, setDoc } from "firebase/firestore";

const PID = "xapp-test";
const env = await initializeTestEnvironment({ projectId: PID, firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
const fb = f => readFileSync("node_modules/firebase/" + f, "utf8");
const gcall = readFileSync("www/gcall.js", "utf8");
const harness = `<!doctype html><html><body><script>${fb("firebase-app-compat.js")}</script><script>${fb("firebase-auth-compat.js")}</script><script>${fb("firebase-firestore-compat.js")}</script>
<script>
firebase.initializeApp({projectId:"${PID}", apiKey:"fake-key"}); firebase.auth().useEmulator("http://127.0.0.1:9099"); firebase.firestore().useEmulator("127.0.0.1", 8080);
var S={me:null,users:{},chats:[]}, api={demo:false, push:()=>Promise.resolve({ok:true})}, PREFS={}, call=null, LOG=[];
var toast=m=>LOG.push("toast "+m), micHelp=e=>LOG.push("mic "+e), groupOf=id=>S.chats.find(c=>c.id===id), isGroup=p=>String(p).startsWith("grp_");
var getMedia=v=>navigator.mediaDevices.getUserMedia({audio:true, video:!!v}), iceWith=()=>({iceServers:[]}), cfIce=async()=>[], tuneSdp=s=>s, tuneSenders=()=>{}, preferRed=()=>{};
var nat=()=>Promise.resolve(), avatar=u=>'<span class="av">'+((u&&u.name)||"?")[0]+'</span>', ico=n=>'<i>'+n+'</i>', esc=s=>String(s), dur=s=>Math.round(s)+"s", ringSound=()=>{}, stopTone=()=>{}, renderChatHead=()=>{};
var $=q=>document.querySelector(q), myContacts=()=>Object.values(S.users).filter(u=>u.uid!==S.me.uid); api.wantUsers=()=>{};
</script><script>${gcall}</script></body></html>`;

const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] });
const names = ["Razeem", "Shiyana", "Ahmed", "Dina"], pages = [], uids = [];
for (const n of names) {
  const p = await (await browser.newContext()).newPage();
  p.on("pageerror", e => console.log(n, "PAGE ERROR", e.message));
  p.on("console", m => { if (["error", "warning"].includes(m.type())) console.log(n, "CONSOLE", m.type(), m.text().slice(0, 300)); });
  await p.route("http://localhost:5577/", r => r.fulfill({ body: harness, contentType: "text/html" }));
  await p.goto("http://localhost:5577/");
  const uid = await p.evaluate(async n => (await firebase.auth().createUserWithEmailAndPassword(n.toLowerCase() + "@xapp.local", "secret123")).user.uid, n);
  pages.push(p); uids.push(uid);
}
const GID = "grp_test";
await env.withSecurityRulesDisabled(async ctx => { const x = ctx.firestore();
  for (let i = 0; i < 4; i++) await setDoc(doc(x, "users", uids[i]), { uid: uids[i], name: names[i], username: names[i].toLowerCase() });
  await setDoc(doc(x, "chats", GID), { type: "group", name: "Family", members: uids.slice(0, 3), admins: [uids[0]] }); });
for (let i = 0; i < 4; i++) await pages[i].evaluate(([uid, uids, names, GID, inGroup]) => {
  S.me = { uid }; uids.forEach((u, k) => S.users[u] = { uid: u, name: names[k] }); S.chats = inGroup ? [{ id: GID, name: "Family", members: uids.slice(0, 3) }] : []; XG.watchLive(); }, [uids[i], uids, names, GID, i < 3]);

const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0; const ok = (name, c) => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + name); };
const state = p => p.evaluate(async () => { const g = XG.active(); if (!g) return { inCall: false };
  const out = { inCall: true, peers: g.peers.size, connected: 0, audioIn: 0 };
  out.detail = [...g.peers].map(([u, pr]) => (S.users[u]||{}).name + ":" + pr.pc.connectionState + "/" + pr.pc.iceConnectionState + "/" + pr.pc.signalingState);
  for (const [u, pr] of g.peers) { if (pr.pc.connectionState === "connected") out.connected++; (await pr.pc.getStats()).forEach(r => { if (r.type === "inbound-rtp" && r.kind === "audio") out.audioIn += r.packetsReceived || 0; }); }
  return out; });

await sleep(2500);   // let every phone's listener attach
await pages[0].evaluate(GID => XG.startGroupCall(GID, false), GID);
await pages[1].waitForSelector("#gcin", { timeout: 12000 }).catch(() => {}); await pages[2].waitForSelector("#gcin", { timeout: 6000 }).catch(() => {});
console.log("A log", JSON.stringify(await pages[0].evaluate(() => [LOG, !!XG.active(), XG.live().length])));
console.log("B log", JSON.stringify(await pages[1].evaluate(() => [LOG, XG.live().length])));
ok("Shiyana sees the incoming group call", await pages[1].evaluate(() => !!document.querySelector("#gcin")));
ok("Ahmed sees the incoming group call", await pages[2].evaluate(() => !!document.querySelector("#gcin")));
await pages[1].click("#gJoin", { timeout: 5000 }).catch(() => console.log("no Join button for Shiyana")); await sleep(4000);
await pages[2].click("#gJoin", { timeout: 5000 }).catch(() => console.log("no Join button for Ahmed")); await sleep(15000);
for (let i = 0; i < 3; i++) { const s = await state(pages[i]); console.log(names[i], JSON.stringify(s));
  ok(names[i] + " is connected to both others", s.peers === 2 && s.connected === 2);
  ok(names[i] + " hears the others (audio packets arriving)", s.audioIn > 50); }
ok("3 people shown on screen", await pages[0].evaluate(() => document.querySelectorAll("#gTiles .gp").length === 3));
await pages[2].click("#gEnd"); await sleep(4000);
const s0 = await state(pages[0]), s1 = await state(pages[1]);
ok("after Ahmed leaves, Razeem has 1 connection", s0.peers === 1);
ok("after Ahmed leaves, Shiyana has 1 connection", s1.peers === 1);
// --- left: no ringing again, then rejoin ---
await sleep(3000);
ok("Ahmed is not rung again after leaving", await pages[2].evaluate(() => !document.querySelector("#gcin")));
ok("Ahmed can see the live call to rejoin", await pages[2].evaluate(() => XG.live().length === 1));
await pages[2].evaluate(() => XG.joinGroupCall(XG.live()[0])); await sleep(15000);
for (let i = 0; i < 3; i++) { const st = await state(pages[i]); console.log("rejoin", names[i], JSON.stringify(st)); ok(names[i] + " connected to both after Ahmed rejoined", st.peers === 2 && st.connected === 2); }
// --- add Dina (not in the group) from Shiyana's Add list ---
await pages[1].evaluate(() => XG.openAdd()); await sleep(500);
const dinaBtn = await pages[1].$(`#gadd [data-addp="${uids[3]}"]`);
ok("Dina is offered under Other contacts", !!dinaBtn);
if (dinaBtn) await dinaBtn.click();
await pages[3].waitForSelector("#gcin", { timeout: 12000 }).catch(() => {});
ok("Dina sees the incoming group call", await pages[3].evaluate(() => !!document.querySelector("#gcin")));
await pages[3].click("#gJoin", { timeout: 5000 }).catch(() => console.log("no Join button for Dina")); await sleep(15000);
for (let i = 0; i < 4; i++) { const st = await state(pages[i]); console.log("four", names[i], JSON.stringify(st)); ok(names[i] + " connected to all 3 others", st.peers === 3 && st.connected === 3); }
for (const i of [3, 2, 1, 0]) { await pages[i].click("#gEnd").catch(() => {}); await sleep(1500); }
let ended = [];
await env.withSecurityRulesDisabled(async ctx => { const { getDocs, collection } = await import("firebase/firestore"); const q = await getDocs(collection(ctx.firestore(), "calls")); ended = q.docs.map(d => d.data().status); });
ok("call marked ended when everyone left", ended.length === 1 && ended[0] === "ended");
for (const p of pages) { const l = await p.evaluate(() => LOG); if (l.length) console.log("log", JSON.stringify(l)); }
console.log(`RESULT group calls: ${pass} passed, ${fail} failed`);
await browser.close(); await env.cleanup(); process.exit(fail ? 1 : 0);
