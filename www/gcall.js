/* =========================  GROUP CALLS  =========================
   Free "mesh" group calls: every phone connects to every other phone (directly or through the relays).
   Voice up to 8 people, video up to 4.
   Firestore:
     calls/{id}  {group:true, chat, caller, members[], liveMembers[] (while the call is alive), joined[], video, status:"ringing"|"active"|"ended", createdAt}
     calls/{id}/peers/{from_to}         one connection between two people: {from, to, offer, answer}
     calls/{id}/peers/{from_to}/cands   network candidates {from, c}
*/
(function(){
const GV_MAX_VIDEO = 4, GV_MAX_VOICE = 8;
let G = null;              // the group call in progress (one at a time)
let gInc = null;           // incoming group call being shown
const dismissed = new Set();
const fs = () => firebase.firestore();
const CALLS = () => fs().collection("calls");
const meId = () => S.me && S.me.uid;
const FV = () => firebase.firestore.FieldValue;

/* ---------- start / join / leave ---------- */
async function startGroupCall(gid, video){
  if(api.demo) return toast("Group calls need an account");
  if(G) return toast("You're already in a group call");
  if(typeof call!=="undefined" && call && !call.closed) return toast("Finish your current call first");
  const g=groupOf(gid); if(!g) return;
  const max = video?GV_MAX_VIDEO:GV_MAX_VOICE;
  if((g.members||[]).length>max) toast(`Group ${video?"video":"voice"} calls connect up to ${max} people. The first ${max} to join will be in the call.`);
  let local; try{ local=await getMedia(!!video); }catch(e){ return micHelp(e); }
  const ref=CALLS().doc();
  const doc={group:true, chat:gid, caller:meId(), members:g.members||[], liveMembers:g.members||[], joined:[meId()], video:!!video, status:"ringing", createdAt:Date.now(), relay:PREFS.relay||"auto"};
  try{ await ref.set(doc); }catch(e){ local.getTracks().forEach(t=>t.stop()); return toast("Couldn't start the call. Check your connection."); }
  api.push("gcall",{id:ref.id, to:gid});
  setTimeout(()=>{ if(G&&G.id===ref.id&&G.peers.size===0&&!G.closed) api.push("gcall",{id:ref.id, to:gid}); }, 8000);   // ring again if nobody has joined yet
  enter(ref.id, doc, local, true);
}
async function joinGroupCall(c){
  hideIncoming(); stopTone();
  if(G) return;
  const max=c.video?GV_MAX_VIDEO:GV_MAX_VOICE;
  if((c.joined||[]).length>=max) return toast(`This call is full (${max} people)`);
  let local; try{ local=await getMedia(!!c.video); }catch(e){ return micHelp(e); }
  try{ await CALLS().doc(c.id).update({joined:FV().arrayUnion(meId()), status:"active"}); }catch(e){ local.getTracks().forEach(t=>t.stop()); return toast("Couldn't join. The call may have ended."); }
  enter(c.id, c, local, false);
}
async function enter(id, doc, local, isCaller){
  const cf = await cfIce();
  G={id, doc, local, isCaller, video:!!doc.video, peers:new Map(), subs:[], muted:false, camOff:false, speaker:true, startedAt:Date.now(), closed:false, cf, relay:doc.relay||"auto"};
  drawCall();
  nat("AudioRoute","set",{active:true, route:"auto", preferSpeaker:true});
  nat("Background","callState",{active:true, peer:groupName(), video:G.video, startedAt:Date.now()});
  // the call document: who is in, who left, has it ended
  G.subs.push(CALLS().doc(id).onSnapshot(s=>{ if(!G||G.id!==id) return; const d=s.data(); if(!d) return leave("gone");
    G.doc={...G.doc,...d};
    if(d.status==="ended") return leave("ended");
    // someone left: close their connection
    for(const uid of [...G.peers.keys()]) if(!(d.joined||[]).includes(uid)) dropPeer(uid);
    // I'm new: connect to everyone already in the call (the newcomer starts each connection)
    if(!G.offered){ G.offered=true; (d.joined||[]).filter(u=>u!==meId()).slice(0,(G.video?GV_MAX_VIDEO:GV_MAX_VOICE)-1).forEach(u=>connect(u,true)); }
    drawTiles();
  }));
  // connections started by people who join after me
  G.subs.push(CALLS().doc(id).collection("peers").where("to","==",meId()).onSnapshot(s=>{ s.docChanges().forEach(ch=>{
    const p=ch.doc.data(); if(ch.type==="added" && p.offer && !G.peers.has(p.from)) connect(p.from,false,ch.doc.ref,p.offer);
  }); }));
  G.tick=setInterval(()=>{ const t=$("#gcT"); if(t) t.textContent=dur((Date.now()-G.startedAt)/1000); speaking(); }, 500);
  // nobody answered in 50 s: end the call
  if(isCaller) G.noAnswerT=setTimeout(()=>{ if(G&&G.id===id&&G.peers.size===0){ toast("No one joined"); leave("noanswer"); } }, 50000);
}
async function leave(why){
  if(!G||G.closed) return; const g=G; g.closed=true; G=null;
  clearInterval(g.tick); clearTimeout(g.noAnswerT);
  g.subs.forEach(u=>{ try{u();}catch(e){} });
  g.peers.forEach((p,uid)=>{ try{ p.pc.close(); }catch(e){} });
  g.local.getTracks().forEach(t=>t.stop());
  nat("AudioRoute","set",{active:false}); nat("Background","callState",{active:false});
  const el=$("#gcall"); if(el) el.remove();
  if(why!=="ended"&&why!=="gone"){ try{
    const ref=CALLS().doc(g.id), left=(g.doc.joined||[]).filter(u=>u!==meId());
    if(!left.length){ await ref.update({status:"ended", liveMembers:[], joined:[], endedAt:Date.now()}); if(g.isCaller) api.push("gcancel",{id:g.id, to:g.doc.chat}); }
    else await ref.update({joined:FV().arrayRemove(meId())});
  }catch(e){} }
}

/* ---------- one connection to one person ---------- */
async function connect(uid, initiator, refIn, offerIn){
  if(!G||G.peers.has(uid)) return; const g=G;
  const pc=new RTCPeerConnection({...iceWith(g.cf, g.relay), iceCandidatePoolSize:1});
  const peer={pc, uid, stream:new MediaStream(), cands:[], remoteSet:false}; g.peers.set(uid, peer);
  g.local.getTracks().forEach(t=>pc.addTrack(t, g.local));
  const fake={diag:{}, log:()=>{}}; if(PREFS.red!==false) preferRed(pc, fake);
  tuneSenders(pc, g.video);
  pc.ontrack=e=>{ e.streams[0] ? e.streams[0].getTracks().forEach(t=>{ if(!peer.stream.getTracks().includes(t)) peer.stream.addTrack(t); }) : peer.stream.addTrack(e.track); drawTiles(); };
  pc.onconnectionstatechange=()=>{ peer.state=pc.connectionState; drawTiles(); if(pc.connectionState==="failed") { try{ pc.restartIce&&pc.restartIce(); }catch(e){} } };
  const ref = refIn || CALLS().doc(g.id).collection("peers").doc(meId()+"_"+uid);
  pc.onicecandidate=e=>{ if(e.candidate) ref.collection("cands").add({from:meId(), c:e.candidate.toJSON()}).catch(()=>{}); };
  const addCand=c=>{ if(peer.remoteSet) pc.addIceCandidate(c).catch(()=>{}); else peer.cands.push(c); };
  const flush=()=>{ peer.remoteSet=true; peer.cands.splice(0).forEach(c=>pc.addIceCandidate(c).catch(()=>{})); };
  g.subs.push(ref.collection("cands").where("from","==",uid).onSnapshot(s=>s.docChanges().forEach(ch=>{ if(ch.type==="added") addCand(ch.doc.data().c); })));
  try{
    if(initiator){
      const o=await pc.createOffer(); o.sdp=tuneSdp(o.sdp); await pc.setLocalDescription(o);
      await ref.set({from:meId(), to:uid, offer:{type:o.type, sdp:o.sdp}, at:Date.now()});
      g.subs.push(ref.onSnapshot(async s=>{ const d=s.data(); if(d&&d.answer&&!peer.remoteSet){ try{ await pc.setRemoteDescription(d.answer); flush(); }catch(e){} } }));
    } else {
      await pc.setRemoteDescription(offerIn); flush();
      const a=await pc.createAnswer(); a.sdp=tuneSdp(a.sdp); await pc.setLocalDescription(a);
      await ref.update({answer:{type:a.type, sdp:a.sdp}});
    }
  }catch(e){ console.warn("group connect", e); }
  clearTimeout(g.noAnswerT);
  drawTiles();
}
function dropPeer(uid){ if(!G) return; const p=G.peers.get(uid); if(!p) return; try{ p.pc.close(); }catch(e){} G.peers.delete(uid); drawTiles(); }

/* ---------- who is speaking (orange ring) ---------- */
function speaking(){
  if(!G) return;
  G.peers.forEach(p=>{ let lvl=0; try{ p.pc.getReceivers().forEach(r=>{ if(r.track&&r.track.kind==="audio"&&r.getSynchronizationSources){ const s=r.getSynchronizationSources()[0]; if(s&&s.audioLevel>lvl) lvl=s.audioLevel; } }); }catch(e){}
    const on=lvl>0.04; if(on!==p.talk){ p.talk=on; const t=document.querySelector(`#gcall [data-u="${p.uid}"]`); if(t) t.classList.toggle("spk",on); } });
}

/* ---------- screens ---------- */
function groupName(){ const g=G&&groupOf(G.doc.chat); return (g&&g.name)||"Group call"; }
function drawCall(){
  let el=$("#gcall"); if(!el){ el=document.createElement("div"); el.id="gcall"; document.body.appendChild(el); }
  el.className="gcall"+(G.video?" gvid":"");
  el.innerHTML=`<div class="gtop"><b>${esc(groupName())}</b><small>${G.video?"Group video":"Group voice"} · <span id="gcN">1 person</span> · <span id="gcT">0:00</span></small></div>
    <div class="${G.video?"ggrid":"gvoice"}" id="gTiles"></div>
    <div class="gctr">
      <button class="gb ${G.speaker?"on":""}" id="gSpk" aria-label="Speaker">${ico("speaker")}</button>
      ${G.video?`<button class="gb on" id="gCam" aria-label="Camera">${ico("video")}</button>`:""}
      <button class="gb" id="gMute" aria-label="Mute">${ico("mic")}</button>
      ${G.isCaller?`<button class="gb" id="gRing" aria-label="Ring the others again">${ico("users")}</button>`:""}
      <button class="gb end" id="gEnd" aria-label="Leave call">${ico("phone")}</button>
    </div>`;
  $("#gEnd").onclick=()=>leave("hangup");
  $("#gMute").onclick=()=>{ G.muted=!G.muted; G.local.getAudioTracks().forEach(t=>t.enabled=!G.muted); $("#gMute").classList.toggle("on",G.muted); $("#gMute").innerHTML=ico(G.muted?"micoff":"mic"); drawTiles(); };
  $("#gSpk").onclick=()=>{ G.speaker=!G.speaker; nat("AudioRoute","set",{active:true, route:G.speaker?"speaker":"earpiece", preferSpeaker:G.speaker}); $("#gSpk").classList.toggle("on",G.speaker); };
  if($("#gCam")) $("#gCam").onclick=()=>{ G.camOff=!G.camOff; G.local.getVideoTracks().forEach(t=>t.enabled=!G.camOff); $("#gCam").classList.toggle("on",!G.camOff); $("#gCam").innerHTML=ico(G.camOff?"videooff":"video"); drawTiles(); };
  if($("#gRing")) $("#gRing").onclick=()=>{ api.push("gcall",{id:G.id, to:G.doc.chat}); toast("Ringing the others again"); };
  drawTiles();
}
function drawTiles(){
  const box=$("#gTiles"); if(!box||!G) return;
  const joined=(G.doc.joined||[]), me=meId();
  const others=(G.doc.members||[]).filter(u=>u!==me);
  const inCall=others.filter(u=>G.peers.has(u)||joined.includes(u));
  const ringing=G.doc.status!=="ended" ? others.filter(u=>!inCall.includes(u)).slice(0, G.video?0:Math.max(0,GV_MAX_VOICE-1-inCall.length)) : [];
  const n=1+inCall.length; const nEl=$("#gcN"); if(nEl) nEl.textContent=n+(n===1?" person":" people");
  const name=u=>(S.users[u]||{}).name||"Member";
  const state=u=>{ const p=G.peers.get(u); return !p?"joining…":p.state==="connected"?"":p.state==="failed"?"reconnecting…":"connecting…"; };
  if(G.video){
    const list=[...inCall.slice(0,GV_MAX_VIDEO-1), me];
    box.dataset.n=list.length;
    // keep existing video elements (re-creating them makes the video flicker)
    const want=new Set(list); box.querySelectorAll(".gt").forEach(t=>{ if(!want.has(t.dataset.u)) t.remove(); });
    list.forEach(u=>{ let t=box.querySelector(`.gt[data-u="${u}"]`);
      if(!t){ t=document.createElement("div"); t.className="gt"; t.dataset.u=u; t.innerHTML=`<video autoplay playsinline ${u===me?"muted":""}></video><div class="gface">${avatar(S.users[u]||{uid:u,name:name(u)},"lg")}</div><span class="gnm"></span>`; box.appendChild(t); }
      const v=t.querySelector("video"), st=u===me?G.local:(G.peers.get(u)||{}).stream;
      if(st && v.srcObject!==st){ v.srcObject=st; const pr=v.play(); if(pr&&pr.catch) pr.catch(()=>{}); }
      const hasVid = u===me ? !G.camOff : !!(st&&st.getVideoTracks().some(x=>x.readyState==="live"&&!x.muted));
      t.classList.toggle("novid", !hasVid); if(u===me) t.classList.add("mine");
      const s=u===me?"":state(u);
      t.querySelector(".gnm").innerHTML=`${u===me&&G.muted?'<span class="gmic">'+ico("micoff")+'</span>':""}${u===me?"You":esc(name(u))}${s?" · "+s:""}`;
    });
  } else {
    // voice: round avatars; remote audio plays through hidden audio elements
    const list=[...inCall, ...ringing.map(u=>"r:"+u), me];
    box.innerHTML=list.map(x=>{ const r=x.startsWith("r:"), u=r?x.slice(2):x, s=u===me?(G.muted?"muted":""):r?"ringing…":state(u);
      return `<div class="gp" data-u="${esc(u)}">${avatar(S.users[u]||{uid:u,name:name(u)},"lg")}<small>${u===me?"You":esc(name(u))}</small><em>${s||"&nbsp;"}</em></div>`; }).join("");
    G.peers.forEach((p,u)=>{ let a=document.getElementById("ga_"+u); if(!a){ a=document.createElement("audio"); a.id="ga_"+u; a.autoplay=true; a.style.display="none"; document.body.appendChild(a); }
      if(a.srcObject!==p.stream){ a.srcObject=p.stream; const pr=a.play(); if(pr&&pr.catch) pr.catch(()=>{}); } });
    document.querySelectorAll("audio[id^='ga_']").forEach(a=>{ if(!G.peers.has(a.id.slice(3))) a.remove(); });
  }
}

/* ---------- incoming group call ---------- */
function showIncoming(c){
  if(G||gInc&&gInc.id===c.id) return; gInc=c;
  const g=groupOf(c.chat)||{name:"Group"}, caller=(S.users[c.caller]||{}).name||"Someone";
  const inCall=(c.joined||[]).filter(u=>u!==meId());
  let el=$("#gcin"); if(!el){ el=document.createElement("div"); el.id="gcin"; document.body.appendChild(el); }
  el.className="gcin";
  el.innerHTML=`<div class="gcin-mid"><div class="gstack">${inCall.slice(0,3).map(u=>avatar(S.users[u]||{uid:u,name:"?"},"lg")).join("")}</div>
      <b>${esc(g.name||"Group")}</b><small>${esc(caller)} is calling · Group ${c.video?"video":"voice"} call</small>
      <small class="gcin-sub">${esc(inCall.map(u=>(S.users[u]||{}).name).filter(Boolean).slice(0,2).join(", "))}${inCall.length>2?` and ${inCall.length-2} other${inCall.length>3?"s":""}`:""}${inCall.length?" in the call":""}</small></div>
    <div class="gcin-btns"><div><button class="gb end big" id="gDecl" aria-label="Decline">${ico("phone")}</button>Decline</div>
      <div><button class="gb join big" id="gJoin" aria-label="Join">${ico(c.video?"video":"phone")}</button>Join</div></div>`;
  $("#gDecl").onclick=()=>{ dismissed.add(c.id); hideIncoming(); stopTone(); };
  $("#gJoin").onclick=()=>joinGroupCall(c);
  ringSound("incoming",{id:c.id, name:caller+" · "+(g.name||"Group"), video:!!c.video});
  clearTimeout(showIncoming.t); showIncoming.t=setTimeout(()=>{ if(gInc&&gInc.id===c.id){ hideIncoming(); stopTone(); } }, 45000);
}
function hideIncoming(){ gInc=null; const el=$("#gcin"); if(el) el.remove(); }

/* live group calls I'm a member of (liveMembers is cleared when a call ends) */
let unsubLive=null;
function watchLive(){
  if(unsubLive){ try{unsubLive();}catch(e){} unsubLive=null; }
  if(!meId()||api.demo) return;
  unsubLive=CALLS().where("liveMembers","array-contains",meId()).onSnapshot(s=>{
    const live=s.docs.map(d=>({id:d.id,...d.data()})).filter(c=>c.group&&c.status!=="ended");
    if(gInc && !live.some(c=>c.id===gInc.id)){ hideIncoming(); stopTone(); }
    live.forEach(c=>{ if(c.caller===meId()||(c.joined||[]).includes(meId())||dismissed.has(c.id)||G) return;
      if(Date.now()-(c.createdAt||0) > 10*60000) return;
      if(!gInc){ CALLS().doc(c.id).update({["ringingAt_"+meId()]:Date.now()}).catch(()=>{}); showIncoming(c); } });
    S.liveGroupCalls=live; if(S.peer&&isGroup(S.peer)) renderChatHead();
  }, e=>console.warn("group calls", e));
}

/* answer / decline from the notification (Xapp closed) */
async function groupCallAction(a){
  if(!a||!a.id) return false;
  try{ const d=await CALLS().doc(a.id).get(); const c=d.data(); if(!c||!c.group) return false;
    if(c.status==="ended"){ toast("The call has ended"); return true; }
    if(a.action==="decline"){ dismissed.add(a.id); return true; }
    if(a.action==="answer") joinGroupCall({id:a.id,...c}); else showIncoming({id:a.id,...c});
    return true; }catch(e){ return false; }
}

window.XG={ startGroupCall, joinGroupCall, leave:()=>leave("hangup"), watchLive, groupCallAction, active:()=>G, live:()=>S.liveGroupCalls||[] };
})();
