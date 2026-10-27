"""Checks every relay (TURN) server Xapp uses. Run on GitHub Actions with the relay secrets in the environment.
1) TURN login (Allocate) over UDP, TCP and TLS.  2) A real WebRTC connection forced through each relay (headless Chrome).
Prints results as GitHub notices. Never prints usernames or passwords."""
import os, socket, ssl, struct, hashlib, hmac, json, sys
MAGIC = 0x2112A442
def attr(t, v): return struct.pack("!HH", t, len(v)) + v + b"\0" * ((4 - len(v) % 4) % 4)
def msg(mtype, attrs, key=None):
    tid = os.urandom(12); body = b"".join(attrs)
    if key:
        hdr = struct.pack("!HHI", mtype, len(body) + 24, MAGIC) + tid
        body += attr(0x0008, hmac.new(key, hdr + body, hashlib.sha1).digest())
    return struct.pack("!HHI", mtype, len(body), MAGIC) + tid + body
def parse(d):
    t, l = struct.unpack("!HH", d[:4]); i = 20; out = {}
    while i < 20 + l:
        a, n = struct.unpack("!HH", d[i:i+4]); out[a] = d[i+4:i+4+n]; i += 4 + n + ((4 - n % 4) % 4)
    return t, out
def code(a):
    e = a.get(0x0009); return (e[2]*100 + e[3], e[4:].decode(errors="replace")) if e else (None, "")
def allocate(host, port, proto, user, pw):
    try:
        if proto == "udp":
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(5); addr = (socket.gethostbyname(host), port)
            send = lambda m: s.sendto(m, addr); recv = lambda: s.recvfrom(4096)[0]
        else:
            s = socket.create_connection((host, port), timeout=6)
            if proto == "tls": s = ssl.create_default_context().wrap_socket(s, server_hostname=host)
            def recv():
                h = b""
                while len(h) < 20: h += s.recv(20 - len(h))
                n = struct.unpack("!H", h[2:4])[0]; b = b""
                while len(b) < n: b += s.recv(n - len(b))
                return h + b
            send = lambda m: s.sendall(m)
        tr = attr(0x0019, bytes([17, 0, 0, 0]))
        send(msg(0x0003, [tr])); t, a = parse(recv())
        c, _ = code(a)
        if c != 401: return f"unexpected first reply {hex(t)} {c}"
        realm, nonce = a.get(0x0014, b""), a.get(0x0015, b"")
        key = hashlib.md5(f"{user}:{realm.decode()}:{pw}".encode()).digest()
        send(msg(0x0003, [tr, attr(0x0006, user.encode()), attr(0x0014, realm), attr(0x0015, nonce)], key))
        t, a = parse(recv())
        if t == 0x0103: return "OK"
        c, why = code(a); return f"REJECTED {c} {why}"
    except Exception as e:
        return f"NO REPLY ({type(e).__name__}: {e})"

E = os.environ
servers = []
if E.get("MU") and E.get("MP"):
    h = "global.relay.metered.ca"
    servers.append(("Metered", E["MU"], E["MP"], [(h,80,"udp"),(h,80,"tcp"),(h,443,"udp"),(h,443,"tls")],
        [f"turn:{h}:80", f"turn:{h}:80?transport=tcp", f"turn:{h}:443", f"turns:{h}:443?transport=tcp"]))
if E.get("TU") and E.get("TP"):
    h = "free.expressturn.com"
    servers.append(("ExpressTURN", E["TU"], E["TP"], [(h,3478,"udp"),(h,3478,"tcp")],
        [f"turn:{h}:3478", f"turn:{h}:3478?transport=tcp"]))
if not servers: print("::error::No relay secrets available to this workflow"); sys.exit(1)

summary = []
for name, u, p, probes, urls in servers:
    print(f"::notice title={name} secrets::username length {len(u)}, password length {len(p)}, username starts '{u[:3]}…'")
    for host, port, proto in probes:
        r = allocate(host, port, proto, u, p)
        lvl = "notice" if r == "OK" else "warning"
        print(f"::{lvl} title={name} login {proto.upper()} {port}::{r}"); summary.append((name, f"login {proto} {port}", r))

# Real WebRTC call through each relay (relay-only), in headless Chrome
from playwright.sync_api import sync_playwright
PAGE = """<script>
async function test(ice){
  const a=new RTCPeerConnection(ice), b=new RTCPeerConnection(ice); const types={a:new Set(),b:new Set()}, errs=[];
  a.onicecandidate=e=>{ if(e.candidate){ types.a.add(e.candidate.type); b.addIceCandidate(e.candidate); } };
  b.onicecandidate=e=>{ if(e.candidate){ types.b.add(e.candidate.type); a.addIceCandidate(e.candidate); } };
  a.onicecandidateerror=e=>errs.push(e.errorCode+' '+e.url); 
  const ch=a.createDataChannel('x'); let got=false;
  b.ondatachannel=e=>{ e.channel.onmessage=m=>{ if(m.data==='ping') got=true; }; };
  await a.setLocalDescription(await a.createOffer()); await b.setRemoteDescription(a.localDescription);
  await b.setLocalDescription(await b.createAnswer()); await a.setRemoteDescription(b.localDescription);
  const t0=Date.now(); while(Date.now()-t0<20000 && ch.readyState!=='open') await new Promise(r=>setTimeout(r,200));
  if(ch.readyState==='open'){ ch.send('ping'); await new Promise(r=>setTimeout(r,1500)); }
  let pair=''; (await a.getStats()).forEach(s=>{ if(s.type==='candidate-pair'&&s.state==='succeeded'&&s.nominated) pair=s.localCandidateId; });
  const st=await a.getStats(); let proto=''; st.forEach(s=>{ if(s.id===pair) proto=(s.relayProtocol||'')+' '+(s.candidateType||''); });
  const r={state:a.iceConnectionState, open:ch.readyState==='open', delivered:got, relayCandidates:[...types.a].includes('relay'), via:proto, errors:[...new Set(errs)].slice(0,4)};
  a.close(); b.close(); return r;
}
</script>"""
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(); pg.set_content(PAGE)
    for name, u, p, _, urls in servers:
        for url in urls:
            ice = {"iceServers": [{"urls": [url], "username": u, "credential": p}], "iceTransportPolicy": "relay"}
            r = pg.evaluate("ice=>test(ice)", ice)
            ok = r["delivered"]
            print(f"::{'notice' if ok else 'warning'} title={name} CALL via {url}::{'WORKS' if ok else 'FAILED'} · {json.dumps(r)}")
            summary.append((name, "call " + url, "WORKS" if ok else "FAILED"))
    br.close()
print("\nSUMMARY"); [print(f"{n:12} {k:55} {v}") for n, k, v in summary]
