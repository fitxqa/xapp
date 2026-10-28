/* Xapp extras: send location, document scanner, full-screen photo viewer.
   Uses the globals from app.js ($, S, api, ico, esc, toast, renderMsgs…). */

/* =========================  MAP PREVIEW (OpenStreetMap tiles, no key needed)  ========================= */
function mapView(lat, lng, w, h, z){
  z = z || 16;
  const n = Math.pow(2, z), rad = lat * Math.PI / 180;
  const px = (lng + 180) / 360 * n * 256;
  const py = (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * n * 256;
  const x0 = px - w / 2, y0 = py - h / 2;
  let tiles = "";
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + w) / 256); tx++)
    for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + h) / 256); ty++){
      const wx = ((tx % n) + n) % n;
      tiles += `<img alt="" draggable="false" src="https://tile.openstreetmap.org/${z}/${wx}/${ty}.png" style="left:${Math.round(tx*256-x0)}px;top:${Math.round(ty*256-y0)}px">`;
    }
  const pin = `<svg class="pin" viewBox="0 0 24 32" aria-hidden="true"><path d="M12 31s10-11.2 10-19A10 10 0 0 0 2 12c0 7.8 10 19 10 19z" fill="#FF6A13" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#fff"/></svg>`;
  return `<div class="map" style="width:${w}px;height:${h}px">${tiles}${pin}<span class="osm">© OpenStreetMap</span></div>`;
}
const mapsLink = (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
const navLink  = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;

/* Bubble for a location message (used by renderMsgs) */
const wazeLink = (lat, lng) => `https://waze.com/ul?ll=${lat.toFixed(6)},${lng.toFixed(6)}&navigate=yes`;
function locationBubble(m){
  const lat = +m.lat, lng = +m.lng, d = `data-lat="${lat}" data-lng="${lng}" data-label="${esc(m.text||"Location")}"`;
  return `<a class="locmsg" href="${mapsLink(lat,lng)}" target="_blank" rel="noopener" data-maps="choose" ${d}>${mapView(lat,lng,240,140)}</a>
    <div class="locinfo"><b>📍 ${esc(m.text || "Location")}</b>${m.address?`<small>${esc(m.address)}</small>`:""}<small>${m.acc ? "Accurate to " + Math.round(m.acc) + " m" : ""}</small>
    <div class="locbtns"><a href="${navLink(lat,lng)}" target="_blank" rel="noopener" data-maps="google" ${d}>${ico("pinloc")} Google Maps</a><a href="${wazeLink(lat,lng)}" target="_blank" rel="noopener" data-maps="waze" ${d}>${ico("send")} Waze</a></div></div>`;
}
/* In the app: hand the location to Google Maps / Waze / any maps app */
document.addEventListener("click", e => {
  const a = e.target.closest("[data-maps]"); if (!a || !isNative()) return;
  e.preventDefault();
  nat("Location", "openMaps", {lat:+a.dataset.lat, lng:+a.dataset.lng, app:a.dataset.maps, label:a.dataset.label});
}, true);

/* =========================  SEND LOCATION  ========================= */
function sendLocation(){ if (isNative()) return sendLocationNative(); return sendLocationWeb(); }
async function sendLocationNative(){
  const peer = S.peer; if (!peer) return;
  const sh = $("#sheet");
  const frame = inner => { sh.innerHTML = `<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Send location</b></div></header><div class="form">${inner}</div>`; sh.hidden = false; };
  sh.onclick = e => { if (e.target.closest("[data-close]")) sh.hidden = true; };
  frame(`<div class="locwait"><div class="spin"></div><p>Finding your exact location…</p><p class="note">Allow <b>Precise</b> location when Android asks. Outdoors or near a window is most accurate.</p></div>`);
  let r;
  try { r = await nat("Location", "current", {}, true); }
  catch (err) {
    const code = (err && (err.code || err.message)) || "";
    const off = /OFF/.test(code), denied = /DENIED|denied/.test(code);
    frame(`<p style="margin:0;line-height:1.5">${off ? "Location (GPS) is switched off on this phone. Turn it on, then try again."
      : denied ? "Xapp is not allowed to use your location. Open Xapp's settings → Permissions → Location → “Allow only while using the app” and switch on <b>Use precise location</b>."
      : "Couldn't get a GPS fix. Move outdoors or near a window and try again."}</p>
      ${off ? '<button class="btn" id="locFix">Turn on Location</button>' : denied ? '<button class="btn" id="locFix">Open Xapp settings</button>' : ""}
      <button class="btn ghost" id="locRetry">Try again</button>`);
    const f = $("#locFix"); if (f) f.onclick = () => nat("Location", "openSettings", {what: off ? "off" : "app"});
    $("#locRetry").onclick = sendLocationNative; return;
  }
  if (!r || typeof r.lat !== "number") { frame(`<p>Couldn't get your location.</p>`); return; }
  const lat = r.lat, lng = r.lng, acc = Math.round(r.acc || 0);
  frame(`<div class="locprev" id="locPrev"></div>
    <p style="margin:0"><b>${r.address ? esc(r.address) : "Your current location"}</b><br><span class="note">Accurate to ${acc} m${r.precise ? "" : " · approximate only"}</span></p>
    ${r.precise ? "" : `<p class="note" style="color:var(--orange);margin:0">Precise location is off, so this point can be far away. Settings → Apps → Xapp → Permissions → Location → switch on “Use precise location”.</p><button class="btn ghost" id="locPerm">Open Xapp settings</button>`}
    <label for="locName">Name (optional)</label><input id="locName" placeholder="e.g. Home, Office, Pickup point" maxlength="60">
    <button class="btn" id="locSend">Send this location</button>
    <button class="btn ghost" id="locAgain">Refresh location</button>`);
  const box = $("#locPrev"); box.innerHTML = mapView(lat, lng, Math.max(240, box.clientWidth || (innerWidth - 40)), 220);
  const p = $("#locPerm"); if (p) p.onclick = () => nat("Location", "openSettings", {what:"app"});
  $("#locAgain").onclick = sendLocationNative;
  $("#locSend").onclick = async () => {
    sh.hidden = true;
    const label = ($("#locName").value || "").trim() || "Current location";
    const msg = {type:"location", lat:+lat.toFixed(6), lng:+lng.toFixed(6), acc, text:label};
    if (r.address) msg.address = r.address;
    try { await api.send(peer, msg); } catch (err) { toast("Location not sent. Check your connection."); }
  };
}
function sendLocationWeb(){
  const peer = S.peer; if (!peer) return;
  const sh = $("#sheet");
  const frame = inner => { sh.innerHTML = `<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Send location</b></div></header><div class="form">${inner}</div>`; sh.hidden = false; };
  sh.onclick = e => { if (e.target.closest("[data-close]")) { sh.hidden = true; stop(); } };
  let watch = null, best = null;
  const stop = () => { if (watch != null && navigator.geolocation) navigator.geolocation.clearWatch(watch); watch = null; };
  if (!navigator.geolocation){ frame(`<p>This phone can't share location from Xapp.</p>`); return; }
  frame(`<div class="locwait"><div class="spin"></div><p>Finding your location…</p><p class="note">Allow location when Android asks. Outdoors or near a window is most accurate.</p></div>`);
  const show = () => {
    const {latitude:lat, longitude:lng, accuracy:acc} = best.coords;
    frame(`<div class="locprev" id="locPrev"></div>
      <p style="margin:0"><b>Your current location</b><br><span class="note">Accurate to ${Math.round(acc)} m${acc > 60 ? " · still improving…" : ""}</span></p>
      <label for="locName">Name (optional)</label><input id="locName" placeholder="e.g. Home, Office, Pickup point" maxlength="60">
      <button class="btn" id="locSend">Send this location</button>`);
    const box = $("#locPrev"); box.innerHTML = mapView(lat, lng, Math.max(240, box.clientWidth || (innerWidth - 40)), 220);
    $("#locSend").onclick = async () => {
      stop(); sh.hidden = true;
      const label = ($("#locName").value || "").trim() || "Current location";
      try { await api.send(peer, {type:"location", lat:+lat.toFixed(6), lng:+lng.toFixed(6), acc:Math.round(acc), text:label}); }
      catch (err) { toast("Location not sent. Check your connection."); }
    };
  };
  const fail = err => {
    stop();
    const denied = err && err.code === 1;
    frame(`<p style="margin:0;line-height:1.5">${denied
      ? "Xapp is not allowed to use your location. Open Xapp's settings, tap Permissions → Location and choose “Allow only while using the app”."
      : "Couldn't find your location. Turn on Location (GPS) in the phone's quick settings and try again."}</p>
      ${denied && isNative() ? '<button class="btn" id="locSet">Open Xapp settings</button>' : '<button class="btn" id="locRetry">Try again</button>'}`);
    const s1 = $("#locSet"); if (s1) s1.onclick = () => { sh.hidden = true; nat("Background", "openAppInfo"); };
    const s2 = $("#locRetry"); if (s2) s2.onclick = () => sendLocation();
  };
  watch = navigator.geolocation.watchPosition(pos => {
    if (!best || pos.coords.accuracy < best.coords.accuracy - 5){ const first = !best; best = pos; if (first || !$("#locName") || document.activeElement !== $("#locName")) show(); }
    if (pos.coords.accuracy <= 25) stop();
  }, err => { if (!best) fail(err); }, {enableHighAccuracy:true, timeout:20000, maximumAge:0});
  setTimeout(stop, 45000);
}

/* =========================  DOCUMENT SCANNER  ========================= */
const SCAN = {pages:[], img:null, corners:null, filter:"bw", result:null};

function loadImage(file){
  return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = r.result; }; r.onerror = no; r.readAsDataURL(file); });
}
/* Draw the photo into a canvas no larger than max px on its long side */
function toCanvas(img, max){
  const k = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const c = document.createElement("canvas"); c.width = Math.round((img.naturalWidth||img.width) * k); c.height = Math.round((img.naturalHeight||img.height) * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); return c;
}
/* Find the paper: bright region (Otsu threshold), corners = extreme points of x+y and x−y */
function detectCorners(src){
  const t = toCanvas(src, 220), w = t.width, h = t.height, d = t.getContext("2d").getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h), hist = new Array(256).fill(0);
  for (let i = 0; i < w * h; i++){ const v = (d[i*4]*0.299 + d[i*4+1]*0.587 + d[i*4+2]*0.114) | 0; lum[i] = v; hist[v]++; }
  let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, best = 0, thr = 128;
  for (let i = 0; i < 256; i++){ wB += hist[i]; if (!wB) continue; const wF = w*h - wB; if (!wF) break; sB += i*hist[i];
    const mB = sB/wB, mF = (sum - sB)/wF, between = wB*wF*(mB - mF)*(mB - mF); if (between > best){ best = between; thr = i; } }
  let tl=null, tr=null, br=null, bl=null, n=0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
    if (lum[y*w+x] <= thr) continue; n++;
    if (!tl || x+y < tl[0]+tl[1]) tl=[x,y]; if (!br || x+y > br[0]+br[1]) br=[x,y];
    if (!tr || x-y > tr[0]-tr[1]) tr=[x,y]; if (!bl || x-y < bl[0]-bl[1]) bl=[x,y];
  }
  const share = n / (w*h);
  const fx = (src.naturalWidth||src.width) / w, fy = (src.naturalHeight||src.height) / h;
  if (!tl || share < 0.12 || share > 0.96){
    const W = src.naturalWidth||src.width, H = src.naturalHeight||src.height, m = 0.06;
    return [[W*m,H*m],[W*(1-m),H*m],[W*(1-m),H*(1-m)],[W*m,H*(1-m)]];
  }
  return [tl,tr,br,bl].map(p => [p[0]*fx, p[1]*fy]);
}
/* Perspective: maps output rectangle (0..W,0..H) onto the source quad */
function homography(W, H, q){
  const src = [[0,0],[W,0],[W,H],[0,H]], A = [], b = [];
  for (let i = 0; i < 4; i++){ const [x,y] = src[i], [u,v] = q[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]); b.push(u); A.push([0,0,0,x,y,1,-v*x,-v*y]); b.push(v); }
  for (let c = 0; c < 8; c++){ let p = c; for (let r = c+1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c],A[p]] = [A[p],A[c]]; [b[c],b[p]] = [b[p],b[c]];
    for (let r = 0; r < 8; r++){ if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f*A[c][k]; b[r] -= f*b[c]; } }
  return b.map((v, i) => v / A[i][i]);
}
function warp(srcCanvas, q){
  const dist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
  let W = Math.max(dist(q[0],q[1]), dist(q[3],q[2])), H = Math.max(dist(q[0],q[3]), dist(q[1],q[2]));
  const k = Math.min(1, 1800 / Math.max(W, H)); W = Math.round(W*k); H = Math.round(H*k);
  const m = homography(W, H, q);
  const sw = srcCanvas.width, sh = srcCanvas.height, s = srcCanvas.getContext("2d").getImageData(0, 0, sw, sh).data;
  const out = document.createElement("canvas"); out.width = W; out.height = H;
  const octx = out.getContext("2d"), o = octx.createImageData(W, H), od = o.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const den = m[6]*x + m[7]*y + 1, u = (m[0]*x + m[1]*y + m[2]) / den, v = (m[3]*x + m[4]*y + m[5]) / den;
    const x0 = Math.max(0, Math.min(sw - 2, u | 0)), y0 = Math.max(0, Math.min(sh - 2, v | 0)), fx = Math.min(1, Math.max(0, u - x0)), fy = Math.min(1, Math.max(0, v - y0));
    const i00 = (y0*sw + x0)*4, i10 = i00 + 4, i01 = i00 + sw*4, i11 = i01 + 4, j = (y*W + x)*4;
    for (let c = 0; c < 3; c++) od[j+c] = (s[i00+c]*(1-fx) + s[i10+c]*fx)*(1-fy) + (s[i01+c]*(1-fx) + s[i11+c]*fx)*fy;
    od[j+3] = 255;
  }
  octx.putImageData(o, 0, 0); return out;
}
/* Filters: colour (light boost), grey, black & white (shadow-removing, keeps text sharp) */
function applyFilter(c, f){
  const W = c.width, H = c.height, out = document.createElement("canvas"); out.width = W; out.height = H;
  const ctx = out.getContext("2d"); ctx.drawImage(c, 0, 0);
  if (f === "color"){ const id = ctx.getImageData(0,0,W,H), d = id.data; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) d[i+k] = Math.min(255, (d[i+k]-10)*1.12); ctx.putImageData(id,0,0); return out; }
  const id = ctx.getImageData(0, 0, W, H), d = id.data, L = new Float32Array(W*H);
  for (let i = 0; i < W*H; i++) L[i] = d[i*4]*0.299 + d[i*4+1]*0.587 + d[i*4+2]*0.114;
  if (f === "grey"){ for (let i = 0; i < W*H; i++){ const v = Math.min(255, Math.max(0, (L[i]-128)*1.15 + 140)); d[i*4]=d[i*4+1]=d[i*4+2]=v; } ctx.putImageData(id,0,0); return out; }
  const I = new Float64Array((W+1)*(H+1));                      // integral image for the local background
  for (let y = 1; y <= H; y++){ let row = 0; for (let x = 1; x <= W; x++){ row += L[(y-1)*W + x-1]; I[y*(W+1)+x] = I[(y-1)*(W+1)+x] + row; } }
  const r = Math.max(8, Math.round(Math.max(W, H) / 40));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    const xa = Math.max(0, x-r), xb = Math.min(W, x+r+1), ya = Math.max(0, y-r), yb = Math.min(H, y+r+1);
    const mean = (I[yb*(W+1)+xb] - I[ya*(W+1)+xb] - I[yb*(W+1)+xa] + I[ya*(W+1)+xa]) / ((xb-xa)*(yb-ya));
    let v = L[y*W+x] / Math.max(1, mean) * 255;           // paper → white, shadows removed
    v = v > 235 ? 255 : Math.max(0, (v - 90) * 1.75);      // ink → dark, crisp
    const j = (y*W + x)*4; d[j] = d[j+1] = d[j+2] = Math.min(255, v);
  }
  ctx.putImageData(id, 0, 0); return out;
}

function scanStart(){ $("#fScan").click(); }
async function scanFile(file){
  const el = $("#scan");
  try {
    const img = await loadImage(file);
    SCAN.img = toCanvas(img, 2000); SCAN.corners = detectCorners(SCAN.img);
    scanCropView();
  } catch (err) { el.hidden = true; toast("Couldn't open that photo"); }
}
function scanCropView(){
  const el = $("#scan"), c = SCAN.img;
  el.innerHTML = `<div class="scanbar"><button class="ibtn" id="scX" aria-label="Cancel">${ico("x")}</button><b>Adjust corners</b><button class="ibtn" id="scAuto" aria-label="Find corners again" title="Find corners again">${ico("full")}</button></div>
    <div class="scanstage" id="scStage"><canvas id="scCv"></canvas><svg id="scSvg"></svg>${[0,1,2,3].map(i=>`<button class="hdl" data-h="${i}" aria-label="Corner ${i+1}"></button>`).join("")}</div>
    <div class="scanfoot"><button class="btn ghost" id="scRetake">Retake</button><button class="btn" id="scNext">Next</button></div>`;
  el.hidden = false;
  const stage = $("#scStage"), cv = $("#scCv");
  const fit = () => {
    const sw = stage.clientWidth, shh = stage.clientHeight, k = Math.min(sw / c.width, shh / c.height);
    cv.width = Math.round(c.width * k); cv.height = Math.round(c.height * k);
    cv.getContext("2d").drawImage(c, 0, 0, cv.width, cv.height);
    SCAN.k = k; SCAN.ox = (sw - cv.width) / 2; SCAN.oy = (shh - cv.height) / 2;
    cv.style.left = SCAN.ox + "px"; cv.style.top = SCAN.oy + "px"; draw();
  };
  const draw = () => {
    const P = SCAN.corners.map(([x, y]) => [SCAN.ox + x*SCAN.k, SCAN.oy + y*SCAN.k]);
    $("#scSvg").innerHTML = `<polygon points="${P.map(p=>p.join(",")).join(" ")}" fill="rgba(255,106,19,.14)" stroke="#FF6A13" stroke-width="2.5"/>`;
    el.querySelectorAll(".hdl").forEach((h, i) => { h.style.left = P[i][0] + "px"; h.style.top = P[i][1] + "px"; });
  };
  el.querySelectorAll(".hdl").forEach(h => {
    h.onpointerdown = e => {
      e.preventDefault(); h.setPointerCapture(e.pointerId); const i = +h.dataset.h, r = stage.getBoundingClientRect();
      h.onpointermove = ev => {
        const x = (ev.clientX - r.left - SCAN.ox) / SCAN.k, y = (ev.clientY - r.top - SCAN.oy) / SCAN.k;
        SCAN.corners[i] = [Math.max(0, Math.min(c.width, x)), Math.max(0, Math.min(c.height, y))]; draw();
      };
      h.onpointerup = h.onpointercancel = () => { h.onpointermove = null; };
    };
  });
  $("#scX").onclick = scanClose;
  $("#scAuto").onclick = () => { SCAN.corners = detectCorners(SCAN.img); draw(); };
  $("#scRetake").onclick = scanStart;
  $("#scNext").onclick = () => {
    $("#scNext").textContent = "Processing…"; $("#scNext").disabled = true;
    setTimeout(() => { SCAN.flat = warp(SCAN.img, SCAN.corners); scanResultView(); }, 30);
  };
  requestAnimationFrame(fit); SCAN.onResize = fit;
}
function scanResultView(){
  const el = $("#scan");
  const n = SCAN.pages.length + 1;
  el.innerHTML = `<div class="scanbar"><button class="ibtn" id="scBack" aria-label="Back to corners">${ico("back")}</button><b>Page ${n}</b><span style="width:44px"></span></div>
    <div class="scanstage"><img id="scOut" alt="Scanned page ${n}"></div>
    <div class="chips" role="radiogroup" aria-label="Filter">${[["bw","Black & white"],["grey","Grey"],["color","Color"]].map(([k,l])=>`<button role="radio" aria-checked="${SCAN.filter===k}" data-f="${k}">${l}</button>`).join("")}</div>
    <div class="scanfoot"><button class="btn ghost" id="scAdd">${ico("plus")} Add page</button><button class="btn" id="scSend">${ico("send")} Send ${n > 1 ? n + " pages" : ""}</button></div>`;
  const render = () => {
    SCAN.result = applyFilter(SCAN.flat, SCAN.filter);
    $("#scOut").src = SCAN.result.toDataURL("image/jpeg", SCAN.filter === "color" ? 0.82 : 0.8);
    el.querySelectorAll("[data-f]").forEach(b => b.setAttribute("aria-checked", b.dataset.f === SCAN.filter));
  };
  el.querySelectorAll("[data-f]").forEach(b => b.onclick = () => { SCAN.filter = b.dataset.f; render(); });
  $("#scBack").onclick = scanCropView;
  $("#scAdd").onclick = () => { SCAN.pages.push($("#scOut").src); toast("Page " + n + " saved · scan the next page"); scanStart(); };
  $("#scSend").onclick = async () => {
    const pages = [...SCAN.pages, $("#scOut").src], peer = S.peer; scanClose();
    if (!peer) return;
    toast(pages.length > 1 ? `Sending ${pages.length} pages…` : "Sending scan…");
    try {
      for (let i = 0; i < pages.length; i++){
        const id = await api.putMedia(pages[i]);
        await api.send(peer, {type:"image", mediaId:id, scan:true, text: pages.length > 1 ? `Scanned document · page ${i+1} of ${pages.length}` : "Scanned document"});
      }
    } catch (err) { toast("Scan not sent. Check your connection."); }
  };
  setTimeout(render, 20);
}
function scanClose(){ const el = $("#scan"); el.hidden = true; el.innerHTML = ""; SCAN.pages = []; SCAN.img = SCAN.flat = SCAN.result = null; SCAN.onResize = null; }
addEventListener("resize", () => { if (SCAN.onResize && !$("#scan").hidden) SCAN.onResize(); });

/* =========================  FULL-SCREEN PHOTO VIEWER  ========================= */
function openViewer(src, caption){
  const v = $("#viewer");
  v.innerHTML = `<div class="vbar"><button class="ibtn" id="vX" aria-label="Close">${ico("x")}</button><span>${esc(caption || "")}</span><span style="width:44px"></span></div>
    <div class="vstage" id="vStage"><img id="vImg" src="${src}" alt="${esc(caption || "Photo")}"></div><p class="vhint">Double-tap to zoom</p>`;
  v.hidden = false;
  const st = $("#vStage"), im = $("#vImg"); let zoom = false, lastTap = 0;
  const toggle = (cx, cy) => {
    zoom = !zoom; st.classList.toggle("z", zoom);
    if (zoom){ requestAnimationFrame(() => { const r = im.getBoundingClientRect(); st.scrollLeft = (cx / innerWidth) * (r.width - st.clientWidth); st.scrollTop = (cy / innerHeight) * (r.height - st.clientHeight); }); }
  };
  st.onclick = e => { const now = Date.now(); if (now - lastTap < 320){ toggle(e.clientX, e.clientY); lastTap = 0; } else lastTap = now; };
  st.ondblclick = e => e.preventDefault();
  $("#vX").onclick = closeViewer;
}
function closeViewer(){ const v = $("#viewer"); v.hidden = true; v.innerHTML = ""; }
