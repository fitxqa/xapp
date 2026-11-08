/* =========================  CONFIG  ========================= */
const CFG = window.XAPP_CONFIG || {};
const FIREBASE_CONFIG = CFG.firebase || {};
const LOGIN_DOMAIN = "xapp.local";
const ICE = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }, ...(CFG.turn || [])], iceTransportPolicy: CFG.relayOnly ? "relay" : "all" };
const DEMO = !FIREBASE_CONFIG.apiKey || !window.firebase || /[?&]demo/.test(location.search);
const MAX_VIDEO_MB = 16, CHUNK = 900000;

/* =========================  HELPERS  ========================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const P = {
  back:"M15 18l-6-6 6-6", phone:"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z",
  video:"M23 7l-7 5 7 5V7zM3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z", mic:"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8",
  clip:"M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5",
  camera:"M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  search:"M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3", more:"M12 5h.01M12 12h.01M12 19h.01", plus:"M12 5v14M5 12h14",
  chat:"M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z",
  micoff:"M1 1l22 22M9 9v3a3 3 0 0 0 5.1 2.1M15 9.3V5a3 3 0 0 0-5.9-.6M17 16.9A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.1 1.2M12 19v4M8 23h8",
  videooff:"M1 1l22 22M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.7 0H14a2 2 0 0 1 2 2v3.3l1 1L23 7v10",
  flip:"M1 4v6h6M23 20v-6h-6M20.5 9A9 9 0 0 0 5.6 5.6L1 10m22 4l-4.6 4.4A9 9 0 0 1 3.5 15",
  check:"M20 6L9 17l-5-5", checks:"M17 6L6 17l-5-5M23 6L12 17l-1.5-1.5", out:"M7 17L17 7M8 7h9v9", inn:"M17 7L7 17M16 17H7V8",
  image:"M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21", users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  text:"M4 7V4h16v3M9 20h6M12 4v16", x:"M18 6L6 18M6 6l12 12", play:"M6 4l14 8-14 8V4z", pause:"M6 4h4v16H6zM14 4h4v16h-4z", trash:"M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  speaker:"M11 5L6 9H2v6h4l5 4V5zM19 5a10 10 0 0 1 0 14M15.5 8.5a5 5 0 0 1 0 7", chev:"M9 18l6-6-6-6", chevdown:"M6 9l6 6 6-6",
  bluetooth:"M7 7l10 10-5 5V2l5 5L7 17", pinloc:"M12 22s8-7.6 8-13a8 8 0 0 0-16 0c0 5.4 8 13 8 13zM12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  scan:"M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10", headphones:"M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z",
  earpiece:"M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM10 5h4M12 18h.01",
  moon:"M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z", battery:"M2 7h16v10H2zM22 11v2", rocket:"M5 19l3-3M14 4l6 6-8 8-6-6 8-8zM15 9h.01", logout:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9", full:"M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3",
  updates:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  settings:"M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  bell:"M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0", wifi:"M5 12.6a11 11 0 0 1 14 0M8.5 16.1a6 6 0 0 1 7 0M12 20h.01M1.4 9a16 16 0 0 1 21.2 0",
  mail:"M3 6.5A1.5 1.5 0 0 1 4.5 5h15A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM3.5 6.5 12 13l8.5-6.5",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", info:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01"
};
const ico = (n, extra="") => `<svg class="i" viewBox="0 0 24 24" ${extra}><path d="${P[n]}"/></svg>`;
const endIco = `<svg class="i" viewBox="0 0 24 24" style="transform:rotate(135deg)"><path d="${P.phone}"/></svg>`;
const AVC = ["#ff6a13","#3a3a3f","#b8460b","#57534e","#d9570f","#26262a","#8a3a0c"];
function avatar(u, cls="", online=false){
  if(!u) u = {name:"?"};
  const ini = (u.name||u.username||"?").replace(/\(.*?\)/g,"").trim().split(/\s+/).map(w=>w[0]).slice(0,2).join("").toUpperCase();
  const pal = AVC;
  const col = pal[[...(u.uid||u.name||"x")].reduce((a,c)=>a+c.charCodeAt(0),0)%pal.length];
  const st = u.photo ? `background-image:url('${u.photo}')` : `background:${col}`;
  return `<span class="av ${cls}" style="${st}">${u.photo?"":esc(ini)}${online?'<span class="dot"></span>':""}</span>`;
}
const pad = n => String(n).padStart(2,"0");
const hm = t => { const d=new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
function dayLabel(t){
  const d=new Date(t), n=new Date(); const s=new Date(n.getFullYear(),n.getMonth(),n.getDate()).getTime();
  if(t>=s) return "Today"; if(t>=s-864e5) return "Yesterday";
  return d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:d.getFullYear()===n.getFullYear()?undefined:"numeric"});
}
function listTime(t){ const l=dayLabel(t); return l==="Today"?hm(t):l; }
const dur = s => `${Math.floor(s/60)}:${pad(Math.floor(s%60))}`;
const isOnline = u => u && Date.now()-(u.lastSeen||0) < 100000;
const chatId = (a,b) => [a,b].sort().join("_");
const isGroup = p => typeof p==="string" && p.startsWith("grp_");
const peerOf = c => isGroup(c.id) ? c.id : (c.members||[]).find(m=>m!==S.me.uid);
const groupOf = id => S.chats.find(c=>c.id===id);
const nameOf = uid => uid===S.me.uid ? "You" : ((S.users[uid]||{}).name || "Someone");
function toast(t){ const el=$("#toast"); el.textContent=t; el.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>el.hidden=true,2600); }
const readFile = f => new Promise((ok,no)=>{ const r=new FileReader(); r.onload=()=>ok(r.result); r.onerror=no; r.readAsDataURL(f); });
async function shrinkImage(file, max=1600, q=.8){
  const src = await readFile(file); const img = new Image(); img.src = src; await img.decode();
  const k = Math.min(1, max/Math.max(img.width,img.height)); const c=document.createElement("canvas");
  c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  return c.toDataURL("image/jpeg",q);
}

/* =========================  BACKEND: FIREBASE  ========================= */
function makeFire(){
  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth(), db = firebase.firestore();
  db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  const C = n => db.collection(n);
  let me = null;
  const isEmail = u => u.includes("@");
  const mail = u => isEmail(u) ? u.trim().toLowerCase() : u.trim().toLowerCase().replace(/[^a-z0-9._-]/g,"") + "@" + LOGIN_DOMAIN;
  return {
    demo:false,
    onAuth(cb){
      auth.onAuthStateChanged(async u => {
        if(!u){ me=null; try{ localStorage.removeItem("xappMe"); }catch(e){} return cb(null); }
        me = u.uid;
        let cached=null; try{ cached=JSON.parse(localStorage.getItem("xappMe")||"null"); }catch(e){}
        if(cached && cached.uid===me){ cb(cached); cb=()=>{}; }       // show the app at once; the live profile follows
        let d = null;
        try{ d = (await C("users").doc(me).get({source:"cache"})).data(); }catch(e){}
        if(!d) for(let i=0;i<3;i++){ try{ d = (await C("users").doc(me).get()).data(); }catch(e){} if(d) break; await new Promise(r=>setTimeout(r,600)); }
        d = d || {};
        const uname = d.username || u.email.split("@")[0];
        const realEmail = u.email && !u.email.endsWith("@"+LOGIN_DOMAIN) ? u.email.toLowerCase() : null;
        if(!d.name || !d.username || (realEmail && !d.email)){   // repair an account whose profile did not save at sign-up
          const fix = {uid:me, username:uname, name:d.name||uname}; if(!d.about) fix.about="Hey there! I am using Xapp"; if(realEmail) fix.email=realEmail;
          C("users").doc(me).set(fix,{merge:true}).catch(()=>{}); d = {...fix, ...d, ...fix};
        }
        const prof={uid:me, username:uname, email:realEmail||"", name:d.name||uname, about:d.about||"", photo:d.photo||"", contacts:d.contacts||[]};
        try{ localStorage.setItem("xappMe", JSON.stringify({...prof, photo: (prof.photo||"").length<60000 ? prof.photo : ""})); }catch(e){}
        cb(prof);
      });
    },
    async login(u,p){ await auth.signInWithEmailAndPassword(mail(u),p); },
    async signup(u,p,name){
      const c = await auth.createUserWithEmailAndPassword(mail(u),p);
      const em = isEmail(u) ? u.trim().toLowerCase() : null;
      const doc = {uid:c.user.uid, username: em ? em.split("@")[0] : u.trim().toLowerCase(), name: name || (em ? em.split("@")[0] : u), about:"Hey there! I am using Xapp", lastSeen:Date.now(), createdAt:Date.now(), contacts:[]};
      if(em) doc.email = em;
      await C("users").doc(c.user.uid).set(doc);
      this.bumpStat("signups");
    },
    resetPassword(email){ return auth.sendPasswordResetEmail(email.trim().toLowerCase()); },
    async findUser(q){
      q = q.trim().toLowerCase().replace(/^@/,""); if(!q) return [];
      const s = await C("users").where(isEmail(q) ? "email" : "username", "==", q).limit(10).get();
      return s.docs.map(d=>({uid:d.id,...d.data()})).filter(x=>x.uid!==me);
    },
    addContact(uid){ return C("users").doc(me).set({contacts:firebase.firestore.FieldValue.arrayUnion(uid)},{merge:true}); },
    removeContact(uid){ return C("users").doc(me).set({contacts:firebase.firestore.FieldValue.arrayRemove(uid)},{merge:true}); },
    logout(){ nat("Background","signOut"); return auth.signOut(); },
    emailFor(u){ return mail(u); },
    // "online" signal: a tiny presence/{uid} doc, so contacts don't re-download the whole profile (with photo) every minute
    ping(){ if(me) C("presence").doc(me).set({lastSeen:Date.now()}).catch(()=>{}); },
    seenNow(){ if(me) C("users").doc(me).set({lastSeen:Date.now()},{merge:true}).catch(()=>{}); },   // profile copy: on open / leave only
    cleanProfile(){ if(!me) return; const del=firebase.firestore.FieldValue.delete();
      C("users").doc(me).update({diagBg:del, diagApp:del, diagNet:del, diagCall:del}).catch(()=>{}); },
    updateProfile(p){ return C("users").doc(me).set(p,{merge:true}); },
    /* Google push through the Cloudflare Worker: wakes the other phone (call / cancel / message / test) */
    async push(type, data){
      const w=CFG.cfWorker; if(!w||!w.url||!auth.currentUser) return null;
      try{ const u=new URL(w.url); u.pathname="/notify"; u.search="";
        const r=await fetch(u.toString(),{method:"POST", headers:{"content-type":"application/json","x-app-key":w.key||""},
          body:JSON.stringify({type, ...data, idToken:await auth.currentUser.getIdToken()})});
        return await r.json().catch(()=>({ok:r.ok}));
      }catch(e){ return {ok:false, error:String(e&&e.message||e)}; }
    },
    async pushStatus(){ const w=CFG.cfWorker; if(!w||!w.url) return null;
      try{ const u=new URL(w.url); u.pathname="/status"; u.search=""; const r=await fetch(u.toString(),{headers:{"x-app-key":w.key||""}}); return await r.json(); }catch(e){ return null; } },
    async isAdmin(){ try{ return (await C("admins").doc(me).get()).exists; }catch(e){ return false; } },
    report(uid, reason){ return C("reports").add({from:me, about:uid, reason, at:Date.now(), status:"open"}); },
    watchAnnouncements(cb){ return C("announcements").orderBy("at","desc").limit(1).onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()}))), ()=>{}); },
    saveCallQ(id, q){ if(id) C("calls").doc(id).set({["q_"+me]:q},{merge:true}).catch(()=>{}); },
    bumpStat(k){ const d=new Date(), day=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
      C("stats").doc(day).set({day, [k]:firebase.firestore.FieldValue.increment(1)},{merge:true}).catch(()=>{}); },
    async getDiag(){ try{ return ((await C("diag").doc(me).get({source:"server"})).data()||{}).diagBg||null; }catch(e){ return null; } },
    saveDiag(k,d){ if(!me) return; C("diag").doc(me).set({[k]:d},{merge:true}).catch(()=>{}); },
    /* Loads only the people this user knows (self, contacts, chat/call partners), one document each */
    watchUsers(cb){
      const subs=new Map(), data={}, want=new Set([me]), pres=new Map(), seen={};
      let et=0; const emit=()=>{ clearTimeout(et); et=setTimeout(()=>cb(Object.values(data).map(x=>seen[x.uid]>(x.lastSeen||0)?{...x,lastSeen:seen[x.uid]}:x)),60); };
      const presOn=()=>{ if(api._bg) return; for(const id of want) if(id!==me && !pres.has(id)) pres.set(id, C("presence").doc(id).onSnapshot(s=>{ const v=s.exists&&s.data().lastSeen; if(v&&v!==seen[id]){ seen[id]=v; emit(); } }, ()=>{})); };
      this._presence = on => { if(on) presOn(); else { pres.forEach(u=>u()); pres.clear(); } };
      const sync=()=>{ for(const id of want) if(!subs.has(id)) subs.set(id, C("users").doc(id).onSnapshot(s=>{
        if(s.exists){ const x={uid:s.id,...s.data()}; if(!x.name) x.name=x.username||"Xapp user"; data[s.id]=x;
          if(s.id===me) (x.contacts||[]).forEach(i=>want.add(i)), sync(); }
        emit(); }, ()=>{})); presOn(); };
      this.wantUsers = ids => { let n=false; ids.forEach(i=>{ if(i&&!want.has(i)){ want.add(i); n=true; } }); if(n) sync(); };
      sync();
      return ()=>{ subs.forEach(u=>u()); subs.clear(); pres.forEach(u=>u()); pres.clear(); };
    },
    wantUsers(){},
    watchChats(cb){ return C("chats").where("members","array-contains",me).onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))); },
    watchMessages(cid, cb){ return C("chats").doc(cid).collection("messages").orderBy("at").limitToLast(300).onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))); },
    async send(peer, m){
      if(isGroup(peer)) return this.sendGroup(peer, m);
      const cid = chatId(me,peer), ref = C("chats").doc(cid);
      await ref.set({members:[me,peer].sort(), last:preview(m), lastAt:Date.now(), lastFrom:me, ["unread_"+peer]:firebase.firestore.FieldValue.increment(1)},{merge:true});
      await ref.collection("messages").add({...m, from:me, at:Date.now(), read:false});
      this.bumpStat("msgs");
      this.push("msg",{to:peer, chat:cid, text:preview(m)});
    },
    /* ---- groups ---- */
    async sendGroup(gid, m){
      const ref=C("chats").doc(gid), g=groupOf(gid)||{members:[]}, inc=firebase.firestore.FieldValue.increment(1), up={last:preview(m), lastAt:Date.now(), lastFrom:me};
      g.members.filter(x=>x!==me).forEach(x=>up["unread_"+x]=inc);
      await ref.update(up);
      await ref.collection("messages").add({...m, from:me, at:Date.now(), read:false});
      this.bumpStat("msgs");
      if(m.type!=="system") this.push("msg",{to:gid, chat:gid, group:true, text:preview(m)});
    },
    async createGroup(name, members){
      const gid="grp_"+C("chats").doc().id, all=[...new Set([me,...members])];
      await C("chats").doc(gid).set({type:"group", name, members:all, admins:[me], createdBy:me, createdAt:Date.now(), last:"Group created", lastAt:Date.now(), lastFrom:me});
      await C("chats").doc(gid).collection("messages").add({type:"system", text:"created the group", from:me, at:Date.now(), read:false});
      return gid;
    },
    async groupSystem(gid, text){ const ref=C("chats").doc(gid); await ref.collection("messages").add({type:"system", text, from:me, at:Date.now(), read:false}); await ref.update({last:nameOf(me)+" "+text, lastAt:Date.now(), lastFrom:me}).catch(()=>{}); },
    renameGroup(gid, name){ return C("chats").doc(gid).update({name}).then(()=>this.groupSystem(gid,`changed the group name to "${name}"`)); },
    async addToGroup(gid, uids){ await C("chats").doc(gid).update({members:firebase.firestore.FieldValue.arrayUnion(...uids)}); return this.groupSystem(gid,"added "+uids.map(nameOf).join(", ")); },
    async removeFromGroup(gid, uid){ await this.groupSystem(gid,"removed "+nameOf(uid)); const FV=firebase.firestore.FieldValue; return C("chats").doc(gid).update({members:FV.arrayRemove(uid), admins:FV.arrayRemove(uid)}); },
    makeAdmin(gid, uid){ return C("chats").doc(gid).update({admins:firebase.firestore.FieldValue.arrayUnion(uid)}).then(()=>this.groupSystem(gid,"made "+nameOf(uid)+" an admin")); },
    async leaveGroup(gid){ const g=groupOf(gid)||{members:[],admins:[]}, FV=firebase.firestore.FieldValue, up={members:FV.arrayRemove(me), admins:FV.arrayRemove(me)};
      await this.groupSystem(gid,"left");
      const others=g.members.filter(x=>x!==me);
      if(others.length && !(g.admins||[]).some(a=>a!==me)) await C("chats").doc(gid).update({admins:FV.arrayUnion(others[0])});   // the group always keeps an admin
      return C("chats").doc(gid).update(up); },
    hideMessage(peer, id){ return C("chats").doc(isGroup(peer)?peer:chatId(me,peer)).collection("messages").doc(id).update({hiddenFor:firebase.firestore.FieldValue.arrayUnion(me)}); },
    async deleteForAll(peer, m, isLast){
      const ref=C("chats").doc(isGroup(peer)?peer:chatId(me,peer));
      await ref.collection("messages").doc(m.id).update({type:"deleted", text:"", mediaId:null, lat:null, lng:null, deletedAt:Date.now()});
      if(isLast) await ref.set({last:"🚫 This message was deleted"},{merge:true});
    },
    async markRead(peer){
      if(isGroup(peer)){ C("chats").doc(peer).update({["unread_"+me]:0}).catch(()=>{}); return; }
      const cid = chatId(me,peer), ref = C("chats").doc(cid);
      ref.set({members:[me,peer].sort(), ["unread_"+me]:0},{merge:true}).catch(()=>{});
      try{ const s = await ref.collection("messages").where("from","==",peer).where("read","==",false).get();
        if(!s.empty){ const b=db.batch(); s.docs.forEach(d=>b.update(d.ref,{read:true})); b.commit(); } }catch(e){}
    },
    async putMedia(dataUrl){
      const ref = C("media").doc(); const n = Math.ceil(dataUrl.length/CHUNK);
      for(let i=0;i<n;i++) await ref.collection("parts").doc(String(i)).set({d:dataUrl.slice(i*CHUNK,(i+1)*CHUNK)});
      await ref.set({n, by:me, at:Date.now()}); return ref.id;
    },
    async getMedia(id){
      const ref = C("media").doc(id); const h = await ref.get(); if(!h.exists) throw 0;
      const parts = await Promise.all([...Array(h.data().n).keys()].map(i=>ref.collection("parts").doc(String(i)).get()));
      return parts.map(p=>p.data().d).join("");
    },
    watchStatuses(cb){ return C("statuses").where("expiresAt",">",Date.now()).onSnapshot(s=>cb(s.docs.map(d=>({id:d.id,...d.data()})))); },
    postStatus(s){ return C("statuses").add({...s, uid:me, at:Date.now(), expiresAt:Date.now()+864e5}); },
    deleteStatus(id){ return C("statuses").doc(id).delete(); },
    watchCalls(cb){
      let a=[], b=[]; const emit=()=>cb([...a,...b]);
      const u1 = C("calls").where("caller","==",me).onSnapshot(s=>{a=s.docs.map(d=>({id:d.id,...d.data()}));emit();});
      const u2 = C("calls").where("callee","==",me).onSnapshot(s=>{b=s.docs.map(d=>({id:d.id,...d.data()}));emit();});
      return ()=>{u1();u2();};
    },
    watchIncoming(onRing, onGone){
      // A call that appears while listening is new whatever the two phones' clocks say; only calls already
      // waiting when the listener attaches are age-checked (generously, so a phone clock a bit off still rings).
      let first = true;
      return C("calls").where("callee","==",me).where("status","==","ringing").onSnapshot(s=>{ const initial=first; first=false; s.docChanges().forEach(c=>{
        const d = {id:c.doc.id,...c.doc.data()};
        if(c.type==="added" && (!initial || Math.abs(Date.now()-(d.createdAt||0)) < 180000)) onRing(d);
        if(c.type==="removed") onGone(d.id);
      }); }, err=>{ console.warn("incoming listener", err); setTimeout(()=>{ if(api._reIncoming) api._reIncoming(); }, 3000); });
    },
    async startCall(peer, video, sess){
      const ref = C("calls").doc(); sess.id = ref.id;
      const pc = sess.pc, offC = ref.collection("offerCandidates"), ansC = ref.collection("answerCandidates");
      const early = []; let ready = false; const addC = queueIce(pc, sess);
      pc.onicecandidate = e => { if(!e.candidate){ sess.log("gather-done"); return; } sess.logCand(e.candidate); const c=e.candidate.toJSON(); ready ? offC.add(c) : early.push(c); };
      const offer = await pc.createOffer(); offer.sdp=tuneSdp(offer.sdp); await pc.setLocalDescription(offer);
      await ref.set({caller:me, callee:peer, video, status:"ringing", offer:{type:offer.type,sdp:offer.sdp}, createdAt:Date.now(), relay:sess.relay||"auto"});
      // wake the other phone (Google push); try again if it hasn't started ringing, and keep the result for the admin panel
      const ring = async n => { const r = await this.push("call",{id:ref.id, to:peer, video:!!video});
        ref.update({["push"+n]: r ? (r.ok ? "ok" : String(r.error||"failed").slice(0,140)) : "worker not reachable"}).catch(()=>{}); };
      ring(1);
      [5000,12000,20000].forEach((ms,i)=>setTimeout(()=>{ if(!sess.peerRinging && !sess.startedAt && !sess.closed){ sess.log("re-ring "+(i+2)); ring(i+2); } }, ms));
      ready = true; early.splice(0).forEach(c=>offC.add(c));
      sess.unsubs.push(ref.onSnapshot(s=>{ const d=s.data(); if(!d) return;
        if(d.answer && !pc.currentRemoteDescription && !sess.answering){ sess.answering=true;
          sess.log("answer-received"); pc.setRemoteDescription(new RTCSessionDescription(d.answer)).then(()=>{ addC.flush(); sess.onActive(); }).catch(e=>{ sess.log("srd-err "+(e&&e.message)); sess.answering=false; }); }
        if(["ended","declined","missed"].includes(d.status)) sess.close(d.status);
        sess.onDoc && sess.onDoc(d);
      }));
      sess.unsubs.push(ansC.onSnapshot(s=>s.docChanges().forEach(c=>{ if(c.type==="added") addC(c.doc.data()); })));
      sess.setStatus = st => ref.update(st).catch(()=>{});
    },
    async acceptCall(call, sess){
      const ref = C("calls").doc(call.id); sess.id = call.id;
      const pc = sess.pc, offC = ref.collection("offerCandidates"), ansC = ref.collection("answerCandidates");
      const addC = queueIce(pc, sess);
      pc.onicecandidate = e => { if(!e.candidate){ sess.log("gather-done"); return; } sess.logCand(e.candidate); ansC.add(e.candidate.toJSON()); };
      await pc.setRemoteDescription(new RTCSessionDescription(call.offer)); addC.flush();
      const ans = await pc.createAnswer(); ans.sdp=tuneSdp(ans.sdp); await pc.setLocalDescription(ans);
      await ref.update({answer:{type:ans.type,sdp:ans.sdp}, status:"active", answeredAt:Date.now()});
      sess.unsubs.push(offC.onSnapshot(s=>s.docChanges().forEach(c=>{ if(c.type==="added") addC(c.doc.data()); })));
      sess.unsubs.push(ref.onSnapshot(s=>{ const d=s.data(); if(d && ["ended","missed"].includes(d.status)) sess.close("ended"); if(d) sess.onDoc && sess.onDoc(d); }));
      sess.setStatus = st => ref.update(st).catch(()=>{});
      sess.onActive();
    },
    declineCall(id){ return C("calls").doc(id).update({status:"declined"}).catch(()=>{}); },
    markRinging(id){ return C("calls").doc(id).update({ringingAt:Date.now()}).catch(()=>{}); },
    async hideCalls(ids){   // removes calls from MY history only; the other person keeps theirs
      for(let i=0;i<ids.length;i+=400){ const b=db.batch(); ids.slice(i,i+400).forEach(id=>b.update(C("calls").doc(id),{hiddenFor:firebase.firestore.FieldValue.arrayUnion(me)})); await b.commit(); }
    }
  };
}

/* =========================  BACKEND: DEMO  ========================= */
function makeDemo(){
  const now=Date.now(), m=6e4, h=36e5, ev={};
  const D = { users:[
      {uid:"ahmed", name:"Ahmed", username:"ahmed", about:"Available", lastSeen:now},
      {uid:"joseph",name:"Joseph",username:"joseph",about:"At work", lastSeen:now-25*m},
      {uid:"sana",  name:"Sana",      username:"sana",  about:"Hey there! I am using Xapp", lastSeen:now},
      {uid:"rashid",name:"Rashid",  username:"rashid",about:"Busy", lastSeen:now-3*h},
      {uid:"vinod", name:"Vinod",     username:"vinod", about:"Available", lastSeen:now-26*h}],
    msgs:{}, unread:{}, statuses:[], calls:[], media:{} };
  let me="me";
  const add=(peer,from,text,ago,read=true,extra={})=>{ const c=chatId(me,peer); (D.msgs[c]=D.msgs[c]||[]).push({id:Math.random().toString(36).slice(2),from,type:"text",text,at:now-ago,read,...extra}); };
  const seed=()=>{
    add("ahmed","ahmed","Are we still meeting at 4?",48*m);
    add("ahmed",me,"Yes, same place",45*m);
    add("ahmed","ahmed","Great, I'll bring the documents",20*m);
    add("ahmed","ahmed","Running 10 min late",3*m,false);
    D.unread[chatId(me,"ahmed")]=1;
    add("sana","sana","Tomorrow 9am is confirmed",2*h);
    add("sana",me,"Perfect, thanks",110*m);
    add("sana","sana","Done 👍",105*m);
    add("rashid","rashid","Sent you the photos",26*h);
    add("rashid",me,"Got them 👍",25*h);
    add("joseph","joseph","Call me when you're free",28*h);
    D.statuses=[
      {id:"s1",uid:"ahmed",type:"text",text:"Beautiful evening at the Corniche 🌅",bg:"#ff6a13",at:now-2*h,expiresAt:now+22*h},
      {id:"s2",uid:"sana",type:"text",text:"Busy week ahead",bg:"#26262a",at:now-5*h,expiresAt:now+19*h}];
    D.calls=[
      {id:"c1",caller:"ahmed",callee:me,video:false,status:"ended",createdAt:now-70*m,answeredAt:now-70*m,endedAt:now-66*m},
      {id:"c2",caller:me,callee:"sana",video:true,status:"ended",createdAt:now-4*h,answeredAt:now-4*h,endedAt:now-4*h+180000},
      {id:"c3",caller:"rashid",callee:me,video:false,status:"missed",createdAt:now-27*h}];
  };
  const chats=()=>Object.entries(D.msgs).map(([id,arr])=>{ const l=arr[arr.length-1]; const [a,b]=id.split("_"); const peer=a===me?b:a;
    return {id,members:[a,b],last:preview(l),lastAt:l.at,lastFrom:l.from,["unread_"+me]:D.unread[id]||0}; });
  const get={users:()=>D.users,chats,status:()=>D.statuses,calls:()=>D.calls};
  const on=(k,cb,fn)=>{ (ev[k]=ev[k]||new Set).add(cb); cb(fn()); return ()=>ev[k].delete(cb); };
  const emit=(k,v)=>(ev[k]||[]).forEach(cb=>cb(v));
  const emitAll=()=>{ emit("users",D.users); emit("chats",chats()); emit("status",D.statuses); emit("calls",D.calls); };
  const replies=["OK 👍","Sounds good","On my way","Sure","Thanks!","Call me when free"];
  let ringCb=null, goneCb=null;
  return {
    demo:true,
    onAuth(cb){ let s=null; try{ s=JSON.parse(localStorage.getItem("xappDemoMe")); }catch(e){} if(s){ me=s.uid; seed(); D.users.unshift(s); } cb(s); this._cb=cb; },
    async login(u,p,name){ const s={uid:"me",username:u.toLowerCase(),name:name||u,about:"Hey there! I am using Xapp",lastSeen:Date.now(),contacts:["ahmed","joseph","sana","rashid"]};
      try{ localStorage.setItem("xappDemoMe",JSON.stringify(s)); }catch(e){} me="me"; seed(); D.users.unshift(s); this._cb(s); },
    signup(u,p,name){ return this.login(u,p,name); },
    emailFor(){ return null; },
    resetPassword(){ return Promise.resolve(); },
    async findUser(q){ q=q.trim().toLowerCase().replace(/^@/,""); return D.users.filter(u=>u.uid!==me&&(u.username===q||u.email===q)); },
    async addContact(uid){ const m=D.users.find(u=>u.uid===me); m.contacts=[...new Set([...(m.contacts||[]),uid])]; emitAll(); },
    async removeContact(uid){ const m=D.users.find(u=>u.uid===me); m.contacts=(m.contacts||[]).filter(x=>x!==uid); emitAll(); },
    logout(){ try{ localStorage.removeItem("xappDemoMe"); }catch(e){} location.reload(); },
    ping(){}, seenNow(){}, cleanProfile(){}, saveDiag(){}, wantUsers(){}, updateProfile(p){ Object.assign(D.users[0],p); try{ localStorage.setItem("xappDemoMe",JSON.stringify(D.users[0])); }catch(e){} emitAll(); return Promise.resolve(); },
    report(){ return Promise.resolve(); }, createGroup(){ toast("Groups need an account"); return Promise.reject(); }, push(){ return Promise.resolve(null); }, pushStatus(){ return Promise.resolve(null); }, watchAnnouncements(){ return ()=>{}; }, saveCallQ(){}, bumpStat(){},
    watchUsers(cb){ return on("users",cb,get.users); }, watchChats(cb){ return on("chats",cb,get.chats); },
    watchMessages(cid,cb){ return on("m:"+cid,cb,()=>D.msgs[cid]||[]); },
    async send(peer,m){ const cid=chatId(me,peer); (D.msgs[cid]=D.msgs[cid]||[]).push({id:Math.random().toString(36).slice(2),...m,from:me,at:Date.now(),read:false});
      emit("m:"+cid,D.msgs[cid]); emit("chats",chats());
      setTimeout(()=>{ D.msgs[cid].forEach(x=>{ if(x.from===me) x.read=true; }); emit("m:"+cid,D.msgs[cid]); emit("typing",peer); },1500);
      setTimeout(()=>{ D.msgs[cid].push({id:Math.random().toString(36).slice(2),from:peer,type:"text",text:replies[Math.floor(Math.random()*replies.length)],at:Date.now(),read:false});
        if(S.peer!==peer) D.unread[cid]=(D.unread[cid]||0)+1; emit("m:"+cid,D.msgs[cid]); emit("chats",chats()); emit("typing",null); },3800); },
    async hideMessage(peer,id){ const cid=chatId(me,peer); (D.msgs[cid]||[]).forEach(x=>{ if(x.id===id) x.hiddenFor=[...(x.hiddenFor||[]),me]; }); emit("m:"+cid,D.msgs[cid]); },
    async deleteForAll(peer,m){ const cid=chatId(me,peer); (D.msgs[cid]||[]).forEach(x=>{ if(x.id===m.id){ x.type="deleted"; x.text=""; x.mediaId=null; } }); emit("m:"+cid,D.msgs[cid]); emit("chats",chats()); },
    async markRead(peer){ const cid=chatId(me,peer); D.unread[cid]=0; (D.msgs[cid]||[]).forEach(x=>{ if(x.from===peer) x.read=true; }); emit("chats",chats()); },
    async putMedia(d){ const id="m"+Math.random().toString(36).slice(2); D.media[id]=d; return id; },
    async getMedia(id){ return D.media[id]; },
    watchStatuses(cb){ return on("status",cb,get.status); },
    async postStatus(s){ D.statuses.push({id:"s"+Date.now(),...s,uid:me,at:Date.now(),expiresAt:Date.now()+864e5}); emit("status",D.statuses); },
    async deleteStatus(id){ D.statuses=D.statuses.filter(s=>s.id!==id); emit("status",D.statuses); },
    watchCalls(cb){ return on("calls",cb,get.calls); },
    watchIncoming(r,g){ ringCb=r; goneCb=g; return ()=>{}; },
    testIncoming(){ ringCb && ringCb({id:"in"+Date.now(),caller:"ahmed",callee:me,video:Math.random()>.5,status:"ringing",createdAt:Date.now(),demo:true}); },
    async startCall(peer,video,sess){ setTimeout(()=>{ if(!sess.startedAt&&!sess.closed) sess.onDoc&&sess.onDoc({ringingAt:Date.now()}); },900); sess.id="c"+Date.now(); const rec={id:sess.id,caller:me,callee:peer,video,status:"ringing",createdAt:Date.now()}; D.calls.push(rec); emit("calls",D.calls);
      sess.setStatus=st=>{ Object.assign(rec,st); emit("calls",D.calls); };
      sess.demoT=setTimeout(()=>{ rec.status="active"; rec.answeredAt=Date.now(); sess.onActive(); },2600); },
    async acceptCall(call,sess){ const rec={...call,status:"active",answeredAt:Date.now()}; D.calls.push(rec); sess.id=rec.id; sess.setStatus=st=>{ Object.assign(rec,st); emit("calls",D.calls); }; sess.onActive(); },
    declineCall(id){ D.calls.push({id,caller:"ahmed",callee:me,status:"declined",createdAt:Date.now()}); emit("calls",D.calls); },
    async hideCalls(ids){ D.calls.forEach(c=>{ if(ids.includes(c.id)) c.hiddenFor=[...(c.hiddenFor||[]),me]; }); emit("calls",D.calls); },
    onTyping(cb){ return on("typing",cb,()=>null); }
  };
}

/* Remote ICE candidates can arrive before the answer/offer is applied: hold them until it is. */
function queueIce(pc, sess){
  const pend = [];
  const put = c => { sess.logRemote(c); pc.addIceCandidate(new RTCIceCandidate(c)).catch(e=>sess.log("addIce-err "+(e&&e.name))); };
  const add = c => { if(pc.remoteDescription && pc.remoteDescription.type) put(c); else pend.push(c); };
  add.flush = () => { if(pend.length) sess.log("flush "+pend.length); pend.splice(0).forEach(put); };
  return add;
}
function preview(m){
  if(!m) return "";
  if(m.type==="deleted") return "🚫 This message was deleted";
  if(m.type==="location") return "📍 "+(m.text||"Location");
  if(m.type==="image"&&m.scan) return "📄 "+(m.text||"Scanned document");
  return {image:"📷 Photo",video:"🎥 Video",audio:"🎤 Voice message"}[m.type] ? ({image:"📷 Photo",video:"🎥 Video",audio:"🎤 Voice message"}[m.type] + (m.text?" · "+m.text:"")) : (m.text||"");
}

/* =========================  STATE  ========================= */
const api = DEMO ? makeDemo() : makeFire();
const PREFS = (()=>{ let p={}; try{ p=JSON.parse(localStorage.getItem("xappPrefs")||"{}"); }catch(e){} return {sounds:true, speakerVoice:false, theme:"system", ...p}; })();
async function applyTheme(){
  let dark;
  if(PREFS.theme==="aqua"){ PREFS.theme="system"; savePrefs(); }
  if(PREFS.theme==="lite"){   // classic: light screens with a black top bar and tabs
    document.documentElement.dataset.theme=PREFS.theme;
    try{ localStorage.setItem("xappTheme",PREFS.theme); }catch(e){}
    const m=document.getElementById("themeColor"); if(m) m.content="#0b0b0c";
    nat("Background","setBars",{dark:true}); return;
  }
  if(PREFS.theme==="dark") dark=true;
  else if(PREFS.theme==="light") dark=false;
  else if(isNative()){ try{ const r=await nat("Background","isDark"); dark=!!(r&&r.dark); }catch(e){ dark=false; } }
  else dark=!!(window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  try{ localStorage.setItem("xappTheme", dark ? "dark" : "light"); }catch(e){}
  const m=document.getElementById("themeColor"); if(m) m.content = dark ? "#0b0b0c" : "#ffffff";
  nat("Background","setBars",{dark});
}
function savePrefs(){ try{ localStorage.setItem("xappPrefs",JSON.stringify(PREFS)); }catch(e){} }
const S = { me:null, users:{}, chats:[], statuses:[], calls:[], tab:"chats", peer:null, msgs:[], unsubMsgs:null, q:"", typing:null, seenStatus:new Set(), mediaCache:new Map(), lastUnread:{} };
try{ JSON.parse(localStorage.getItem("xappSeen")||"[]").forEach(x=>S.seenStatus.add(x)); }catch(e){}

/* static icons */
$("#btnCam").innerHTML=ico("camera"); $("#btnMenu").innerHTML=ico("more"); $("#icoSearch").innerHTML=ico("search");
$("#icoGal").innerHTML=ico("image"); $("#icoLoc").innerHTML=ico("pinloc"); $("#icoScan").innerHTML=ico("scan");
$("#tiChats").innerHTML=ico("chat"); $("#tiUpd").innerHTML=ico("updates"); $("#tiCalls").innerHTML=ico("phone"); $("#tiCont").innerHTML=ico("users"); $("#tiSet").innerHTML=ico("settings"); $("#icoCamA").innerHTML=ico("camera"); $("#icoVid").innerHTML=ico("video");

/* =========================  AUTH  ========================= */
let signupMode=false;
$("#demoNote").hidden=!DEMO;
/* keyboard-friendly login: Next moves on without closing the keyboard; the field you type in stays visible */
["#lgName","#lgUser"].forEach((q,i,arr)=>{ $(q).addEventListener("keydown",e=>{ if(e.key==="Enter"){ e.preventDefault(); const nx=q==="#lgName"?"#lgUser":"#lgPass"; $(nx).focus(); } }); });
["#lgName","#lgUser","#lgPass"].forEach(q=>$(q).addEventListener("focus",e=>{ setTimeout(()=>{ try{ e.target.scrollIntoView({block:"center",behavior:"smooth"}); }catch(_){} },320); }));
$("#lgForgot").onclick=async()=>{ const u=$("#lgUser").value.trim();
  if(!u.includes("@")){ $("#lgErr").textContent="Type the email you signed up with, then tap Forgot password. Accounts made with only a username can't reset by email."; return; }
  try{ await api.resetPassword(u); $("#lgErr").textContent=""; toast("Password reset email sent to "+u); }
  catch(e){ $("#lgErr").textContent="Could not send the reset email. Check the address."; } };
$("#lgSwap").onclick=()=>{ signupMode=!signupMode; $("#lgForgot").hidden=signupMode; $("#lgName").hidden=!signupMode; $("#lgBtn").textContent=signupMode?"Create account":"Sign in"; $("#lgSwap").textContent=signupMode?"Already have an account? Sign in":"New here? Create account"; };
$("#loginForm").onsubmit=async e=>{
  e.preventDefault(); $("#lgErr").textContent=""; $("#lgBtn").disabled=true;
  if("Notification" in window && Notification.permission==="default") Notification.requestPermission().catch(()=>{});
  try{
    const u=$("#lgUser").value, p=$("#lgPass").value, n=$("#lgName").value.trim();
    if(signupMode) await api.signup(u,p,n||u); else await api.login(u,p,n);
    bgSignIn(u,p);
  }catch(err){
    const c=err&&err.code||""; $("#lgErr").textContent =
      c.includes("invalid-credential")||c.includes("wrong-password")||c.includes("user-not-found") ? "Wrong username or password." :
      c.includes("email-already") ? "That email or username is already used. Sign in instead, or pick another." :
      c.includes("invalid-email") ? "That email address doesn't look right." :
      c.includes("weak-password") ? "Password needs at least 6 characters." : "Could not sign in. Check your connection and try again.";
  }
  $("#lgBtn").disabled=false;
};

let subs=[];
function hideBoot(){ nat("Background","appReady"); const b=$("#boot"); if(!b||b.classList.contains("out")) return; requestAnimationFrame(()=>{ b.classList.add("out"); setTimeout(()=>b.remove(),260); }); }
setTimeout(hideBoot, 6000);   // never stay on the boot screen
api.onAuth(user=>{
  hideBoot();
  subs.forEach(f=>f&&f()); subs=[];
  if(!user){ $("#login").hidden=false; $("#shell").hidden=true;
    if(signupMode) $("#lgSwap").click();   // always come back to the sign-in form
    $("#lgPass").value=""; return; }
  S.me=user; $("#login").hidden=true; $("#shell").hidden=false; $("#mTest").hidden=!api.demo;
  subs.push(api.watchUsers(us=>{ S.users={}; us.forEach(u=>S.users[u.uid]=u);
    const mine=S.users[S.me.uid]; if(mine && (mine.blocked||mine.deleted)){ toast(mine.deleted?"This account was removed":"This account has been blocked by Xapp"); api.logout(); return; }
    if(call && S.users[call.peer]){ const h2=$("#call h2"), av=$("#call .info .av"); if(h2 && h2.textContent!==S.users[call.peer].name){ h2.textContent=S.users[call.peer].name; if(av) av.outerHTML=avatar(S.users[call.peer], av.className.replace(/^av\s*/,"")); } } if(S.users[S.me.uid]) S.me={...S.me,...S.users[S.me.uid]}; renderList(); if(S.peer) renderChatHead(); }));
  subs.push(api.watchChats(cs=>{ notifyNew(cs); S.chats=cs; api.wantUsers(cs.flatMap(c=>isGroup(c.id)?(c.members||[]):[peerOf(c)]));
    if(isGroup(S.peer) && !cs.some(c=>c.id===S.peer)){ toast("You're no longer in this group"); closeChat(); }
    else if(isGroup(S.peer)) renderChatHead();
    renderList(); }));
  subs.push(api.watchStatuses(st=>{ S.statuses=st; if(S.tab==="updates") renderList(); }));
  subs.push(api.watchCalls(cl=>{ S.calls=cl.sort((a,b)=>b.createdAt-a.createdAt); api.wantUsers(cl.map(c=>c.caller===S.me.uid?c.callee:c.caller)); renderList(); }));
  { let un=api.watchIncoming(incoming, gone); api._reIncoming=()=>{ try{un();}catch(e){} un=api.watchIncoming(incoming, gone); }; subs.push(()=>un()); }
  subs.push(api.watchAnnouncements(showAnnouncement));
  if(api.isAdmin) api.isAdmin().then(v=>{ S.isAdmin=v; if(v&&S.tab==="settings") renderList(true); });
  if(api.onTyping) subs.push(api.onTyping(p=>{ S.typing=p; if(S.peer) renderChatHead(); }));
  if(isNative()){ nat("Background","takeCallAction").then(takeCallAction); bgRefresh(); nat("Background","start"); setTimeout(bgEnsure,4000); setTimeout(pushSetup,2500); }
  cfIce();
  api.seenNow(); api.cleanProfile(); setActive(true);
});
/* Battery: while Xapp is in the background only the call/message listeners stay on. The "online" signal and
   contacts' online status stop, and start again when Xapp comes back on screen. */
function setActive(on){
  if(!S.me) return;
  if(on){ api._bg=false; api.ping(); clearInterval(S.pingT); S.pingT=setInterval(()=>{ if(!api._bg) api.ping(); },60000); api._presence&&api._presence(true); if(S.peer) api.markRead(S.peer); }
  else if(!api._bg){ api._bg=true; clearInterval(S.pingT); S.pingT=0; api._presence&&api._presence(false); api.seenNow(); }
}
document.addEventListener("visibilitychange",()=>setActive(!document.hidden));
natOn("App","appStateChange", st=>setActive(!!(st&&st.isActive)));

/* message from Xapp (sent from the admin panel), shown once */
function showAnnouncement(list){
  const a=list&&list[0]; if(!a||!a.text) return;
  let seen=0; try{ seen=+localStorage.getItem("xappAnnSeen")||0; }catch(e){}
  if(a.at<=seen || Date.now()-a.at>14*864e5) return;
  const sh=$("#pop"); if(!sh.hidden) return setTimeout(()=>showAnnouncement(list),4000);
  sh.innerHTML=`<div class="popbg" data-close></div><div class="popcard" role="dialog" aria-label="Message from Xapp"><div class="grip"></div>
    <div style="padding:6px 20px 4px;font-weight:600;font-size:16px">${esc(a.title||"Xapp")}</div>
    <div class="msgprev" style="white-space:pre-wrap">${esc(a.text)}</div>
    <div class="acts" style="padding-top:0"><button data-close style="justify-content:center;color:var(--orange);font-weight:600">OK</button></div></div>`;
  sh.hidden=false; requestAnimationFrame(()=>sh.classList.add("open"));
  sh.onclick=e=>{ if(!e.target.closest("[data-close]")) return; try{ localStorage.setItem("xappAnnSeen",String(a.at)); }catch(err){}
    sh.classList.remove("open"); setTimeout(()=>{ sh.hidden=true; sh.innerHTML=""; },180); };
}
/* report a user to the Xapp admin */
function reportMenu(uid){
  const u=S.users[uid]||{name:"this user"}, sh=$("#pop");
  sh.innerHTML=`<div class="popbg" data-close></div><div class="popcard" role="dialog" aria-label="Report"><div class="grip"></div>
    <div class="msgprev">Report ${esc(u.name)}? Xapp will review this account. Your chat stays private.</div>
    <div class="acts">${["Spam","Abuse or harassment","Fake account","Something else"].map(r=>`<button data-r="${r}" class="del">${ico("bell")}${r}</button>`).join("")}</div>
    <div class="acts" style="padding-top:0"><button data-close style="justify-content:center;color:var(--mute)">Cancel</button></div></div>`;
  sh.hidden=false; requestAnimationFrame(()=>sh.classList.add("open"));
  const done=()=>{ sh.classList.remove("open"); setTimeout(()=>{ sh.hidden=true; sh.innerHTML=""; },180); };
  sh.onclick=async e=>{ if(e.target.closest("[data-close]")) return done(); const b=e.target.closest("[data-r]"); if(!b) return; done();
    try{ await api.report(uid,b.dataset.r); toast("Report sent. Thank you"); }catch(err){ toast("Couldn't send the report. Check your connection."); } };
}
function notifyNew(cs){
  cs.forEach(c=>{ const n=c["unread_"+S.me.uid]||0, was=S.lastUnread[c.id]??n; S.lastUnread[c.id]=n;
    if(n>was && (document.hidden || S.peer!==peerOf(c))){
      const u=isGroup(c.id)?{name:c.name}:S.users[peerOf(c)]; beep();
      const body=isGroup(c.id)&&c.lastFrom?nameOf(c.lastFrom)+": "+c.last:c.last;
      if(document.hidden && "Notification" in window && Notification.permission==="granted"){ try{ new Notification(u?u.name:"Xapp",{body,tag:c.id}); }catch(e){} }
    }});
}

/* =========================  LIST PANE  ========================= */
function setTab(t){ S.tab=t; document.querySelectorAll(".tabs button").forEach(x=>x.setAttribute("aria-selected",x.dataset.tab===t)); $("#list").scrollTop=0; renderList(true); }
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
$("#q").oninput=e=>{ S.q=e.target.value.toLowerCase(); renderList(); };
$("#btnMenu").onclick=e=>{ e.stopPropagation(); $("#menu").hidden=!$("#menu").hidden; };
document.addEventListener("click",()=>{ $("#menu").hidden=true; $("#attach").hidden=true; });
$("#menu").onclick=e=>{ const a=e.target.dataset.act; if(!a) return;
  if(a==="settings") setTab("settings"); if(a==="contacts") setTab("contacts"); if(a==="logout") api.logout(); if(a==="testcall") api.testIncoming(); };
$("#btnCam").onclick=()=>$("#fStatus").click();
$("#fab").onclick=()=>{ if(S.tab==="chats") openContacts("chat"); else if(S.tab==="calls") openContacts("call"); else openStatusText(); };

function myCalls(){ return S.calls.filter(c=>!(c.hiddenFor||[]).includes(S.me.uid) && (c.status!=="ringing"||Date.now()-c.createdAt>60000)); }
/* missed-call badge: cleared once the Calls tab has been opened */
function callsSeenAt(){ try{ return +localStorage.getItem("xappCallsSeen")||0; }catch(e){ return 0; } }
function seenCalls(){ const before=callsSeenAt(); try{ localStorage.setItem("xappCallsSeen",String(Date.now())); }catch(e){}
  if(Date.now()-before>3000) nat("Background","clearMissed"); }
function renderList(force){
  if(!S.me) return;
  const L=$("#list"), q=S.q;
  if(S.tab==="settings" && L.dataset.shown==="settings" && !force) return;   // don't wipe the settings page on live updates
  L.dataset.shown=S.tab;
  $("#fab").hidden = S.tab==="contacts" || S.tab==="settings";
  document.querySelector(".search").hidden = S.tab==="settings";
  const totalUnread=S.chats.reduce((a,c)=>a+(c["unread_"+S.me.uid]?1:0),0);
  $("#unreadAll").hidden=!totalUnread; $("#unreadAll").textContent=totalUnread;
  if(S.tab==="calls") seenCalls();
  const since=Math.max(Date.now()-864e5, callsSeenAt());
  const missed=S.tab==="calls"?0:myCalls().filter(c=>c.callee===S.me.uid && !c.answeredAt && c.status!=="ringing" && c.createdAt>since).length;
  $("#missedAll").hidden=!missed; $("#missedAll").textContent=missed;
  $("#fab").innerHTML = S.tab==="chats"?ico("chat"):S.tab==="calls"?ico("phone"):ico("text");
  $("#fab").setAttribute("aria-label", S.tab==="chats"?"New chat":S.tab==="calls"?"New call":"Text status");

  const bgBanner = isNative()&&!api.demo&&S.bg&&!S.bg.signedIn ? `<button class="set" data-set="bgOn" style="background:color-mix(in srgb,var(--orange) 12%,transparent)"><span class="si" style="color:var(--orange)">${ico("phone")}</span><span class="st"><b>Turn on background calls</b><small>So calls ring when Xapp is closed</small></span></button>` : "";
  if(S.tab==="chats"){
    const F=S.chatFilter||"all", unreadN=S.chats.filter(c=>(c["unread_"+S.me.uid]||0)>0).length, hasG=S.chats.some(c=>isGroup(c.id));
    const chips=`<div class="fchips" role="tablist" aria-label="Filter chats">${[["all","All"],["unread","Unread"+(unreadN?" "+unreadN:"")],["groups","Groups"]].filter(([k])=>k!=="groups"||hasG).map(([k,l])=>`<button class="fchip" role="tab" aria-selected="${F===k}" data-filter="${k}">${l}</button>`).join("")}</div>`;
    const rows=S.chats.filter(c=>c.lastAt).filter(c=>F==="unread"?(c["unread_"+S.me.uid]||0)>0:F==="groups"?isGroup(c.id):true).sort((a,b)=>b.lastAt-a.lastAt).map(c=>{ const g=isGroup(c.id);
      const u=g?{uid:c.id,name:c.name||"Group",group:true}:(S.users[peerOf(c)]||{uid:peerOf(c),name:"Contact"});
      if(q && !(u.name||"").toLowerCase().includes(q) && !(c.last||"").toLowerCase().includes(q)) return "";
      const n=c["unread_"+S.me.uid]||0;
      const tick=g?(c.lastFrom&&c.lastFrom!==S.me.uid&&!/^(created|added|removed|left|changed|made)/.test(c.last||"")?`<b style="font-weight:500">${esc(nameOf(c.lastFrom))}:</b> `:""):c.lastFrom===S.me.uid?ico("checks"):"";
      if(g) return `<button class="row" data-open="${esc(c.id)}">${groupAvatar(c)}<div class="mid"><div class="top"><span class="name">${esc(u.name)}</span><span class="time ${n?"hot":""}">${listTime(c.lastAt)}</span></div>
        <div class="sub"><span>${tick}${esc(c.last)}</span>${n?`<span class="badge">${n}</span>`:""}</div></div></button>`;
      return `<button class="row" data-open="${esc(u.uid)}">${avatar(u,"",isOnline(u))}<div class="mid"><div class="top"><span class="name">${esc(u.name)}</span><span class="time ${n?"hot":""}">${listTime(c.lastAt)}</span></div>
        <div class="sub"><span>${tick}${esc(c.last)}</span>${n?`<span class="badge">${n}</span>`:""}</div></div></button>`; }).join("");
    L.innerHTML = bgBanner + chips + (rows || `<div class="empty">${F==="unread"?"No unread chats":F==="groups"?"No groups yet.<br>Tap the orange button → New group.":"No chats yet.<br>Tap the orange button to start a chat."}</div>`);
  }
  if(S.tab==="updates"){
    const mine=S.statuses.filter(s=>s.uid===S.me.uid&&s.expiresAt>Date.now());
    const known=new Set(myContacts().map(u=>u.uid));
    const byUser={}; S.statuses.filter(s=>s.uid!==S.me.uid&&known.has(s.uid)&&s.expiresAt>Date.now()).forEach(s=>(byUser[s.uid]=byUser[s.uid]||[]).push(s));
    const groups=Object.entries(byUser).map(([uid,a])=>({uid,a:a.sort((x,y)=>x.at-y.at)})).sort((x,y)=>y.a[y.a.length-1].at-x.a[x.a.length-1].at);
    const fresh=groups.filter(g=>g.a.some(s=>!S.seenStatus.has(s.id))), seen=groups.filter(g=>!fresh.includes(g));
    const row=g=>{ const u=S.users[g.uid]||{name:"Contact",uid:g.uid}; if(q&&!(u.name||"").toLowerCase().includes(q)) return "";
      return `<button class="row" data-story="${esc(g.uid)}"><span class="ring ${fresh.includes(g)?"":"seen"}">${avatar(u)}</span><div class="mid"><div class="top"><span class="name">${esc(u.name)}</span></div><div class="sub"><span>${listTime(g.a[g.a.length-1].at)} · ${g.a.length} update${g.a.length>1?"s":""}</span></div></div></button>`; };
    L.innerHTML = `<button class="row" data-story="${mine.length?esc(S.me.uid):""}" data-mystatus="1">${mine.length?`<span class="ring">${avatar(S.me)}</span>`:avatar(S.me,"",false)}
      <div class="mid"><div class="top"><span class="name">My status</span></div><div class="sub"><span>${mine.length?`${mine.length} update${mine.length>1?"s":""} · tap to view`:"Tap to add a photo or text update"}</span></div></div></button>
      ${fresh.length?`<div class="sec">Recent updates</div>${fresh.map(row).join("")}`:""}
      ${seen.length?`<div class="sec">Viewed</div>${seen.map(row).join("")}`:""}
      ${!groups.length?`<div class="empty">Updates disappear after 24 hours.<br>Share a photo or a few words with your contacts.</div>`:""}`;
  }
  if(S.tab==="calls"){
    const all=myCalls();
    const rows=all.slice(0,100).map(c=>{
      const out=c.caller===S.me.uid, pid=out?c.callee:c.caller, u=S.users[pid]||{uid:pid,name:"Contact"};
      if(q&&!(u.name||"").toLowerCase().includes(q)) return "";
      const missedC=!out&&!c.answeredAt, len=c.answeredAt&&c.endedAt?" · "+dur((c.endedAt-c.answeredAt)/1000):"";
      const lab=out?(c.answeredAt?"Outgoing":"No answer"):(missedC?"Missed":"Incoming");
      return `<div class="row" data-callrow="${esc(c.id)}" role="button" tabindex="0" style="cursor:pointer">${avatar(u)}<div class="mid" style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><div class="top"><span class="name ${missedC?"miss":""}">${esc(u.name)}</span></div>
        <div class="sub"><span><span class="${out?"in":missedC?"miss":"in"}">${ico(out?"out":"inn")}</span>${lab} · ${listTime(c.createdAt)}${len}</span></div></div>
        <button class="callbtn" data-call="${esc(pid)}" data-video="${c.video?1:0}" aria-label="Call back">${ico(c.video?"video":"phone")}</button></div></div>`; }).join("");
    const head = all.length ? `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px 2px"><span class="sec" style="padding:0">Recent · ${all.length}</span><button class="clearbtn" data-clearcalls="1">Clear all</button></div>` : "";
    L.innerHTML = head + (rows || `<div class="empty">No calls yet.<br>Voice and HD video calls to any contact.</div>`);
  }
  if(S.tab==="contacts"){
    const all=myContacts();
    const list=all.filter(u=>!q||(u.name||"").toLowerCase().includes(q)||(u.username||"").includes(q));
    const on=list.filter(isOnline);
    const row=u=>`<div class="row"><button style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;text-align:left" data-open="${esc(u.uid)}">${avatar(u,"",isOnline(u))}
        <div class="mid"><div class="top"><span class="name">${esc(u.name)}</span></div><div class="sub"><span>${isOnline(u)?'<span class="in">online</span>':esc(u.about||"@"+(u.username||""))}</span></div></div></button>
      <button class="callbtn" data-call="${esc(u.uid)}" data-video="0" aria-label="Voice call ${esc(u.name)}">${ico("phone")}</button><button class="callbtn" data-call="${esc(u.uid)}" data-video="1" aria-label="Video call ${esc(u.name)}">${ico("video")}</button></div>`;
    const addRow=`<button class="row" data-add="1"><span class="av" style="background:var(--orange);color:var(--on-orange)">${ico("plus")}</span><div class="mid"><div class="top"><span class="name">Add contact</span></div><div class="sub"><span>Find people by username or email</span></div></div></button>`;
    L.innerHTML = addRow + (!all.length ? `<div class="empty">No contacts yet.<br>Tap Add contact and type a family member's or friend's Xapp username or email.</div>`
      : (on.length?`<div class="sec">Online now · ${on.length}</div>${on.map(row).join("")}`:"") + `<div class="sec">All contacts · ${list.length}</div>${list.map(row).join("")||'<div class="empty">No match.</div>'}`);
  }
  if(S.tab==="settings") renderSettings(L);
}

/* compact row: badge icon · title (+ short hint) · value / switch / chevron */
function srow(act,icon,title,opt={}){
  const right = opt.right!==undefined ? opt.right : `<span class="chev">${ico("chev")}</span>`;
  return `<button class="sr${opt.danger?" danger":""}" data-set="${act}"><span class="bd">${ico(icon)}</span><span class="tx"><b>${title}</b>${opt.sub?`<small class="${opt.warn?"warn":""}">${opt.sub}</small>`:""}</span>${opt.val?`<span class="vl">${opt.val}</span>`:""}${right}</button>`;
}
function state(on){ return `<span class="vl"><span class="dot ${on?"":"off"}"></span>${on?"On":"Off"}</span>`; }
function bgSection(){
  const b=S.bg||{};
  const allOk=b.signedIn&&b.notifications&&b.batteryUnrestricted&&b.microphone!==false&&b.fullScreenAllowed!==false&&b.callPopup!==false;
  const r=(act,icon,title,on,hint)=>srow(act,icon,title,{right:state(on), sub:on?"":hint, warn:!on});
  return `<div class="sg-h">Ring when closed${S.bg?(allOk?" · ready":" · needs setup"):""}</div><div class="sg">
    ${r("bgOn","phone","Background calls",!!b.signedIn,"Tap and enter your password")}
    ${r("bgNotif","bell","Notifications",!!b.notifications,"Tap to allow")}
    ${r("bgMic","mic","Microphone",b.microphone!==false,"Tap › Permissions › Allow")}
    ${r("bgFull","full","Full-screen calls",b.fullScreenAllowed!==false,"Tap and switch on")}
    ${r("bgPop","bell","Call pop-up",b.callPopup!==false,"Tap › turn on Pop on screen")}
    ${r("bgBattery","battery","Battery unrestricted",!!b.batteryUnrestricted,"Tap and choose Allow")}
    ${srow("bgAuto","rocket","Auto-launch",{val:b.manufacturer?esc(b.manufacturer):""})}
    ${srow("bgPush","battery","Battery saver ringing",{right:state(!!(S.push&&S.push.on)), sub:!S.push?"Checking…":S.push.on?"Google push wakes the phone, like WhatsApp":!S.push.token||!S.push.worker?"Not available: "+esc(S.push.err||"no push"):"Off · always-on connection (uses more battery)", warn:!!(S.push&&!S.push.on&&(!S.push.token||!S.push.worker))})}
    ${srow("bgTest","phone","Test ringing",{sub:"Tap, then press Home. It rings in 8 seconds"})}
    <div id="bgDiag" style="padding:8px 14px 12px;font-size:12px;line-height:1.5;color:var(--muted,#888)"></div>
  </div>`;
}
/* what the background service last did (written by the phone itself), so problems can be read off a screenshot */
async function fillBgDiag(){
  const el=$("#bgDiag"); if(!el||!api.getDiag) return;
  const d=await api.getDiag(); if(!$("#bgDiag")) return;
  const t=v=>{ if(!v) return "never"; const x=new Date(v); return x.toLocaleDateString([], {day:"numeric",month:"short"})+" "+x.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}); };
  if(!d){ $("#bgDiag").innerHTML="Background check: <b>no report from this phone yet</b>"; return; }
  $("#bgDiag").innerHTML=[
    `Background check · ${esc(d.device||"")}`,
    `Listener started: <b>${t(d.startedAt)}</b>`,
    `Last call noticed: <b>${t(d.lastCallSeenAt)}</b>${d.lastCallSeenAt?(d.inForeground?" (app open)":" (app closed)"):""}`,
    `Last ring shown: <b>${t(d.lastRingShownAt)}</b>`,
    d.callListenerError?`<span style="color:#e5484d">Error ${t(d.errAt)}: ${esc(String(d.callListenerError).slice(0,120))}</span>`:""
  ].filter(Boolean).join("<br>");
}
function renderSettings(L){
  const u=S.me, b=S.bg||{};
  const bgOk=!isNative()||api.demo||(b.signedIn&&b.notifications&&b.batteryUnrestricted&&b.microphone!==false&&b.fullScreenAllowed!==false&&b.callPopup!==false);
  const themeName={system:"System default",light:"Light",dark:"Dark",lite:"Lite"}[PREFS.theme]||"System default";
  const row=(page,icon,title,sub,warn)=>`<button class="wset" data-page="${page}"><span class="wi">${ico(icon)}</span><span class="wt"><b>${title}</b>${sub?`<small class="${warn?"warn":""}">${sub}</small>`:""}</span>${warn?`<span class="wdot" aria-label="Needs attention"></span>`:""}</button>`;
  L.innerHTML=`<div class="wsp">
    <button class="wme" data-set="profile">${avatar(u,"",false)}<span class="wt"><b>${esc(u.name)}</b><small>${esc(u.about||"@"+(u.username||""))}</small></span><span class="wqr">${ico("chev")}</span></button>
    ${row("account","user","Account","Username, sign out")}
    ${row("chats","chat","Chats","Theme · "+themeName)}
    ${row("notif","bell","Notifications","Message sounds"+(PREFS.sounds?" on":" off"))}
    ${row("calls","phone","Calls", isNative()&&!api.demo ? (bgOk?"Ringing when closed is ready":"Ringing when closed needs setup") : "Speaker, connection test", !bgOk)}
    ${row("contacts","users","Contacts", myContacts().length+" contacts")}
    ${S.isAdmin?row("admin","shield","Admin panel","Users, calls, reports, announcements"):""}
    ${row("help","info","Help","About Xapp, version")}
    <div class="wfoot">from<br><b>Xapp</b><span>Founder Mohammed Razeem</span></div>
  </div>`;
  if(S.setPage && !$("#sheet").hidden && $("#sheet").dataset.page===S.setPage) openSettingsPage(S.setPage);   // keep an open page up to date
}
/* one settings page (opens over the app like WhatsApp's sub-screens) */
function openSettingsPage(page){
  const sh=$("#sheet"), u=S.me, sw=k=>`<span class="switch ${PREFS[k]?"on":""}" role="switch" aria-checked="${!!PREFS[k]}"></span>`;
  const radio=(k,l,sub)=>`<button class="wset" data-set="theme:${k}" role="radio" aria-checked="${PREFS.theme===k}"><span class="wradio ${PREFS.theme===k?"on":""}"></span><span class="wt"><b>${l}</b>${sub?`<small>${sub}</small>`:""}</span></button>`;
  const T={account:"Account", chats:"Chats", notif:"Notifications", calls:"Calls", help:"Help"}[page]; if(!T) return;
  let body="";
  if(page==="account") body=`<div class="wsec">Your account</div>
      ${srow("profile","user","Profile",{sub:esc(u.name)+" · @"+esc(u.username||"")})}
      ${u.email&&!/@xapp\.local$/.test(u.email)?srow("noop","mail","Email",{sub:esc(u.email),right:""}):""}
      ${S.isAdmin?srow("admin","shield","Admin panel",{sub:"Users, calls, reports, announcements"}):""}
      <div class="wsec"></div>
      ${srow("logout","logout","Sign out",{danger:true,right:""})}`;
  if(page==="chats") body=`<div class="wsec">Theme</div>
      ${radio("system","System default","Follows your phone")}${radio("light","Light")}${radio("dark","Dark")}${radio("lite","Lite","Light with black bars")}`;
  if(page==="notif") body=`<div class="wsec">Messages</div>
      ${srow("sounds","bell","Message sounds",{right:sw("sounds"), sub:"Sound and notification for new messages"})}
      ${"Notification" in window&&!isNative()?srow("alerts","bell","Pop-up alerts",{sub:"Show alerts when this tab is in the background"}):""}
      ${isNative()&&!api.demo?srow("bgNotif","bell","Phone notification settings",{sub:"Sounds, pop-ups and badges"}):""}`;
  if(page==="calls") body=`<div class="wsec">Calls</div>
      ${srow("speakerVoice","speaker","Voice calls on speaker",{right:sw("speakerVoice")})}
      ${srow("net","wifi","Test connection",{sub:"Checks the relay servers for clear calls"})}
      <div class="wsec">Relay for calls</div>
      ${Object.entries(RELAYS).map(([k,l])=>`<button class="wset" data-set="relay:${k}" role="radio" aria-checked="${(PREFS.relay||"auto")===k}"><span class="wradio ${(PREFS.relay||"auto")===k?"on":""}"></span><span class="wt"><b>${l}</b>${k==="auto"?"<small>Recommended</small>":""}</span></button>`).join("")}
      <div class="wnote">The person you call uses your choice too. To compare, call once with each relay and tap the signal bars during the call to see the delay.</div>
      ${isNative()&&!api.demo?bgSection():""}`;
  if(page==="help") body=`<div class="about" style="margin:14px 16px"><img src="splash-icon.png" alt=""><span style="flex:1;min-width:0"><b>Xapp</b><small>Chat · Call · Updates · <span id="appVer">v${esc(APP_VERSION)}</span></small><small>Founder: <span class="fd">Mohammed Razeem</span></small></span></div>
      <div class="wsec">Help</div>
      ${srow("net","wifi","Call quality check",{sub:"Test the connection used for calls"})}
      ${isNative()&&!api.demo?srow("calls2","phone","Calls not ringing?",{sub:"Check the ringing settings"}):""}`;
  sh.dataset.page=page; S.setPage=page;
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:18px">${T}</b></div></header><div class="list wpage">${body}</div>`;
  sh.hidden=false;
  sh.onclick=e=>{ if(e.target.closest("[data-close]")){ sh.hidden=true; S.setPage=null; delete sh.dataset.page; renderList(true); return; }
    const st=e.target.closest("[data-set]"); if(st && st.dataset.set==="calls2") return openSettingsPage("calls");
    if(st) settingAction(st); };
  if(page==="calls") fillBgDiag();
  if(page==="help") nat("App","getInfo").then(i=>{ if(i&&i.version){ const v=$("#appVer"); if(v) v.textContent="v"+i.version; } });
}
const APP_VERSION="1.0";
$("#list").onclick=e=>{
  const fl=e.target.closest("[data-filter]"); if(fl){ S.chatFilter=fl.dataset.filter; return renderList(true); }
  if(e.target.closest("[data-add]")) return openAddContact();
  const pg=e.target.closest("[data-page]"); if(pg){ const k=pg.dataset.page;
    if(k==="contacts") return setTab("contacts"); if(k==="admin"){ location.href="admin.html"; return; }
    return openSettingsPage(k); }
  const st=e.target.closest("[data-set]"); if(st) return settingAction(st);
  const o=e.target.closest("[data-open]"); if(o) return openChat(o.dataset.open);
  const c=e.target.closest("[data-call]"); if(c) return startCall(c.dataset.call, c.dataset.video==="1");
  if(e.target.closest("[data-clearcalls]")) return confirmClearCalls();
  const cr=e.target.closest("[data-callrow]"); if(cr) return callActions(cr.dataset.callrow);
  const s=e.target.closest("[data-story]"); if(s){ if(s.dataset.mystatus && !s.dataset.story) return chooseStatus(); return openStory(s.dataset.story); }
};
function settingAction(st){ { const a=st.dataset.set;
    if(a==="noop") return;
    if(a.startsWith("relay:")){ PREFS.relay=a.slice(6); savePrefs(); toast("Relay: "+RELAYS[PREFS.relay]); if(S.setPage) openSettingsPage(S.setPage); return; }
    if(a.startsWith("theme:")){ PREFS.theme=a.slice(6); savePrefs(); applyTheme().then(()=>{ renderList(true); if(S.setPage) openSettingsPage(S.setPage); if(S.peer) renderChatHead(); }); return; }
    if(a==="profile") return openProfile();
    if(a==="admin"){ location.href="admin.html"; return; }
    if(a==="uid"){ (navigator.clipboard?navigator.clipboard.writeText(S.me.uid):Promise.reject()).then(()=>toast("User ID copied")).catch(()=>toast(S.me.uid)); return; }
    if(a==="net") return netTest();
    if(a==="bgOn") return (S.bg&&S.bg.signedIn)?toast("Background calls are already on"):bgPasswordSheet();
    if(a==="bgNotif") return nat("Background","openNotificationSettings");
    if(a==="bgBattery") return nat("Background","requestBattery");
    if(a==="bgMic") return nat("Background","openAppInfo");
    if(a==="bgFull") return nat("Background","openFullScreenSettings");
    if(a==="bgPop") return nat("Background","openCallChannel");
    if(a==="bgTest"){ toast("Press Home now. Xapp will ring in 8 seconds");
      if(S.push&&S.push.on){ setTimeout(async()=>{ const r=await api.push("test",{to:S.me.uid}); if(!r||!r.ok){ nat("Background","testRing"); } },8000); return; }   // through Google push, like a real call
      return nat("Background","testRing"); }
    if(a==="bgPush"){ if(!S.push||!S.push.token||!S.push.worker){ toast("Google push isn't available on this phone yet"); return pushSetup(); }
      const turnOn=!S.push.on; try{ localStorage.setItem("xappAlwaysOn", turnOn?"0":"1"); }catch(e){}
      toast(turnOn?"Battery saver ringing on":"Always-on connection on"); return pushSetup(); }
    if(a==="bgOver") return nat("Background","openOverlaySettings");
    if(a==="bgAuto") return nat("Background","openAutostart");
    if(a==="logout") return api.logout();
    if(a==="alerts"){ Notification.requestPermission().then(p=>toast(p==="granted"?"Pop-up alerts are on":"Alerts are blocked in browser settings")); return; }
    if(a==="contactsTab") return setTab("contacts");
    if(a==="speakerVoice"||a==="sounds"){ PREFS[a]=!PREFS[a]; savePrefs(); if(a==="sounds") nat("Background","setMessageNotifications",{on:PREFS.sounds}); const s=st.querySelector(".switch"); s.classList.toggle("on",PREFS[a]); s.setAttribute("aria-checked",PREFS[a]); return; }
    return; }
}

/* =========================  CALL HISTORY  ========================= */
function callActions(id){
  const c=S.calls.find(x=>x.id===id); if(!c) return;
  const out=c.caller===S.me.uid, pid=out?c.callee:c.caller, u=S.users[pid]||{uid:pid,name:"Contact"};
  const when=new Date(c.createdAt).toLocaleString("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
  const len=c.answeredAt&&c.endedAt?" · "+dur((c.endedAt-c.answeredAt)/1000):"";
  const sh=$("#sheet");
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Call info</b></div></header>
    <div class="row" style="cursor:default">${avatar(u)}<div class="mid" style="border:0"><div class="top"><span class="name">${esc(u.name)}</span></div><div class="sub"><span>${c.video?"Video":"Voice"} · ${out?"Outgoing":(c.answeredAt?"Incoming":"Missed")} · ${esc(when)}${len}</span></div></div></div>
    <div class="acts">
      <button data-a="voice">${ico("phone")}Voice call</button>
      <button data-a="video">${ico("video")}Video call</button>
      <button data-a="chat">${ico("chat")}Message</button>
      <button data-a="del" class="del">${ico("trash")}Delete from call history</button>
    </div>`;
  sh.hidden=false;
  sh.onclick=async e=>{ if(e.target.closest("[data-close]")) return sh.hidden=true;
    const b=e.target.closest("[data-a]"); if(!b) return; const a=b.dataset.a; sh.hidden=true;
    if(a==="voice") return startCall(pid,false);
    if(a==="video") return startCall(pid,true);
    if(a==="chat") return openChat(pid);
    if(a==="del"){ try{ await api.hideCalls([id]); toast("Call deleted"); }catch(err){ toast("Could not delete. Check your connection."); } } };
}
function confirmClearCalls(){
  const ids=myCalls().map(c=>c.id); if(!ids.length) return;
  const sh=$("#sheet");
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Clear call history</b></div></header>
    <div class="form"><p style="margin:0;line-height:1.5">Delete all ${ids.length} calls from your call history? This only clears your list. The other people keep theirs.</p>
    <button class="btn danger" id="ccYes" style="background:var(--bad);color:#fff;border:0">Clear all</button>
    <button class="btn ghost" data-close>Cancel</button></div>`;
  sh.hidden=false; sh.onclick=e=>{ if(e.target.closest("[data-close]")) sh.hidden=true; };
  $("#ccYes").onclick=async()=>{ sh.hidden=true; try{ await api.hideCalls(ids); toast("Call history cleared"); }catch(err){ toast("Could not clear. Check your connection."); } };
}

/* =========================  CONTACTS  ========================= */
/* Public app: you only see people you added, plus anyone you have chatted or called with */
function myContacts(){
  const me=S.users[S.me.uid]||S.me, ids=new Set(me.contacts||[]);
  S.chats.forEach(c=>{ if(isGroup(c.id)) return; const p=peerOf(c); if(p) ids.add(p); });
  S.calls.forEach(c=>ids.add(c.caller===S.me.uid?c.callee:c.caller));
  ids.delete(S.me.uid);
  return [...ids].map(id=>S.users[id]).filter(Boolean).sort((a,b)=>(a.name||"").localeCompare(b.name||""));
}
function isSaved(uid){ const me=S.users[S.me.uid]||S.me; return (me.contacts||[]).includes(uid); }
function openAddContact(){
  const sh=$("#sheet");
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Add contact</b></div></header>
    <form class="form" id="acForm"><label for="acQ">Username or email</label><input id="acQ" placeholder="e.g. sara or sara@gmail.com" autocapitalize="none" inputmode="email" required>
    <button class="btn" type="submit">Find</button>
    <p class="note">Ask your family and friends for their Xapp username, shown under their name in Settings. Your username is <b>@${esc(S.me.username||"")}</b>.</p></form>
    <div class="list" id="acRes" style="flex:0 1 auto"></div>`;
  sh.hidden=false; $("#acQ").focus();
  sh.onclick=async e=>{ if(e.target.closest("[data-close]")) return sh.hidden=true;
    const a=e.target.closest("[data-addc]"); if(a){ const uid=a.dataset.addc; api.wantUsers([uid]); await api.addContact(uid); toast("Contact added"); sh.hidden=true; openChat(uid); } };
  $("#acForm").onsubmit=async e=>{ e.preventDefault(); const r=$("#acRes"); r.innerHTML=`<div class="empty">Searching…</div>`;
    let found=[]; try{ found=await api.findUser($("#acQ").value); }catch(err){ r.innerHTML=`<div class="empty">Search failed. Check your connection.</div>`; return; }
    r.innerHTML = found.length ? found.map(u=>`<div class="row">${avatar(u)}<div class="mid" style="display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><div class="top"><span class="name">${esc(u.name||u.username)}</span></div><div class="sub"><span>@${esc(u.username||"")}</span></div></div>
      <button class="btn" style="padding:9px 16px" data-addc="${esc(u.uid)}">${isSaved(u.uid)?"Open chat":"Add"}</button></div></div>`).join("")
      : `<div class="empty">Nobody found with that username or email.<br>Check the spelling, or ask them to install Xapp first.</div>`; };
}
function openContacts(mode){
  const sh=$("#sheet"); const list=myContacts();
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">${mode==="call"?"New call":"Select contact"}</b><div style="font-size:12.5px;color:var(--head-mute)">${list.length} contacts</div></div></header>
    <label class="search"><span>${ico("search")}</span><input id="cq" placeholder="Search name" aria-label="Search name"></label>
    <div class="list" id="clist"></div>`;
  const draw=(q="")=>{ $("#clist").innerHTML = (mode==="call"?"":`<button class="row" data-newgroup="1"><span class="av" style="background:var(--orange);color:var(--on-orange)">${ico("users")}</span><div class="mid"><div class="top"><span class="name">New group</span></div><div class="sub"><span>Chat with several people at once</span></div></div></button>`) + `<button class="row" data-addnew="1"><span class="av" style="background:var(--orange);color:var(--on-orange)">${ico("plus")}</span><div class="mid"><div class="top"><span class="name">Add contact</span></div><div class="sub"><span>By username or email</span></div></div></button>` + (list.filter(u=>(u.name||"").toLowerCase().includes(q)).map(u=>`<div class="row">
      <button style="display:flex;gap:12px;align-items:center;flex:1;min-width:0;text-align:left" data-pick="${esc(u.uid)}">${avatar(u,"",isOnline(u))}<div class="mid"><div class="top"><span class="name">${esc(u.name)}</span></div><div class="sub"><span>${esc(u.about||"@"+(u.username||""))}</span></div></div></button>
      <button class="callbtn" data-c="${esc(u.uid)}" aria-label="Voice call">${ico("phone")}</button><button class="callbtn" data-v="${esc(u.uid)}" aria-label="Video call">${ico("video")}</button></div>`).join("")
      || `<div class="empty">No contacts yet. Tap Add contact above.</div>`); };
  draw(); sh.hidden=false;
  $("#cq").oninput=e=>draw(e.target.value.toLowerCase());
  sh.onclick=e=>{ if(e.target.closest("[data-close]")) return sh.hidden=true;
    if(e.target.closest("[data-addnew]")) return openAddContact();
    if(e.target.closest("[data-newgroup]")) return openNewGroup();
    const p=e.target.closest("[data-pick]"); if(p){ sh.hidden=true; return openChat(p.dataset.pick); }
    const c=e.target.closest("[data-c]"); if(c){ sh.hidden=true; return startCall(c.dataset.c,false); }
    const v=e.target.closest("[data-v]"); if(v){ sh.hidden=true; return startCall(v.dataset.v,true); } };
}

/* =========================  GROUPS  ========================= */
const UCOLORS=["#e8590c","#2f9e44","#1c7ed6","#ae3ec9","#d6336c","#0c8599","#f08c00","#5c7cfa"];
function userColor(uid){ let h=0; for(const ch of String(uid)) h=(h*31+ch.charCodeAt(0))|0; return UCOLORS[Math.abs(h)%UCOLORS.length]; }
function groupAvatar(g, cls=""){ const n=(g&&g.name||"G").trim(); return `<span class="av ${cls}" style="background:color-mix(in srgb,var(--orange) 22%,var(--panel));color:var(--orange)">${n?esc(n[0].toUpperCase()):ico("users")}</span>`; }
/* pick people: used to create a group and to add members */
function pickPeople(title, exclude, done, opts={}){
  const sh=$("#sheet"), list=myContacts().filter(u=>!exclude.includes(u.uid)), sel=new Set();
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">${esc(title)}</b><div style="font-size:12.5px;color:var(--head-mute)" id="pickN">Select people</div></div></header>
    ${opts.nameField?`<div class="form" style="padding-bottom:0"><label for="gName">Group name</label><input id="gName" maxlength="40" placeholder="e.g. Family" required></div>`:""}
    <div class="list" id="plist">${list.map(u=>`<button class="row" data-sel="${esc(u.uid)}">${avatar(u)}<div class="mid"><div class="top"><span class="name">${esc(u.name)}</span></div><div class="sub"><span>@${esc(u.username||"")}</span></div></div><span class="pick" aria-hidden="true"></span></button>`).join("")||`<div class="empty">No contacts yet. Add contacts first.</div>`}</div>
    <div style="padding:12px 16px calc(12px + env(safe-area-inset-bottom))"><button class="btn" id="pickGo" style="width:100%" disabled>${esc(opts.go||"Done")}</button></div>`;
  sh.hidden=false;
  const upd=()=>{ $("#pickN").textContent=sel.size?sel.size+" selected":"Select people"; $("#pickGo").disabled=!sel.size||(opts.nameField&&!$("#gName").value.trim()); };
  if(opts.nameField) $("#gName").oninput=upd;
  sh.onclick=async e=>{ if(e.target.closest("[data-close]")) return sh.hidden=true;
    const r=e.target.closest("[data-sel]"); if(r){ const id=r.dataset.sel; sel.has(id)?sel.delete(id):sel.add(id); r.classList.toggle("on",sel.has(id)); upd(); return; }
    if(e.target.closest("#pickGo")){ const b=$("#pickGo"); b.disabled=true; b.textContent="Please wait…";
      try{ await done([...sel], opts.nameField?$("#gName").value.trim():""); sh.hidden=true; }catch(err){ toast("Couldn't save. Check your connection."); b.disabled=false; b.textContent=opts.go||"Done"; } } };
}
function openNewGroup(){ pickPeople("New group", [], async (ids, name)=>{ const gid=await api.createGroup(name, ids); toast("Group created"); setTimeout(()=>openChat(gid),300); }, {nameField:true, go:"Create group"}); }
function openGroupInfo(gid){
  const g=groupOf(gid); if(!g) return; const sh=$("#sheet"), me=S.me.uid, admin=(g.admins||[]).includes(me);
  const mem=[...(g.members||[])].sort((a,b)=>(a===me?-1:b===me?1:nameOf(a).localeCompare(nameOf(b))));
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Group info</b></div></header>
    <div class="list">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:22px 16px 14px">${groupAvatar(g,"lg")}<b style="font-size:19px">${esc(g.name||"Group")}</b><small style="color:var(--mute)">Group · ${mem.length} members</small>
        ${admin?`<button class="btn sec" data-rename style="padding:8px 14px">Change name</button>`:""}</div>
      <div class="sec">${mem.length} members</div>
      ${admin?`<button class="row" data-add><span class="av" style="background:var(--orange);color:var(--on-orange)">${ico("plus")}</span><div class="mid"><div class="top"><span class="name">Add members</span></div></div></button>`:""}
      ${mem.map(id=>{ const u=S.users[id]||{uid:id,name:"Member"}; const isA=(g.admins||[]).includes(id);
        return `<button class="row" data-m="${esc(id)}">${avatar(u)}<div class="mid"><div class="top"><span class="name">${id===me?"You":esc(u.name)}</span>${isA?`<span class="time" style="color:var(--orange)">Admin</span>`:""}</div><div class="sub"><span>${esc(u.about||"@"+(u.username||""))}</span></div></div></button>`; }).join("")}
      <button class="row" data-leave style="color:#e5484d"><span class="av" style="background:transparent;color:#e5484d">${ico("back")}</span><div class="mid"><div class="top"><span class="name" style="color:#e5484d">Leave group</span></div></div></button>
    </div>`;
  sh.hidden=false;
  sh.onclick=async e=>{ if(e.target.closest("[data-close]")) return sh.hidden=true;
    if(e.target.closest("[data-rename]")){ const n=prompt("Group name", g.name||""); if(n&&n.trim()&&n.trim()!==g.name){ try{ await api.renameGroup(gid,n.trim().slice(0,40)); toast("Name changed"); sh.hidden=true; }catch(err){ toast("Only admins can do that"); } } return; }
    if(e.target.closest("[data-add]")) return pickPeople("Add members", g.members||[], async ids=>{ await api.addToGroup(gid, ids); toast("Added"); }, {go:"Add"});
    if(e.target.closest("[data-leave]")){ if(!confirm(`Leave "${g.name}"?`)) return; try{ await api.leaveGroup(gid); sh.hidden=true; closeChat(); toast("You left the group"); }catch(err){ toast("Couldn't leave. Check your connection."); } return; }
    const m=e.target.closest("[data-m]"); if(m){ const id=m.dataset.m; if(id===me) return;
      const acts=[["Message "+nameOf(id),"msg"]]; if(admin){ if(!(g.admins||[]).includes(id)) acts.push(["Make group admin","adm"]); acts.push(["Remove from group","rm"]); }
      memberMenu(id, acts, async a=>{ try{
        if(a==="msg"){ sh.hidden=true; openChat(id); }
        if(a==="adm"){ await api.makeAdmin(gid,id); toast("Done"); openGroupInfo(gid); }
        if(a==="rm"){ if(!confirm(`Remove ${nameOf(id)} from the group?`)) return; await api.removeFromGroup(gid,id); toast("Removed"); openGroupInfo(gid); }
      }catch(err){ toast("Couldn't do that. Check your connection."); } }); } };
}
function memberMenu(uid, acts, cb){
  const pop=$("#pop");
  pop.innerHTML=`<div class="popbg" data-close></div><div class="popcard" role="dialog" aria-label="${esc(nameOf(uid))}"><div class="grip"></div>
    <div class="msgprev">${esc(nameOf(uid))}</div><div class="acts">${acts.map(([l,k])=>`<button data-a="${k}" class="${k==="rm"?"del":""}">${ico(k==="rm"?"x":k==="adm"?"shield":"chat")}${esc(l)}</button>`).join("")}</div>
    <div class="acts" style="padding-top:0"><button data-close style="justify-content:center;color:var(--mute)">Cancel</button></div></div>`;
  pop.hidden=false; requestAnimationFrame(()=>pop.classList.add("open"));
  const done=()=>{ pop.classList.remove("open"); setTimeout(()=>{ pop.hidden=true; pop.innerHTML=""; },180); };
  pop.onclick=e=>{ if(e.target.closest("[data-close]")) return done(); const b=e.target.closest("[data-a]"); if(b){ done(); cb(b.dataset.a); } };
}

/* =========================  PROFILE  ========================= */
function openProfile(){
  const sh=$("#sheet"), u=S.me;
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Profile</b></div></header>
    <div class="form"><div style="display:flex;justify-content:center"><button id="pAv" aria-label="Change photo" style="position:relative">${avatar(u,"xl")}<span class="send" style="position:absolute;right:0;bottom:0;width:40px;height:40px">${ico("camera")}</span></button></div>
    <label for="pName">Name</label><input id="pName" value="${esc(u.name)}">
    <label for="pAbout">About</label><input id="pAbout" value="${esc(u.about||"")}">
    <p class="note">Username: <b>@${esc(u.username||"")}</b> · people find you by name.</p>
    <button class="btn" id="pSave">Save</button></div>`;
  sh.hidden=false;
  sh.onclick=e=>{ if(e.target.closest("[data-close]")) sh.hidden=true; };
  $("#pAv").onclick=()=>$("#fAvatar").click();
  $("#pSave").onclick=async()=>{ await api.updateProfile({name:$("#pName").value.trim()||u.name, about:$("#pAbout").value.trim()}); S.me={...S.me,name:$("#pName").value.trim()||u.name,about:$("#pAbout").value.trim()}; toast("Profile saved"); sh.hidden=true; renderList(true); };
}
$("#fAvatar").onchange=async e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
  const d=await shrinkImage(f,256,.8); await api.updateProfile({photo:d}); S.me.photo=d; toast("Photo updated"); if(!$("#sheet").hidden) openProfile(); renderList(true); };

/* =========================  CHAT  ========================= */
function openChat(uid){
  S.peer=uid; S.msgs=[]; if(S.unsubMsgs) S.unsubMsgs();
  $("#nochat").hidden=true; ["#chatHead","#wall","#composerWrap"].forEach(s=>$(s).hidden=false);
  $("#chatPane").classList.add("open"); renderChatHead(); renderComposer();
  $("#wall").innerHTML=`<div class="loading">Loading messages…</div>`;
  S.unsubMsgs=api.watchMessages(isGroup(uid)?uid:chatId(S.me.uid,uid), ms=>{ S.msgs=ms; renderMsgs(); if(!document.hidden) api.markRead(uid); });
  api.markRead(uid);
}
function closeChat(){ $("#chatPane").classList.remove("open"); if(S.unsubMsgs) S.unsubMsgs(); S.unsubMsgs=null; S.peer=null;
  if(innerWidth>=900){ $("#nochat").hidden=false; ["#chatHead","#wall","#composerWrap"].forEach(s=>$(s).hidden=true); } }
function renderChatHead(){
  if(isGroup(S.peer)){ const g=groupOf(S.peer)||{name:"Group",members:[]};
    const names=(g.members||[]).map(id=>id===S.me.uid?"You":(S.users[id]||{}).name).filter(Boolean);
    $("#chatHead").innerHTML=`<button class="ibtn back" id="cBack" aria-label="Back">${ico("back")}</button><button class="who" id="gInfo" style="text-align:left">${groupAvatar(g,"sm")}<div style="min-width:0"><b>${esc(g.name||"Group")}</b><small>${esc(names.join(", "))}</small></div></button>
      <button class="ibtn" id="cMore" aria-label="Group info">${ico("more")}</button>`;
    $("#cBack").onclick=closeChat; $("#gInfo").onclick=$("#cMore").onclick=()=>openGroupInfo(S.peer); return; }
  const u=S.users[S.peer]||{uid:S.peer,name:"Contact"};
  const sub = S.typing===S.peer ? `<small class="typing">typing…</small>` : `<small>${isOnline(u)?"online":u.lastSeen?"last seen "+(dayLabel(u.lastSeen)==="Today"?"today at ":dayLabel(u.lastSeen)+" at ")+hm(u.lastSeen):esc(u.about||"")}</small>`;
  $("#chatHead").innerHTML=`<button class="ibtn back" id="cBack" aria-label="Back">${ico("back")}</button><div class="who">${avatar(u,"sm")}<div style="min-width:0"><b>${esc(u.name)}</b>${sub}</div></div>
    <button class="ibtn" id="cVid" aria-label="Video call">${ico("video")}</button><button class="ibtn" id="cCall" aria-label="Voice call">${ico("phone")}</button><button class="ibtn" id="cMore" aria-label="More">${ico("more")}</button>`;
  $("#cMore").onclick=()=>reportMenu(S.peer);
  $("#cBack").onclick=closeChat; $("#cVid").onclick=()=>startCall(S.peer,true); $("#cCall").onclick=()=>startCall(S.peer,false);
}
function renderMsgs(){
  const W=$("#wall"), atBottom=W.scrollHeight-W.scrollTop-W.clientHeight<120; let html="", lastDay="", lastFrom="";
  const grp=isGroup(S.peer);
  if(!S.msgs.length) html=`<div class="day">${grp?"Messages are private to the members of this group":"Messages and calls are private to the two of you"}</div>`;
  S.msgs.filter(m=>!(m.hiddenFor||[]).includes(S.me.uid)).forEach(m=>{ const d=dayLabel(m.at); if(d!==lastDay){ html+=`<div class="day">${d}</div>`; lastDay=d; lastFrom=""; }
    if(m.type==="system"){ html+=`<div class="day sys">${esc(nameOf(m.from))} ${esc(m.text)}</div>`; lastFrom=""; return; }
    const mine=m.from===S.me.uid, first=m.from!==lastFrom; lastFrom=m.from;
    const who = grp && !mine && first ? `<div class="who" style="color:${userColor(m.from)}">${esc(nameOf(m.from))}</div>` : "";
    const meta=`<span class="meta">${hm(m.at)}${mine&&!grp?`<span class="${m.read?"read":""}">${ico(m.read?"checks":"check")}</span>`:""}</span>`;
    let body="";
    const cachedSrc = m.mediaId && S.mediaCache.has(m.mediaId) ? ` src="${S.mediaCache.get(m.mediaId)}"` : "";
    if(m.type==="deleted") body=`<span class="gone">${ico("x")}${mine?"You deleted this message":"This message was deleted"}</span>`;
    else if(m.type==="image") body=`<img data-media="${esc(m.mediaId)}"${cachedSrc} alt="Photo">${m.text?`<div class="cap">${esc(m.text)}</div>`:""}`;
    else if(m.type==="video") body=`<video data-media="${esc(m.mediaId)}"${cachedSrc} controls playsinline preload="metadata"></video>${m.text?`<div class="cap">${esc(m.text)}</div>`:""}`;
    else if(m.type==="location") body=locationBubble(m);
    else if(m.type==="audio") body=`<div class="audio" data-audio="${esc(m.mediaId)}"><button class="play" aria-label="Play voice message">${ico("play")}</button><div class="track"><i></i></div><small>${dur(m.dur||0)}</small></div>`;
    else body=esc(m.text).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener" style="color:var(--orange-2)">$1</a>');
    html+=`<div class="msg ${mine?"me":""} ${first?"first":""}${m.type==="deleted"?" del":""}" data-mid="${esc(m.id)}">${who}${body}${meta}</div>`; });
  W.innerHTML=html;
  W.querySelectorAll("[data-media]:not([src])").forEach(async el=>{ try{ el.src=await media(el.dataset.media); }catch(e){ el.alt="Media unavailable"; } });
  if(atBottom||W.dataset.peer!==S.peer){ W.scrollTop=W.scrollHeight; W.dataset.peer=S.peer; }
}
async function media(id){ if(S.mediaCache.has(id)) return S.mediaCache.get(id); const d=await api.getMedia(id); S.mediaCache.set(id,d); return d; }
/* Long-press a message: Copy · Delete for me · Delete for everyone */
(function(){
  const W=$("#wall"); let t=null, sx=0, sy=0, fired=false;
  W.addEventListener("pointerdown",e=>{ const el=e.target.closest(".msg[data-mid]"); if(!el||e.target.closest("a,button,video")) return;
    fired=false; sx=e.clientX; sy=e.clientY; clearTimeout(t);
    t=setTimeout(()=>{ fired=true; try{ navigator.vibrate&&navigator.vibrate(18); }catch(_){} msgMenu(el.dataset.mid); },450); });
  const cancel=e=>{ if(t&&(!e||e.type!=="pointermove"||Math.hypot(e.clientX-sx,e.clientY-sy)>10)){ clearTimeout(t); t=null; } };
  ["pointerup","pointercancel","pointerleave"].forEach(ev=>W.addEventListener(ev,cancel)); W.addEventListener("pointermove",cancel);
  W.addEventListener("contextmenu",e=>{ const el=e.target.closest(".msg[data-mid]"); if(el){ e.preventDefault(); if(!fired) msgMenu(el.dataset.mid); } });
  W.addEventListener("click",e=>{ if(fired){ e.stopPropagation(); e.preventDefault(); fired=false; } },true);   // the long-press must not also open a photo
})();
function msgMenu(id){
  const m=S.msgs.find(x=>x.id===id); if(!m) return;
  const mine=m.from===S.me.uid, gone=m.type==="deleted", peer=S.peer;
  const canAll = mine && !gone && Date.now()-m.at < 48*3600e3;
  const el=document.querySelector(`.msg[data-mid="${CSS.escape(id)}"]`); if(el) el.classList.add("sel");
  const sh=$("#pop");
  sh.innerHTML=`<div class="popbg" data-close></div><div class="popcard" role="dialog" aria-label="Message options"><div class="grip"></div>
    <div class="msgprev">${gone?(mine?"You deleted this message":"This message was deleted"):esc(preview(m)).slice(0,160)}</div>
    <div class="acts">
      ${m.type==="text"&&m.text?`<button data-a="copy">${ico("checks")}Copy text</button>`:""}
      <button data-a="me" class="del">${ico("trash")}Delete for me</button>
      ${canAll?`<button data-a="all" class="del">${ico("trash")}Delete for everyone</button>`:""}
    </div>
    ${mine&&!gone&&!canAll?'<p class="note" style="padding:0 20px 8px">Delete for everyone is available for 2 days after sending.</p>':""}
    <div class="acts" style="padding-top:0"><button data-close style="justify-content:center;color:var(--mute)">Cancel</button></div></div>`;
  sh.hidden=false; requestAnimationFrame(()=>sh.classList.add("open"));
  const done=()=>{ sh.classList.remove("open"); setTimeout(()=>{ sh.hidden=true; sh.innerHTML=""; },180); if(el) el.classList.remove("sel"); };
  sh.onclick=async e=>{ if(e.target.closest("[data-close]")) return done();
    const b=e.target.closest("[data-a]"); if(!b) return; const a=b.dataset.a; done();
    if(a==="copy"){ try{ await navigator.clipboard.writeText(m.text); toast("Copied"); }catch(err){ toast("Couldn't copy"); } return; }
    try{
      if(a==="me"){ await api.hideMessage(peer,id); toast("Deleted for you"); }
      if(a==="all"){ const lastAt=Math.max(...S.msgs.map(x=>x.at)); await api.deleteForAll(peer,m,m.at===lastAt); toast("Deleted for everyone"); }
    }catch(err){ toast("Couldn't delete. Check your connection."); } };
}
$("#wall").onclick=async e=>{
  const im=e.target.closest(".msg img[data-media]"); if(im&&im.src){ const cap=im.parentElement.querySelector(".cap"); return openViewer(im.src, cap?cap.textContent:""); }
  const a=e.target.closest("[data-audio]"); if(!a) return;
  const btn=a.querySelector(".play"), bar=a.querySelector(".track i");
  if(a._au){ if(a._au.paused){ a._au.play(); btn.innerHTML=ico("pause"); } else { a._au.pause(); btn.innerHTML=ico("play"); } return; }
  try{ const au=new Audio(await media(a.dataset.audio)); a._au=au; au.ontimeupdate=()=>{ bar.style.width=(au.currentTime/(au.duration||1)*100)+"%"; };
    au.onended=()=>{ btn.innerHTML=ico("play"); bar.style.width="0"; }; await au.play(); btn.innerHTML=ico("pause"); }catch(err){ toast("Could not play this voice message"); }
};

/* composer */
let rec=null;
function pinChat(force){ const W=$("#wall"); if(!W||W.hidden) return; if(force || W.scrollHeight-W.scrollTop-W.clientHeight<160) requestAnimationFrame(()=>{ W.scrollTop=W.scrollHeight; }); }
(function(){ let last=innerHeight; const onResize=()=>{ const h2=(window.visualViewport?visualViewport.height:innerHeight); if(Math.abs(h2-last)>60) pinChat(); last=h2; };
  (window.visualViewport||window).addEventListener("resize", onResize); })();
function renderComposer(){
  const C=$("#composer");
  if(rec){ C.innerHTML=`<button class="ibtn" id="rCancel" aria-label="Cancel recording" style="color:var(--bad)">${ico("trash")}</button><div class="recbar"><span class="dot"></span><b id="rT">0:00</b><span>Recording · tap send</span></div><button class="send rec" id="rSend" aria-label="Send voice message">${ico("send")}</button>`;
    $("#rCancel").onclick=()=>stopRec(false); $("#rSend").onclick=()=>stopRec(true); return; }
  C.innerHTML=`<div class="field"><button class="ibtn" id="cAttach" aria-label="Attach">${ico("clip")}</button><textarea id="msgIn" rows="1" placeholder="Message" aria-label="Message"></textarea><button class="ibtn" id="cCamQ" aria-label="Camera">${ico("camera")}</button></div><button class="send" id="cSend" aria-label="Record voice message">${ico("mic")}</button>`;
  const ta=$("#msgIn"), sb=$("#cSend");
  const sync=()=>{ const has=ta.value.trim().length>0; sb.innerHTML=ico(has?"send":"mic"); sb.setAttribute("aria-label",has?"Send":"Record voice message"); ta.style.height="auto"; ta.style.height=Math.min(ta.scrollHeight,120)+"px"; };
  ta.oninput=sync;
  ta.onfocus=()=>{ pinChat(true); setTimeout(()=>pinChat(true),280); };
  ta.onkeydown=e=>{ if(e.key==="Enter"&&!e.shiftKey&&innerWidth>=900){ e.preventDefault(); sendText(); } };
  sb.onclick=()=>{ if(ta.value.trim()) sendText(); else startRec(); };
  $("#cAttach").onclick=e=>{ e.stopPropagation(); $("#attach").hidden=!$("#attach").hidden; };
  $("#cCamQ").onclick=()=>$("#fCamera").click();
}
function sendText(){ const ta=$("#msgIn"), t=ta.value.trim(); if(!t||!S.peer) return; ta.value=""; ta.oninput(); api.send(S.peer,{type:"text",text:t}).catch(()=>toast("Not sent. Check your connection.")); ta.focus(); }
$("#attach").onclick=e=>{ e.stopPropagation(); const p=e.target.closest("[data-pick]"); if(!p) return; $("#attach").hidden=true;
  if(p.dataset.pick==="location") return sendLocation();
  if(p.dataset.pick==="scan") return scanStart();
  ({gallery:"#fGallery",camera:"#fCamera",video:"#fVideo"})[p.dataset.pick] && $(({gallery:"#fGallery",camera:"#fCamera",video:"#fVideo"})[p.dataset.pick]).click(); };
$("#fScan").onchange=e=>{ const f=e.target.files[0]; e.target.value=""; if(f&&S.peer) scanFile(f); };
["#fGallery","#fCamera","#fVideo"].forEach(s=>$(s).onchange=async e=>{ const f=e.target.files[0]; e.target.value=""; if(f&&S.peer) sendFile(S.peer,f); });
async function sendFile(peer,f){
  try{
    if(f.type.startsWith("image/")){ toast("Sending photo…"); const id=await api.putMedia(await shrinkImage(f)); await api.send(peer,{type:"image",mediaId:id}); }
    else if(f.type.startsWith("video/")){ if(f.size>MAX_VIDEO_MB*1048576) return toast(`Video too large. Keep it under ${MAX_VIDEO_MB} MB.`);
      toast("Uploading video…"); const id=await api.putMedia(await readFile(f)); await api.send(peer,{type:"video",mediaId:id}); }
    else toast("Only photos and videos can be sent");
  }catch(err){ toast("Upload failed. Try again on Wi-Fi."); }
}
async function startRec(){
  if(!navigator.mediaDevices||!window.MediaRecorder) return toast("Voice messages are not supported in this browser");
  try{ const st=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
    const opts=MediaRecorder.isTypeSupported("audio/webm;codecs=opus")?{mimeType:"audio/webm;codecs=opus",audioBitsPerSecond:32000}:{};
    const mr=new MediaRecorder(st,opts), chunks=[]; mr.ondataavailable=e=>chunks.push(e.data);
    rec={mr,st,chunks,t0:Date.now(),timer:setInterval(()=>{ const s=(Date.now()-rec.t0)/1000; const el=$("#rT"); if(el) el.textContent=dur(s); if(s>=180) stopRec(true); },250)};
    mr.start(); renderComposer();
  }catch(e){ toast("Microphone permission is needed for voice messages"); }
}
function stopRec(send){
  if(!rec) return; const r=rec; rec=null; clearInterval(r.timer); const secs=(Date.now()-r.t0)/1000;
  r.mr.onstop=async()=>{ r.st.getTracks().forEach(t=>t.stop()); if(!send||secs<1) return;
    const blob=new Blob(r.chunks,{type:r.mr.mimeType||"audio/webm"}); const d=await readFile(blob);
    try{ const id=await api.putMedia(d); await api.send(S.peer,{type:"audio",mediaId:id,dur:Math.round(secs)}); }catch(e){ toast("Voice message not sent"); } };
  r.mr.stop(); renderComposer();
}

/* =========================  STATUS  ========================= */
function chooseStatus(){
  const sh=$("#sheet"); sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">New status</b></div></header>
    <div class="form"><button class="btn" id="stPhoto">Photo update</button><button class="btn ghost" id="stText">Text update</button><p class="note">Status updates are visible to your contacts for 24 hours.</p></div>`;
  sh.hidden=false; sh.onclick=e=>{ if(e.target.closest("[data-close]")) sh.hidden=true; };
  $("#stPhoto").onclick=()=>{ sh.hidden=true; $("#fStatus").click(); }; $("#stText").onclick=()=>{ sh.hidden=true; openStatusText(); };
}
$("#fStatus").onchange=async e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
  const d=await shrinkImage(f,1280,.75); const st=$("#story");
  st.innerHTML=`<div class="hd"><button class="ibtn" id="sx" aria-label="Cancel">${ico("x")}</button></div><div class="body"><img src="${d}" alt=""></div>
    <div class="composer" style="background:#000"><div class="field"><textarea id="scap" rows="1" placeholder="Add a caption" aria-label="Caption"></textarea></div><button class="send" id="spost" aria-label="Post status">${ico("send")}</button></div>`;
  st.hidden=false; $("#sx").onclick=()=>st.hidden=true;
  $("#spost").onclick=async()=>{ st.hidden=true; toast("Posting…"); try{ const id=await api.putMedia(d); await api.postStatus({type:"image",mediaId:id,text:$("#scap").value.trim()}); toast("Status posted"); S.tab="updates"; setTab("updates"); }catch(err){ toast("Could not post status"); } };
};
function openStatusText(){
  const cols=["#ff6a13","#0b0b0c","#26262a","#b8460b","#57534e"]; let ci=0; const st=$("#story");
  st.innerHTML=`<div class="hd"><button class="ibtn" id="sx" aria-label="Cancel">${ico("x")}</button><div style="flex:1"></div><button class="ibtn" id="sc" aria-label="Change colour" style="border:2px solid #fff;width:32px;height:32px"></button></div>
    <textarea class="compose-txt" id="stxt" placeholder="Type a status" maxlength="200"></textarea><div style="display:flex;justify-content:flex-end;padding:16px"><button class="send" id="spost" aria-label="Post status">${ico("send")}</button></div>`;
  const paint=()=>{ st.style.background=cols[ci]; }; paint(); st.hidden=false; $("#stxt").focus();
  $("#sc").onclick=()=>{ ci=(ci+1)%cols.length; paint(); };
  $("#sx").onclick=()=>{ st.hidden=true; st.style.background=""; };
  $("#spost").onclick=async()=>{ const t=$("#stxt").value.trim(); if(!t) return toast("Type something first"); st.hidden=true; st.style.background="";
    await api.postStatus({type:"text",text:t,bg:cols[ci]}); toast("Status posted"); setTab("updates"); };
}
function openStory(uid){
  const list=S.statuses.filter(s=>s.uid===uid&&s.expiresAt>Date.now()).sort((a,b)=>a.at-b.at); if(!list.length) return;
  const u=uid===S.me.uid?S.me:S.users[uid]||{name:"Contact",uid}; const st=$("#story"); let i=0, t=null;
  st.style.background="#000";
  const show=async()=>{ clearTimeout(t); if(i>=list.length||i<0) return close(); const s=list[i]; S.seenStatus.add(s.id); try{ localStorage.setItem("xappSeen",JSON.stringify([...S.seenStatus].slice(-300))); }catch(e){}
    st.innerHTML=`<div class="prog">${list.map((_,k)=>`<span><i style="width:${k<i?100:0}%"></i></span>`).join("")}</div>
      <div class="hd">${avatar(u,"sm")}<div style="flex:1;min-width:0"><b>${uid===S.me.uid?"My status":esc(u.name)}</b><div style="font-size:12.5px;color:#bbb">${listTime(s.at)}</div></div>
      ${uid===S.me.uid?`<button class="ibtn" id="sdel" aria-label="Delete status">${ico("trash")}</button>`:""}<button class="ibtn" id="sx" aria-label="Close">${ico("x")}</button></div>
      <div class="body">${s.type==="text"?`<div class="txt" style="background:${esc(s.bg||"#ff6a13")}">${esc(s.text)}</div>`:`<img id="simg" alt="Status photo">`}
      <button class="tap" style="left:0" id="sprev" aria-label="Previous"></button><button class="tap" style="right:0" id="snext" aria-label="Next"></button></div>
      ${s.type!=="text"&&s.text?`<div class="cap">${esc(s.text)}</div>`:""}`;
    $("#sx").onclick=close; $("#sprev").onclick=()=>{ i=Math.max(0,i-1); show(); }; $("#snext").onclick=()=>{ i++; show(); };
    if($("#sdel")) $("#sdel").onclick=async()=>{ await api.deleteStatus(s.id); toast("Status deleted"); close(); };
    if(s.type!=="text"){ try{ $("#simg").src=await media(s.mediaId); }catch(e){} }
    const bar=st.querySelectorAll(".prog i")[i]; requestAnimationFrame(()=>{ bar.style.transition="width 5s linear"; bar.style.width="100%"; });
    t=setTimeout(()=>{ i++; show(); },5000); };
  const close=()=>{ clearTimeout(t); st.hidden=true; st.style.background=""; renderList(); };
  st.hidden=false; show();
}

/* =========================  NETWORK TEST  ========================= */
function gatherWith(cfg, ms){
  return new Promise(async res=>{
    const out={types:{}, errs:[]}; let pc;
    try{ pc=new RTCPeerConnection(cfg); }catch(e){ out.errs.push("webrtc "+e.message); return res(out); }
    pc.createDataChannel("t");
    pc.onicecandidate=e=>{ const c=e.candidate; if(!c) return; const k=c.type+(c.relayProtocol?"/"+c.relayProtocol:""); out.types[k]=(out.types[k]||0)+1; };
    pc.onicecandidateerror=e=>{ out.errs.push(e.errorCode+(e.errorText?" "+e.errorText:"")); };
    const done=()=>{ try{ pc.close(); }catch(e){} res(out); };
    const t=setTimeout(done,ms); pc.onicegatheringstatechange=()=>{ if(pc.iceGatheringState==="complete"){ clearTimeout(t); setTimeout(done,200); } };
    try{ await pc.setLocalDescription(await pc.createOffer()); }catch(e){ out.errs.push("offer "+e.message); clearTimeout(t); done(); }
  });
}
async function netTest(){
  const sh=$("#sheet"); window._cfTest=await cfIce();
  const tests=[{key:"stun", label:"Internet address (STUN)", cfg:{iceServers:[{urls:"stun:stun.l.google.com:19302"}]}}];
  ([...(window._cfTest||[]), ...(CFG.turn||[])]).filter(t=>t.username).forEach(t=>[].concat(t.urls).forEach(u=>tests.push({key:u, label:u.replace(/^turns?:/,"").replace("?transport="," · ")+(u.startsWith("turns:")?" · TLS":""), cfg:{iceServers:[{urls:u,username:t.username,credential:t.credential}],iceTransportPolicy:"relay"}})));
  const res={};
  const icon=ok=>`<span class="av sm" style="background:${ok===undefined?"var(--raise)":ok?"var(--good)":"var(--bad)"};font-size:15px;width:34px;height:34px">${ok===undefined?"…":ok?"✓":"✕"}</span>`;
  const why=(r,stun)=>{ if(!r) return "Testing…"; if(stun) return r.types.srflx?"OK · public address found":"No public address (STUN blocked on this network)";
    const t=Object.keys(r.types).filter(k=>k.startsWith("relay")); if(t.length) return "OK · "+t.join(", "); const e=r.errs[0]||"";
    return e.startsWith("401")?"Login rejected (401)":e.startsWith("701")?"Not reachable on this network (701)":e?("Failed · "+e):"No reply"; };
  const draw=done=>{ const relayOk=tests.slice(1).some(t=>res[t.key]&&res[t.key].ok);
    sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Connection test</b><div style="font-size:12.5px;color:var(--head-mute)">${navigator.onLine?"Online":"Offline"} · ${tests.length-1} relay routes</div></div></header>
    <div class="list">${tests.map((t,i)=>`${i===1?'<div class="sec">Relay servers</div>':""}<div class="row" style="cursor:default">${icon(res[t.key]&&res[t.key].ok)}<div class="mid"><div class="top"><span class="name" style="font-size:14.5px">${esc(t.label)}</span></div><div class="sub"><span style="white-space:normal">${esc(why(res[t.key],t.key==="stun"))}</span></div></div></div>`).join("")}
    ${done?`<div class="empty" style="padding:18px 22px;text-align:left">${relayOk?"At least one relay works on this network, so calls can connect.":"No relay works on this network, so calls between different networks will fail."} Send a screenshot of this screen if calls still fail.</div>`:`<div class="empty">Testing… about 10 seconds</div>`}</div>`;
    sh.hidden=false; };
  sh.onclick=e=>{ if(e.target.closest("[data-close]")) sh.hidden=true; };
  draw(false);
  await Promise.all(tests.map(async t=>{ const r=await gatherWith(t.cfg,9000);
    r.ok = t.key==="stun" ? !!r.types.srflx : Object.keys(r.types).some(k=>k.startsWith("relay")); res[t.key]=r; draw(false); }));
  draw(true);
  const d={at:Date.now(), online:navigator.onLine, ua:navigator.userAgent.slice(0,140), results:tests.map(t=>({route:t.label, ok:!!(res[t.key]&&res[t.key].ok), detail:why(res[t.key],t.key==="stun")}))};
  try{ const i=await nat("App","getInfo"); if(i&&i.version) d.app=i.version; }catch(e){}
  if(navigator.connection) d.net=navigator.connection.type||navigator.connection.effectiveType||"";
  api.saveDiag("diagNet",d);
}

/* =========================  CALLS  ========================= */
let call=null, ringing=null;
const AC=()=>(window._ac=window._ac||new (window.AudioContext||window.webkitAudioContext)());
function tone(pattern){ // pattern: [[freq, ms],...] repeating
  stopTone(); let stop=false; const ac=AC(); ac.resume&&ac.resume();
  const loop=async()=>{ while(!stop){ for(const [f,ms] of pattern){ if(stop) break; if(f){ const o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=f; g.gain.value=.12; o.connect(g).connect(ac.destination); o.start(); await new Promise(r=>setTimeout(r,ms)); o.stop(); } else await new Promise(r=>setTimeout(r,ms)); } } };
  loop(); window._toneStop=()=>{ stop=true; };
}
function stopTone(){ window._toneStop&&window._toneStop(); window._toneStop=null; if(window._natRing){ window._natRing=false; nat("Background","stopRing"); } }
/* ringing sounds: the phone's own ringtone / ringback tone in the APK (always audible, follows the phone's volume and silent mode); web tone as fallback */
function ringSound(kind, info){
  stopTone();
  const web=()=>{ if(kind==="ringback") tone([[440,1200],[0,2600]]); else tone([[523,180],[659,180],[784,260],[0,900]]); };
  if(!isNative()) return web();
  window._natRing=true;
  nat("Background","ring",{kind, ...(info||{})},true).then(r=>{ if(!r||!r.ok){ window._natRing=false; if(call&&!call.startedAt&&!call.closed) web(); } }).catch(()=>{ window._natRing=false; if(call&&!call.startedAt&&!call.closed) web(); });
}
function beep(){ if(!PREFS.sounds) return; try{ const ac=AC(), o=ac.createOscillator(), g=ac.createGain(); o.frequency.value=880; g.gain.value=.08; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+.12); }catch(e){} }

async function getMedia(video){
  return navigator.mediaDevices.getUserMedia({
    audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,sampleRate:48000,channelCount:1},
    video: video ? {width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30},facingMode:"user"} : false });
}
/* native bridge (APK): audio routing + back button */
function nat(plugin, method, opts={}, raw=false){
  let p;
  try{ const C=window.Capacitor; if(!C||!C.getPlatform||C.getPlatform()==="web") return Promise.resolve();
    if(C.Plugins&&C.Plugins[plugin]&&C.Plugins[plugin][method]) p=Promise.resolve(C.Plugins[plugin][method](opts));
    else if(C.nativePromise) p=C.nativePromise(plugin,method,opts); }catch(e){ p=Promise.reject(e); }
  if(!p) return Promise.resolve();
  return raw ? p : p.catch(()=>{});
}
function isNative(){ try{ const C=window.Capacitor; return !!(C&&C.getPlatform&&C.getPlatform()!=="web"); }catch(e){ return false; } }
function natOn(plugin, event, cb){
  try{ const C=window.Capacitor; if(!isNative()) return;
    if(C.Plugins&&C.Plugins[plugin]&&C.Plugins[plugin].addListener) C.Plugins[plugin].addListener(event,cb);
    else if(C.nativeCallback) C.nativeCallback(plugin,"addListener",{eventName:event},cb); }catch(e){}
}
/* Background ringing: the native service signs in with the same account so it can ring with the app closed */
S.bg=null;
async function bgRefresh(){ if(!isNative()) return; try{ S.bg=await nat("Background","status"); }catch(e){}
  if(S.bg){ let v=""; try{ const i=await nat("App","getInfo"); v=i&&i.version; }catch(e){} api.saveDiag("diagApp",{at:Date.now(), app:v, ...S.bg}); }
  if(S.tab==="settings") renderList(true); else renderList(); }
async function bgSignIn(u,p,tries=5){
  if(!isNative()||api.demo) return;
  for(let i=0;i<tries;i++){
    try{ await nat("Background","signIn",{email:api.emailFor(u), password:p, options:FIREBASE_CONFIG},true); toast("Background calls are on"); bgRefresh(); return true; }
    catch(e){
      const m=(e&&e.message)||"";
      // wrong password: no point retrying; network hiccup right after sign-in: try again shortly
      if(/password|credential|INVALID_LOGIN|user-not-found|no user record/i.test(m) || i===tries-1){ toast("Background calls could not start: "+(m||"check the password")); break; }
      await new Promise(r=>setTimeout(r,[2000,5000,10000,20000][i]||20000));
    }
  }
  bgRefresh(); return false;
}
/* On every app open: if background calls are off on this phone, ask once for the password so they turn on again. */
let bgAsked=false;
/* Google push (battery saver): when this phone has a push token and the Worker can send pushes,
   Xapp drops its always-on connection; calls wake the phone like WhatsApp. */
async function pushSetup(){
  if(!isNative()||api.demo) return;
  let alwaysOn=false; try{ alwaysOn=localStorage.getItem("xappAlwaysOn")==="1"; }catch(e){}
  const [t, st] = await Promise.all([nat("Background","pushToken").catch(e=>({error:String(e)})), api.pushStatus()]);
  S.push={token:!!(t&&t.token), worker:!!(st&&st.push), err:(t&&t.error)||(st&&st.pushError)||(!st?"Worker not reachable":"")};
  // prove it: a silent push to this phone must go through before Xapp drops its always-on connection
  if(S.push.token && S.push.worker){ const r=await api.push("ping",{to:S.me.uid}); if(!r||!r.ok){ S.push.worker=false; S.push.err="push test failed: "+String((r&&r.error)||"no answer").slice(0,80); } }
  const on=S.push.token && S.push.worker && !alwaysOn;
  try{ await nat("Background","setPushMode",{on}); }catch(e){}
  S.push.on=on; bgRefresh();
}
async function bgEnsure(){
  if(!isNative()||api.demo||bgAsked) return;
  try{ const st=await nat("Background","status"); S.bg=st;
    if(st && !st.signedIn && S.me && S.me.username){ bgAsked=true;
      if(await bgAutoSignIn()) return;                           // on by itself, no password
      toast("Background calls are off on this phone"); bgPasswordSheet(); }
    else if(st && st.signedIn && !st.running) nat("Background","start");
  }catch(e){}
}
/* turn background calls on without asking for the password (one-time token from the Worker) */
async function bgAutoSignIn(){
  try{ const r=await api.push("signin",{to:"self"}); if(!r||!r.ok||!r.token) return false;
    await nat("Background","signInToken",{token:r.token, options:FIREBASE_CONFIG},true);
    bgRefresh(); setTimeout(pushSetup,1500); return true;
  }catch(e){ return false; }
}
function bgPasswordSheet(){
  const sh=$("#sheet");
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">Background calls</b></div></header>
    <form class="form" id="bgForm"><p class="note">Enter your Xapp password once so calls can ring when Xapp is closed.</p>
    <label for="bgPass">Password for @${esc(S.me.username||"")}</label><input id="bgPass" type="password" autocomplete="current-password" required minlength="6">
    <button class="btn" type="submit">Turn on</button></form>`;
  sh.hidden=false; sh.onclick=e=>{ if(e.target.closest("[data-close]")) sh.hidden=true; };
  $("#bgForm").onsubmit=async e=>{ e.preventDefault(); const pw=$("#bgPass").value; sh.hidden=true; await bgSignIn(S.me.username, pw); };
}
/* Answer / Decline tapped on the ringing notification */
S.pendingAction=null;
function takeCallAction(a){ if(!a||!a.id) return; S.pendingAction={...a, at:Date.now()}; applyCallAction(); }
function applyCallAction(){
  const a=S.pendingAction; if(!a||Date.now()-a.at>60000) return;
  if(call && call.inc && call.inc.id===a.id && !call.startedAt){
    S.pendingAction=null;
    if(a.action==="answer") setTimeout(answer,150);
    else if(a.action==="decline"){ api.declineCall(a.id); call.close("declined"); }
  }
}
applyTheme();
try{ window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{ if(PREFS.theme==="system") applyTheme(); }); }catch(e){}
if(isNative()){
  natOn("Background","theme",()=>{ if(PREFS.theme==="system") applyTheme(); });
  natOn("Background","callAction",takeCallAction);
  natOn("Background","hangup",()=>{ if(call) call.hangup(); });
  natOn("App","resume",()=>{ nat("Background","takeCallAction").then(takeCallAction); bgRefresh(); nat("Background","start"); if(api._reIncoming) api._reIncoming(); if(PREFS.theme==="system") applyTheme(); });
}
const AUDIO_NAMES={earpiece:"Phone",speaker:"Speaker",bluetooth:"Bluetooth",wired:"Headset"};
const AUDIO_ICONS={earpiece:"earpiece",speaker:"speaker",bluetooth:"bluetooth",wired:"headphones"};
function route(s){
  return nat("AudioRoute","set",{active:true, route:s.route||"auto", preferSpeaker:!!s.speaker}).then(st=>{ if(st&&st.outputs){ s.audio=st; audioBtn(s); } return st; });
}
function audioBtn(s){
  const b=$("#kAud"), lab=$("#kAudL"); if(!b) return;
  let cur = s.audio&&s.audio.current ? s.audio.current : (s.speaker?"speaker":"earpiece");
  b.innerHTML=ico(AUDIO_ICONS[cur]||"speaker"); b.classList.toggle("on", cur!=="earpiece");
  if(lab) lab.textContent=AUDIO_NAMES[cur]||"Audio";
  b.setAttribute("aria-label","Audio: "+(AUDIO_NAMES[cur]||"")+". Tap to change");
}
function audioMenu(s){
  const outs=(s.audio&&s.audio.outputs||[]).map(o=>o.route);
  if(outs.length<=2){   // only phone + speaker: just switch
    const cur=s.audio&&s.audio.current ? s.audio.current : (s.speaker?"speaker":"earpiece");
    s.route = cur==="speaker" ? "earpiece" : "speaker"; s.speaker = s.route==="speaker";
    route(s).then(()=>toast(AUDIO_NAMES[s.route])); if(!isNative()) audioBtn(s); return;
  }
  const old=$("#audMenu"); if(old){ old.remove(); return; }
  const m=document.createElement("div"); m.id="audMenu"; m.className="audmenu"; m.setAttribute("role","menu");
  m.innerHTML=(s.audio.outputs||[]).map(o=>`<button role="menuitemradio" aria-checked="${s.audio.current===o.route}" data-r="${o.route}">${ico(AUDIO_ICONS[o.route]||"speaker")}<span>${esc(AUDIO_NAMES[o.route]||o.route)}${o.name&&o.route==="bluetooth"?`<small>${esc(o.name)}</small>`:""}</span>${s.audio.current===o.route?ico("check"):""}</button>`).join("");
  $("#call").appendChild(m);
  m.onclick=e=>{ const r=e.target.closest("[data-r]"); if(!r) return; s.route=r.dataset.r; s.speaker=s.route==="speaker"; m.remove(); route(s).then(()=>toast(AUDIO_NAMES[s.route])); };
}
natOn("AudioRoute","devices",st=>{ if(call&&st&&st.outputs){ call.audio=st; audioBtn(call); const m=$("#audMenu"); if(m){ m.remove(); } } });
function attachRemote(s){
  [$("#rv"),$("#ra")].forEach(el=>{ if(!el) return; if(el.srcObject!==s.remote) el.srcObject=s.remote;
    el.muted = el.id==="rv"; if(el.id==="ra") el.volume=1;   // sound plays through the audio element only
    const pr=el.play(); if(pr&&pr.catch) pr.catch(()=>{}); });
  if(api.demo){ const rv=$("#rv"); if(rv&&s.local&&s.startedAt) rv.srcObject=s.local; }
}
function newSession(peer, video, outgoing){
  const sess={peer,video,outgoing,unsubs:[],pc:null,local:null,remote:new MediaStream(),types:new Set(),startedAt:0,muted:false,camOff:false,front:true,closed:false,setStatus:()=>{}};
  sess.speaker=!!video || PREFS.speakerVoice; sess.connected=api.demo;
  const t0=Date.now(); sess.diag={at:t0, role:outgoing?"caller":"callee", video:!!video, ua:navigator.userAgent.slice(0,140),
    relays:(CFG.turn||[]).flatMap(t=>[].concat(t.urls)).length, ev:[], local:{}, remote:{}, errs:{}};
  sess.log=e=>{ if(sess.diag.ev.length<80) sess.diag.ev.push(((Date.now()-t0)/1000).toFixed(1)+"s "+e); };
  sess.logCand=c=>{ sess.types.add(c.type); const k=c.type+"/"+(c.relayProtocol||c.protocol||""); sess.diag.local[k]=(sess.diag.local[k]||0)+1; };
  sess.logRemote=c=>{ const m=/ typ (\w+)/.exec(c.candidate||""); const k=(m?m[1]:"?")+"/"+((/ (udp|tcp) /i.exec(c.candidate||"")||[])[1]||"").toLowerCase(); sess.diag.remote[k]=(sess.diag.remote[k]||0)+1; };
  sess.saveDiag=async why=>{ if(api.demo||sess.diagSaved||!sess.pc&&!sess.diag.ev.length) return; sess.diagSaved=true; const d=sess.diag; d.end=why; d.connected=!!sess.connAt; d.secs=((Date.now()-t0)/1000)|0;
    try{ if(sess.pc){ const st=await sess.pc.getStats(); const pairs={}; let sel=null; const c={};
      st.forEach(s=>{ if(s.type==="local-candidate"||s.type==="remote-candidate") c[s.id]=s; if(s.type==="candidate-pair"){ pairs[s.state]=(pairs[s.state]||0)+1; if(s.nominated&&s.state==="succeeded") sel=s; }
        if(s.type==="inbound-rtp"&&s.kind==="audio") d.audioInBytes=s.bytesReceived; if(s.type==="outbound-rtp"&&s.kind==="audio") d.audioOutBytes=s.bytesSent; });
      d.pairs=pairs; if(sel){ const l=c[sel.localCandidateId]||{}, r=c[sel.remoteCandidateId]||{}; d.selected=(l.candidateType||"")+"/"+(l.relayProtocol||l.protocol||"")+" -> "+(r.candidateType||"")+"/"+(r.protocol||""); } } }catch(e){ d.statsErr=String(e); }
    try{ const i=await nat("App","getInfo"); if(i&&i.version) d.app=i.version; }catch(e){}
    if(sess.qhist&&sess.qhist.length){ const h=sess.qhist, avg=i=>Math.round(h.reduce((a,x)=>a+x[i],0)/h.length), mx=i=>Math.max(...h.map(x=>x[i]));
      d.quality={samples:h.length, rttAvg:avg(0), rttMax:mx(0), lossAvg:avg(1), lossMax:mx(1), jitterAvg:avg(2), route:sess.diag.route}; }
    api.saveDiag("diagCall",d); };
  sess.onActive=()=>{ if(sess.startedAt) return; sess.startedAt=Date.now(); stopTone(); drawCall("active"); if(sess.pc) watchQuality(sess);
    route(sess).then(st=>{ if(st && st.btPermission===false && !PREFS.btAsked){ PREFS.btAsked=true; savePrefs(); nat("AudioRoute","requestBluetooth"); } });
    nat("Background","callState",{active:true, peer:(S.users[peer]||{}).name||"Xapp", video:!!video, startedAt:Date.now()});
    if(!api.demo) sess.giveUpT=setTimeout(()=>{ if(sess.connected||sess.closed) return; const p=$("#callSt");
      clearInterval(sess.tick); sess.log("give-up 25s"); if(p) p.textContent="Can't connect · relay "+(sess.types.has("relay")?"reached":"NOT reached");
      toast("Call could not connect. Check Settings → Test connection."); setTimeout(()=>sess.hangup(),4000); },25000);
    sess.tick=setInterval(()=>{
      if(sess.connected && !sess.connAt){ sess.connAt=Date.now(); sess.notify(); }
      const t=callStatusText(sess), p=$("#callSt"); if(p) p.textContent=t;
      const mt=sess.connAt?dur((Date.now()-sess.connAt)/1000):"…"; ["#cbT","#pipT"].forEach(q=>{ const e=$(q); if(e) e.textContent=sess.held||sess.peerHeld?"On hold":mt; }); },1000); };
  sess.notify=()=>nat("Background","callState",{active:true, peer:(S.users[peer]||{}).name||"Xapp", video:!!sess.video, startedAt:sess.connAt||sess.startedAt||Date.now(), held:!!sess.held});
  /* a normal phone call took over: hold the Xapp call, then resume */
  sess.setHold=on=>{ on=!!on; if(!!sess.held===on || sess.closed) return; sess.held=on; sess.log(on?"hold":"resume");
    if(sess.local){ sess.local.getAudioTracks().forEach(t=>t.enabled=!on&&!sess.muted); sess.local.getVideoTracks().forEach(t=>t.enabled=!on&&!sess.camOff); }
    const ra=$("#ra"); if(ra) ra.muted=on;
    sess.setStatus({holdBy: on ? S.me.uid : null}); sess.notify();
    if(!on){ fixMic(sess); route(sess); toast("Call resumed"); } else toast("Call on hold");
    const p=$("#callSt"); if(p) p.textContent=callStatusText(sess); };
  sess.onDoc=d=>{
    if(d.ringingAt && !sess.peerRinging && !sess.startedAt){ sess.peerRinging=true; const p=$("#callSt"); if(p) p.textContent="Ringing…"; sess.log("peer ringing"); }
    const ph=!!(d.holdBy && d.holdBy!==S.me.uid); if(ph!==!!sess.peerHeld){ sess.peerHeld=ph; const p=$("#callSt"); if(p) p.textContent=callStatusText(sess); } };
  sess.close=(why)=>{ if(sess.closed) return; sess.log("close "+why);
    try{ const h=sess.qhist||[], avg=i=>h.length?Math.round(h.reduce((a,x)=>a+x[i],0)/h.length):null;
      if(sess.id) api.saveCallQ(sess.id, {at:Date.now(), connected:!!sess.startedAt, route:sess.stats?sess.stats.route:"", proto:sess.stats?sess.stats.proto:"", codec:sess.stats?sess.stats.codec||"":"",
        rtt:avg(0), loss:avg(1), jitter:avg(2), maxRtt:h.length?Math.max(...h.map(x=>x[0])):null, secs:sess.startedAt?Math.round((Date.now()-sess.startedAt)/1000):0, video:!!sess.video, end:why||""}); }catch(e){} hideMini(); clearTimeout(sess.idleT); clearInterval(sess.qT); nat("Background","callState",{active:false}); const pcToClose=sess.pc; sess.pc=null; const keep={pc:pcToClose}; sess.closed=true; stopTone(); nat("AudioRoute","set",{active:false}); clearInterval(sess.tick); clearTimeout(sess.missT); clearTimeout(sess.giveUpT); clearTimeout(sess.demoT);
    sess.unsubs.forEach(f=>f&&f()); if(sess.local) sess.local.getTracks().forEach(t=>t.stop());
    sess.pc=keep.pc; sess.saveDiag(why).catch(()=>{}).finally(()=>{ try{ keep.pc&&keep.pc.close(); }catch(e){} });
    const p=$("#callSt"); if(p) p.textContent= why==="declined"?"Busy":why==="missed"?"No answer":"Call ended";
    if(sess.minimized){ $("#call").hidden=true; $("#call").innerHTML=""; } else setTimeout(()=>{ $("#call").hidden=true; $("#call").innerHTML=""; $("#call").classList.remove("idle"); },why==="ended"?600:1400); call=null; };
  sess.hangup=()=>{ if(sess.closed) return; if(sess.outgoing && !sess.startedAt && sess.id) api.push("cancel",{id:sess.id, to:sess.peer}); sess.setStatus(sess.startedAt?{status:"ended",endedAt:Date.now()}:{status:sess.outgoing?"missed":"declined",endedAt:Date.now()}); sess.close("ended"); };
  return sess;
}
function callStatusText(sess){
  const name=(S.users[sess.peer]||{}).name||"Contact";
  if(sess.held) return "On hold · you're on a phone call";
  if(sess.peerHeld) return name.split(" ")[0]+" is on another call · on hold";
  if(sess.connected||api.demo) return sess.connAt?dur((Date.now()-sess.connAt)/1000):"0:00";
  return sess.connAt?"Reconnecting…":"Connecting…";
}
async function fixMic(sess){   // after a phone call Android may have ended the microphone track
  try{ const t=sess.local&&sess.local.getAudioTracks()[0]; if(t && t.readyState==="live") return;
    const ns=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}); const nt=ns.getAudioTracks()[0];
    if(sess.pc){ const snd=sess.pc.getSenders().find(x=>x.track&&x.track.kind==="audio") || sess.pc.getSenders().find(x=>!x.track); snd&&snd.replaceTrack(nt); }
    if(t) sess.local.removeTrack(t); sess.local.addTrack(nt); nt.enabled=!sess.muted; sess.log("mic restored");
  }catch(e){ sess.log("mic restore failed"); }
}
/* drag anything; it snaps to the nearest side. A short tap calls onTap. */
function makeDraggable(el, onTap){
  let id=null, sx=0, sy=0, ox=0, oy=0, moved=false; el.style.touchAction="none";
  el.addEventListener("pointerdown",e=>{ id=e.pointerId; try{ el.setPointerCapture(id); }catch(_){} const r=el.getBoundingClientRect(); sx=e.clientX; sy=e.clientY; ox=r.left; oy=r.top; moved=false; el.style.transition="none"; e.stopPropagation(); });
  el.addEventListener("pointermove",e=>{ if(e.pointerId!==id) return; const dx=e.clientX-sx, dy=e.clientY-sy; if(!moved && Math.hypot(dx,dy)<7) return; moved=true;
    el.style.left=(ox+dx)+"px"; el.style.top=(oy+dy)+"px"; el.style.right="auto"; el.style.bottom="auto"; });
  const up=e=>{ if(e.pointerId!==id) return; id=null; e.stopPropagation();
    if(!moved){ onTap&&onTap(); return; }
    const r=el.getBoundingClientRect(), m=12, W=innerWidth, H=innerHeight;
    const left=(r.left+r.width/2<W/2)?m:W-r.width-m, top=Math.min(Math.max(r.top,44),H-r.height-90);
    el.style.transition="left .22s ease, top .22s ease"; el.style.left=left+"px"; el.style.top=top+"px"; el.dataset.dragged="1"; };
  el.addEventListener("pointerup",up); el.addEventListener("pointercancel",up);
  el.addEventListener("click",e=>e.stopPropagation());
}
/* minimise: back to chats while the call continues */
function minimizeCall(){ if(!call||!call.startedAt) return; call.minimized=true; $("#call").hidden=true; showMini(call); }
function restoreCall(){ if(!call) return; call.minimized=false; hideMini(); $("#call").hidden=false; attachRemote(call); wakeCall(); }
function showMini(s){
  hideMini(); const name=(S.users[s.peer]||{}).name||"Call";
  if(s.video){
    const d=document.createElement("div"); d.id="pip"; d.className="pip"; d.setAttribute("role","button"); d.setAttribute("aria-label","Return to video call with "+name);
    d.innerHTML=`<video autoplay playsinline muted></video><span class="pipn">${esc(name)}</span><span class="pipt" id="pipT">${s.connAt?dur((Date.now()-s.connAt)/1000):"…"}</span>`;
    document.body.appendChild(d); const v=d.querySelector("video"); v.srcObject=s.remote; v.play&&v.play().catch(()=>{});
    makeDraggable(d, restoreCall);
  } else {
    const b=document.createElement("button"); b.id="callbar"; b.className="callbar"; b.setAttribute("aria-label","Return to call");
    b.innerHTML=`<span class="cbdot"></span><b>${esc(name)}</b><span id="cbT">${s.connAt?dur((Date.now()-s.connAt)/1000):"…"}</span><span class="cbtap">Tap to return</span>`;
    b.onclick=restoreCall; document.body.appendChild(b); document.body.classList.add("incall");
  }
}
function hideMini(){ ["#pip","#callbar"].forEach(q=>{ const e=$(q); if(e) e.remove(); }); document.body.classList.remove("incall"); }
/* video call: buttons fade away, a tap brings them back */
function wakeCall(){ const el=$("#call"); el.classList.remove("idle"); if(!call||!call.video||!call.startedAt) return;
  clearTimeout(call.idleT); call.idleT=setTimeout(()=>{ if(call && !call.minimized && !$("#audMenu")) el.classList.add("idle"); },4000); }
$("#call").addEventListener("click",e=>{ if(!call||!call.video||!call.startedAt) return;
  const onControl=e.composedPath().some(n=>n.matches&&n.matches(".ctrls,.topb,.audmenu,video.local"));   // works even if the button redrew itself
  if(onControl) { wakeCall(); return; }
  const el=$("#call"); if(el.classList.contains("idle")) wakeCall(); else { el.classList.add("idle"); clearTimeout(call.idleT); } });
natOn("AudioRoute","interruption",e=>{ if(call && call.startedAt && e) call.setHold(!!e.hold); });
/* ---- call quality on weak connections ----
   Opus voice: in-band error correction (FEC) so lost packets are rebuilt, mono, up to 32 kbps, comfort noise off.
   Voice gets top network priority; video adapts (lower bitrate/resolution, then pauses) so the voice keeps going. */
function tuneSdp(sdp){
  const m=sdp.match(/a=rtpmap:(\d+) opus\/48000/i); if(!m) return sdp;
  const pt=m[1], want={useinbandfec:"1",usedtx:"0",stereo:"0",maxaveragebitrate:"32000",maxplaybackrate:"48000"};
  const re=new RegExp("a=fmtp:"+pt+" ([^\\r\\n]*)");
  if(re.test(sdp)) return sdp.replace(re,(all,params)=>{ const kv={}; params.split(";").forEach(x=>{ const [k,v]=x.split("="); if(k) kv[k.trim()]=(v||"").trim(); }); Object.assign(kv,want); return "a=fmtp:"+pt+" "+Object.entries(kv).map(([k,v])=>k+"="+v).join(";"); });
  return sdp.replace(m[0], m[0]+"\r\na=fmtp:"+pt+" "+Object.entries(want).map(([k,v])=>k+"="+v).join(";"));
}
/* Redundant audio (RED, RFC 2198): every voice packet also carries the previous one, so lost packets are filled in.
   Keeps calls clear on networks that drop 10–30% of packets. Falls back to plain Opus if the phone doesn't support it. */
function preferRed(pc, sess){
  try{
    const caps=RTCRtpSender.getCapabilities&&RTCRtpSender.getCapabilities("audio"); if(!caps) return;
    const red=caps.codecs.filter(c=>/red/i.test(c.mimeType)), opus=caps.codecs.filter(c=>/opus/i.test(c.mimeType));
    if(!red.length||!opus.length) return;
    const rest=caps.codecs.filter(c=>!/red|opus/i.test(c.mimeType));
    pc.getTransceivers().forEach(t=>{ if(t.sender&&t.sender.track&&t.sender.track.kind==="audio"&&t.setCodecPreferences) t.setCodecPreferences([...red,...opus,...rest]); });
    sess.diag.red=true; sess.log("audio RED on");
  }catch(e){ sess.log("red err "+(e&&e.message)); }
}
function tuneSenders(pc, video){
  pc.getSenders().forEach(snd=>{ if(!snd.track) return; try{
    const p=snd.getParameters(); if(!p.encodings||!p.encodings.length) p.encodings=[{}];
    if(snd.track.kind==="audio"){ p.encodings[0].priority="high"; p.encodings[0].networkPriority="high"; p.encodings[0].maxBitrate=80000; /* room for redundant audio */ }
    else { p.encodings[0].priority="low"; p.encodings[0].networkPriority="low"; p.encodings[0].maxBitrate=900000; p.degradationPreference="balanced"; }
    snd.setParameters(p).catch(()=>{});
  }catch(e){} });
  try{ const t=pc.getSenders().find(s=>s.track&&s.track.kind==="audio"); if(t&&t.track) t.track.contentHint="speech"; }catch(e){}
}
function renderNetInfo(sess){
  const p=$("#netInfo"); if(!p||!sess.stats) return; const st=sess.stats;
  const good=(v,a,b)=>v<=a?"ok":v<=b?"mid":"bad";
  p.innerHTML=`<b>Call quality</b>
    <div><span>Route</span><em>${esc(st.route)}${st.proto?" · "+esc(st.proto):""}</em></div>
    <div><span>Voice codec</span><em>${esc(st.codec||"Opus")}</em></div>
    <div><span>Relay setting</span><em>${esc((RELAYS[sess.relay||"auto"]||"Auto").replace(/ \(.*\)/,""))}</em></div>
    <div><span>Delay</span><em class="${good(st.rtt,150,350)}">${st.rtt} ms</em></div>
    <div><span>Packet loss</span><em class="${good(st.loss,2,8)}">${st.loss}%</em></div>
    <div><span>Jitter</span><em class="${good(st.jitter,30,60)}">${st.jitter} ms</em></div>
    <div><span>Voice in / out</span><em>${st.inKbps} / ${st.outKbps} kbps</em></div>
    <small>Good: delay under 150 ms, loss under 2%. Tap to close.</small>`;
}
/* watch the line every 2 s: show signal bars, and step video down/up */
function watchQuality(sess){
  let last=null, level=3;
  const steps=[{br:900000,scale:1},{br:450000,scale:1.5},{br:200000,scale:2},{br:90000,scale:3},{br:0,scale:4}];
  sess.qT=setInterval(async()=>{
    const pc=sess.pc; if(!pc||sess.closed) return clearInterval(sess.qT);
    let lost=0, got=0, rtt=0, jitter=0, inB=0, outB=0, pair=null, codecId=""; const cands={}, codecs={};
    try{ (await pc.getStats()).forEach(r=>{
      if(r.type==="inbound-rtp"&&r.kind==="audio"){ lost=r.packetsLost||0; got=r.packetsReceived||0; jitter=r.jitter||0; inB=r.bytesReceived||0; codecId=r.codecId; }
      if(r.type==="codec") codecs[r.id]=r;
      if(r.type==="outbound-rtp"&&r.kind==="audio") outB=r.bytesSent||0;
      if(r.type==="local-candidate"||r.type==="remote-candidate") cands[r.id]=r;
      if(r.type==="candidate-pair"&&r.nominated&&r.state==="succeeded"){ rtt=r.currentRoundTripTime||0; pair=r; } }); }catch(e){ return; }
    const L=pair&&cands[pair.localCandidateId]||{}, Rm=pair&&cands[pair.remoteCandidateId]||{};
    let codecName=""; try{ const snd=pc.getSenders().find(x=>x.track&&x.track.kind==="audio"); const c0=snd&&snd.getParameters().codecs&&snd.getParameters().codecs[0];
      codecName = c0 ? (/red/i.test(c0.mimeType) ? "Opus + redundancy" : c0.mimeType.replace(/^audio\//,"")) : ((codecs[codecId]||{}).mimeType||"").replace(/^audio\//,""); }catch(e){}
    const relayed = L.candidateType==="relay"||Rm.candidateType==="relay";
    const relayUrl = (L.candidateType==="relay" ? (L.url||"") : "") || "";
    const now=Date.now(), dt=last&&last.t ? (now-last.t)/1000 : 0;
    sess.stats={ route: relayed ? "Relay"+(relayUrl?" · "+relayUrl.replace(/^turns?:/,"").replace(/\?.*/,""):" (other side)") : "Direct (phone to phone)",
      proto:(L.relayProtocol||L.protocol||"").toUpperCase(), codec:codecName, rtt:Math.round(rtt*1000), jitter:Math.round(jitter*1000),
      inKbps: dt? Math.round((inB-(last.inB||0))*8/dt/1000):0, outKbps: dt? Math.round((outB-(last.outB||0))*8/dt/1000):0 };
    const hist=sess.qhist||(sess.qhist=[]); 
    let loss=0; if(last){ const dl=lost-last.lost, dg=got-last.got; loss=dl+dg>0?dl/(dl+dg):0; } last={lost,got,inB,outB,t:now};
    sess.stats.loss=Math.round(loss*100); hist.push([sess.stats.rtt,sess.stats.loss,sess.stats.jitter]); if(hist.length>300) hist.shift();
    sess.diag.route=sess.stats.route+" "+sess.stats.proto; renderNetInfo(sess);
    const q = !sess.connected ? 1 : (loss>0.15||rtt>0.8) ? 1 : (loss>0.06||rtt>0.4||jitter>0.06) ? 2 : (loss>0.02||rtt>0.25) ? 3 : 4;
    sess.quality=q; const n=$("#netQ"); if(n){ n.dataset.q=q; n.title=`Loss ${(loss*100).toFixed(0)}% · delay ${Math.round(rtt*1000)} ms`; }
    if(!sess.video) return;
    const prev=level;
    if(q<=1) level=Math.min(steps.length-1, level+1); else if(q===2) level=Math.min(3, level+1); else if(q===4 && level>0) level--;
    if(level===prev) return;
    const snd=pc.getSenders().find(x=>x.track&&x.track.kind==="video"); if(!snd) return;
    try{ const p=snd.getParameters(); if(!p.encodings||!p.encodings.length) p.encodings=[{}];
      const st=steps[level]; p.encodings[0].active = st.br>0; if(st.br>0){ p.encodings[0].maxBitrate=st.br; p.encodings[0].scaleResolutionDownBy=st.scale; }
      await snd.setParameters(p); sess.log("video step "+level);
      if(st.br===0 && !sess.videoPausedNote){ sess.videoPausedNote=true; toast("Weak connection: video paused to keep the voice clear"); }
      if(st.br>0) sess.videoPausedNote=false;
    }catch(e){}
  },2000);
}
function micHelp(e){
  const name=(e&&e.name)||"", busy=/NotReadable|TrackStart|Abort/.test(name), missing=/NotFound|Overconstrained/.test(name);
  const sh=$("#sheet");
  const title = busy ? "Microphone is busy" : missing ? "No microphone found" : "Microphone is blocked";
  const body = busy ? "Another app is using the microphone right now: a phone call, WhatsApp, a voice recorder or a screen recorder. Finish or close it, then call again."
    : missing ? "This phone did not report a working microphone. Restart the phone and try again."
    : "Android is not letting Xapp use the microphone. Open Xapp's settings, tap Permissions → Microphone and choose “Allow only while using the app”. Avoid “Only this time”, which switches off again when Xapp closes.";
  sh.innerHTML=`<header class="bar"><button class="ibtn" data-close aria-label="Back">${ico("back")}</button><div class="grow"><b style="font-size:17px">${title}</b></div></header>
    <div class="form"><p style="margin:0;line-height:1.5">${body}</p>
    ${!busy&&!missing&&isNative()?'<button class="btn" id="micOpen">Open Xapp settings</button>':""}
    <p class="note">Error: ${esc(name||"unknown")}</p></div>`;
  sh.hidden=false; sh.onclick=ev=>{ if(ev.target.closest("[data-close]")) sh.hidden=true; };
  const b=$("#micOpen"); if(b) b.onclick=()=>{ sh.hidden=true; nat("Background","openAppInfo"); };
}
/* Cloudflare relay (nearest data centre — Doha inside Qatar): fresh logins from the Xapp Worker, cached ~10 h */
async function cfIce(){
  const w=CFG.cfWorker; if(!w||!w.url) return [];
  try{ const c=JSON.parse(localStorage.getItem("xappCfIce")||"null"); if(c && c.exp>Date.now()) return c.ice; }catch(e){}
  try{
    const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),3500);
    const r=await fetch(w.url,{headers:{"x-app-key":w.key||""},signal:ctl.signal}); clearTimeout(t);
    if(!r.ok) return [];
    const d=await r.json(); const ice=(d.iceServers||[]).filter(x=>x&&x.urls);
    try{ localStorage.setItem("xappCfIce",JSON.stringify({ice, exp:Date.now()+Math.min((d.ttl||43200)*1000-2*3600e3, 10*3600e3)})); }catch(e){}
    return ice;
  }catch(e){ return []; }
}
/* Relay choice (Settings → Calls → Relay). Both phones use the caller's choice, so a call never hops between two relays. */
const RELAYS={auto:"Auto (best available)", cloudflare:"Cloudflare", "cloudflare-tls":"Cloudflare · secure 443", express:"ExpressTURN", metered:"Metered", "metered-tls":"Metered · secure 443"};
function iceWith(cf, choice){   // auto order = Cloudflare, then ExpressTURN, then Metered
  const t=CFG.turn||[], isExp=x=>[].concat(x.urls).some(u=>/expressturn/.test(u)), isMet=x=>[].concat(x.urls).some(u=>/metered/.test(u));
  const stun=ICE.iceServers.filter(x=>!x.username);
  // "secure 443": relay over TLS on port 443 only. Looks like normal HTTPS, so networks that drop call traffic (UDP) let it through.
  const tls = list => list.map(x=>({...x, urls:[].concat(x.urls).filter(u=>/^turns:.*:443/.test(u)||/^turns:/.test(u))})).filter(x=>x.urls.length);
  if(choice==="cloudflare-tls" && tls(cf).length) return {...ICE, iceServers:tls(cf), iceTransportPolicy:"relay"};
  if(choice==="metered-tls" && tls(t.filter(isMet)).length) return {...ICE, iceServers:tls(t.filter(isMet)), iceTransportPolicy:"relay"};
  const pick = choice==="cloudflare"&&cf.length ? cf : choice==="express"&&t.some(isExp) ? t.filter(isExp) : choice==="metered"&&t.some(isMet) ? t.filter(isMet)
    : [...cf, ...t.filter(isExp), ...t.filter(x=>!isExp(x))];
  return {...ICE, iceServers:[...pick, ...stun]}; }
async function prepare(sess){
  let mediaErr=null;
  try{ sess.local=await getMedia(sess.video); sess.log("media ok "+sess.local.getTracks().map(t=>t.kind).join("+")); }
  catch(e){ mediaErr=e; sess.log("media err "+(e&&e.name)); if(sess.video){ try{ sess.local=await getMedia(false); sess.video=false; toast("Camera unavailable. Switched to voice."); }catch(e2){} } }
  if(!sess.local){ sess.log("no media"); sess.saveDiag("no-media"); micHelp(mediaErr); return false; }
  if(!api.demo){
    const cf=await cfIce(); sess.diag.cf=cf.length>0;
    sess.relay = sess.outgoing ? (PREFS.relay||"auto") : ((sess.inc&&sess.inc.relay)||"auto"); sess.diag.relay=sess.relay;
    const pc=new RTCPeerConnection({...iceWith(cf, sess.relay), iceCandidatePoolSize:2}); sess.pc=pc;
    sess.local.getTracks().forEach(t=>pc.addTrack(t,sess.local));
    preferRed(pc, sess);
    tuneSenders(pc, sess.video);
    pc.ontrack=e=>{ if(e.streams[0]) sess.remote=e.streams[0]; else sess.remote.addTrack(e.track); attachRemote(sess); };
    pc.onicecandidateerror=e=>{ const k=e.errorCode+" "+(e.url||""); sess.diag.errs[k]=(sess.diag.errs[k]||0)+1; };
    pc.onconnectionstatechange=()=>sess.log("conn "+pc.connectionState);
    pc.onsignalingstatechange=()=>sess.log("sig "+pc.signalingState);
    pc.onicegatheringstatechange=()=>sess.log("gather "+pc.iceGatheringState);
    pc.oniceconnectionstatechange=()=>{ const st=pc.iceConnectionState; sess.log("ice "+st);
      if(st==="connected"||st==="completed"){ sess.connected=true; clearTimeout(sess.failT); attachRemote(sess); route(sess); }
      if(st==="disconnected"){ sess.connected=false; const p=$("#callSt"); if(p) p.textContent="Reconnecting…"; }
      if(st==="failed"){ sess.connected=false; const p=$("#callSt"); if(p) p.textContent="Can't connect · relay "+(sess.types.has("relay")?"reached":"NOT reached");
        toast("The networks blocked the call. A relay (TURN) server is needed."); sess.failT=setTimeout(()=>sess.hangup(),3500); } };
  }
  return true;
}
async function startCall(peer, video){
  if(call) return toast("You are already on a call");
  const sess=newSession(peer,video,true); call=sess; drawCall("outgoing");
  if(!await prepare(sess)){ $("#call").hidden=true; call=null; return; }
  drawCall("outgoing"); ringSound("ringback");
  try{ await api.startCall(peer,sess.video,sess); }catch(e){ toast("Call failed. Check your connection."); sess.close("ended"); return; }
  sess.missT=setTimeout(()=>{ if(!sess.startedAt) { sess.setStatus({status:"missed"}); sess.close("missed"); } },40000);
}
function incoming(c){
  if(call && (call.id===c.id || (call.inc && call.inc.id===c.id))) return;   // same call reported again
  if(call){ api.declineCall(c.id); return; }
  api.wantUsers([c.caller]);
  ringing=c; const sess=newSession(c.caller,c.video,false); sess.inc=c; call=sess; sess.log("ringing"); drawCall("incoming");
  api.markRinging && api.markRinging(c.id);   // tells the caller "Ringing…"
  // in the APK the native side decides: rings only while Xapp is on screen, the notification rings otherwise
  const ci=()=>{ const u=S.users[c.caller]; return {id:c.id, name:u?u.name:"Xapp", video:!!c.video}; };
  if(isNative() || !document.hidden) ringSound("incoming", ci());
  applyCallAction();
  if(document.hidden && "Notification" in window && Notification.permission==="granted"){ try{ const u=S.users[c.caller]; new Notification(`${u?u.name:"Xapp"} is calling`,{body:c.video?"Video call":"Voice call",tag:"call"}); }catch(e){} }
}
/* Xapp brought to the front while a call is ringing (pop-up / notification tapped): keep ringing on screen */
function reRing(){ if(document.hidden) return; const c=call; if(c && c.inc && !c.startedAt && !c.answering && !c.closed){ clearTimeout(window._reRingT); window._reRingT=setTimeout(()=>{ if(call===c && !c.startedAt && !c.answering && !c.closed){ const u=S.users[c.inc.caller]; ringSound("incoming",{id:c.inc.id,name:u?u.name:"Xapp",video:!!c.inc.video}); } },350); } }
document.addEventListener("visibilitychange", reRing); window.addEventListener("focus", reRing);
function gone(id){ if(call && call.inc && call.inc.id===id && !call.startedAt && !call.answering){ call.log("caller cancelled"); call.close("missed"); } }
async function answer(){
  const sess=call; if(!sess||sess.answering) return; sess.answering=true; sess.log("answer tapped"); stopTone(); drawCall("connecting");
  if(!await prepare(sess)){ api.declineCall(sess.inc.id); sess.close("ended"); return; }
  try{ await api.acceptCall(sess.inc,sess); }catch(e){ toast("Could not connect the call"); sess.close("ended"); }
}
function drawCall(state){
  const s=call; if(!s) return; const u=S.users[s.peer]||{uid:s.peer,name:"Contact"}; const el=$("#call");
  const showVid=s.video && (state==="active"||state==="outgoing"||state==="connecting") && s.local;
  el.classList.toggle("video-on",!!(s.video&&state==="active"));
  const label={outgoing:s.peerRinging?"Ringing…":"Calling…",incoming:s.video?"Incoming video call":"Incoming voice call",connecting:"Connecting…",active:"0:00"}[state];
  el.innerHTML=`${s.video&&state==="active"?`<video class="remote" id="rv" autoplay playsinline muted></video>`:""}<audio id="ra" autoplay></audio>
    ${showVid?`<video class="local" id="lv" autoplay playsinline muted></video>`:""}
    ${state==="active"?`<div class="net" id="netQ" data-q="${s.quality||4}" aria-label="Connection quality"><i></i><i></i><i></i><i></i><span>Weak connection</span></div>`:""}
    ${state!=="incoming"?`<button class="topb ibtn" id="kMin" aria-label="Minimise call: go to chats" title="Minimise">${ico("chevdown")}</button>`:""}
    <div class="info"><span class="enc" style="display:flex;align-items:center;gap:6px"><svg viewBox="0 0 512 512" width="16" height="16" aria-hidden="true"><g fill="#FF6A13"><circle cx="256" cy="246" r="168"/><path d="M150 336 C146 372 132 398 108 418 C150 420 196 404 230 372 Z"/></g><path d="M200 190 L312 302 M312 190 L200 302" stroke="#0B0B0C" stroke-width="38" stroke-linecap="round" fill="none"/></svg>Xapp · end-to-end encrypted call</span>${avatar(u,"xl "+(state==="incoming"||state==="outgoing"?"pulse":""))}<h2>${esc(u.name)}</h2><p id="callSt">${state==="active"?callStatusText(s):label}</p></div>
    <div class="ctrls">${state==="incoming"
      ? `<div class="cb"><button class="end" id="kDec" aria-label="Decline">${endIco}</button><small>Decline</small></div><div class="cb"><button class="ok" id="kAns" aria-label="Answer">${ico(s.video?"video":"phone")}</button><small>Answer</small></div>`
      : `<div class="cb"><button id="kAud" aria-label="Audio output">${ico("speaker")}</button><small id="kAudL">Audio</small></div>${s.video?`<div class="cb"><button id="kCam" aria-label="Camera on or off" class="${s.camOff?"on":""}">${ico(s.camOff?"videooff":"video")}</button><small>Camera</small></div><div class="cb"><button id="kFlip" aria-label="Switch camera">${ico("flip")}</button><small>Flip</small></div>`:""}
         <div class="cb"><button id="kMute" aria-label="Mute" class="${s.muted?"on":""}">${ico(s.muted?"micoff":"mic")}</button><small>${s.muted?"Unmute":"Mute"}</small></div><div class="cb"><button class="end" id="kEnd" aria-label="End call">${endIco}</button><small>End</small></div>`}</div>`;
  el.hidden=!!s.minimized;
  const lv=$("#lv"); if(lv&&s.local){ lv.srcObject=s.local; makeDraggable(lv); }
  const km=$("#kMin"); if(km) km.onclick=e=>{ e.stopPropagation(); if(s.startedAt) minimizeCall(); else toast("You can minimise once the call is answered"); };
  if(state==="active") wakeCall();
  const nq=$("#netQ"); if(nq) nq.onclick=e=>{ e.stopPropagation(); let p=$("#netInfo");
    if(p){ p.remove(); return; } p=document.createElement("div"); p.id="netInfo"; p.className="netinfo"; p.onclick=ev=>{ ev.stopPropagation(); p.remove(); };
    $("#call").appendChild(p); if(s.stats) renderNetInfo(s); else p.innerHTML="<b>Call quality</b><small>Measuring…</small>"; wakeCall(); };
  attachRemote(s);
  if(state==="incoming"){ $("#kDec").onclick=()=>{ api.declineCall(s.inc.id); s.close("declined"); }; $("#kAns").onclick=answer; return; }
  $("#kEnd").onclick=()=>s.hangup();
  $("#kMute").onclick=()=>{ s.muted=!s.muted; s.local&&s.local.getAudioTracks().forEach(t=>t.enabled=!s.muted); const b=$("#kMute"); b.classList.toggle("on",s.muted); b.innerHTML=ico(s.muted?"micoff":"mic"); b.nextElementSibling.textContent=s.muted?"Unmute":"Mute"; };
  $("#kAud").onclick=e=>{ e.stopPropagation(); audioMenu(s); };
  audioBtn(s);
  if($("#kCam")) $("#kCam").onclick=()=>{ s.camOff=!s.camOff; s.local&&s.local.getVideoTracks().forEach(t=>t.enabled=!s.camOff); const b=$("#kCam"); b.classList.toggle("on",s.camOff); b.innerHTML=ico(s.camOff?"videooff":"video"); };
  if($("#kFlip")) $("#kFlip").onclick=async()=>{ try{ s.front=!s.front; const ns=await navigator.mediaDevices.getUserMedia({video:{facingMode:s.front?"user":"environment",width:{ideal:1280},height:{ideal:720}}});
    const nt=ns.getVideoTracks()[0], old=s.local.getVideoTracks()[0]; if(s.pc){ const snd=s.pc.getSenders().find(x=>x.track&&x.track.kind==="video"); snd&&snd.replaceTrack(nt); }
    s.local.removeTrack(old); old.stop(); s.local.addTrack(nt); const l=$("#lv"); if(l){ l.srcObject=s.local; l.style.transform=s.front?"scaleX(-1)":"none"; } }catch(e){ toast("Could not switch camera"); } };
}
addEventListener("beforeunload",()=>{ if(call) call.hangup(); });
/* Android back button (APK) */
function onBack(){
  if(call){ if(!$("#call").hidden && call.startedAt) minimizeCall(); return; }
  if(!$("#pop").hidden){ const c=$("#pop [data-close]"); if(c) c.click(); return; }
  if(!$("#viewer").hidden){ closeViewer(); return; }
  if(!$("#scan").hidden){ scanClose(); return; } if(!$("#story").hidden){ $("#story").hidden=true; $("#story").style.background=""; return; }
  if(!$("#sheet").hidden){ $("#sheet").hidden=true; return; }
  if(S.peer&&innerWidth<900){ closeChat(); return; }
  if(S.tab!=="chats"){ setTab("chats"); return; }
  nat("App","minimizeApp");
}
try{ const C=window.Capacitor; if(C&&C.getPlatform&&C.getPlatform()!=="web"){
  if(C.Plugins&&C.Plugins.App&&C.Plugins.App.addListener) C.Plugins.App.addListener("backButton",onBack);
  else if(C.nativeCallback) C.nativeCallback("App","addListener",{eventName:"backButton"},onBack); } }catch(e){}
