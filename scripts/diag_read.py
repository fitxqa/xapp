"""Reads the call / connection-test diagnostics the Xapp phones saved, and prints them as GitHub notices.
Signs in with a temporary account (deleted at the end). Prints only technical connection details."""
import json, os, re, sys, time, urllib.request, secrets as rnd
cfg = open("www/config.js").read()
KEY = re.search(r'apiKey:\s*"([^"]+)"', cfg).group(1); PROJ = re.search(r'projectId:\s*"([^"]+)"', cfg).group(1)
def post(url, body, tok=None):
    req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json", **({"Authorization": "Bearer " + tok} if tok else {})})
    return json.load(urllib.request.urlopen(req, timeout=20))
def get(url, tok):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={"Authorization": "Bearer " + tok}), timeout=20))
def val(v):
    if "mapValue" in v: return {k: val(x) for k, x in v["mapValue"].get("fields", {}).items()}
    if "arrayValue" in v: return [val(x) for x in v["arrayValue"].get("values", [])]
    for k in ("stringValue", "booleanValue", "doubleValue"): 
        if k in v: return v[k]
    if "integerValue" in v: return int(v["integerValue"])
    return None
acct = post(f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={KEY}",
            {"email": f"diag-{rnd.token_hex(5)}@xapp.local", "password": rnd.token_urlsafe(16), "returnSecureToken": True})
tok = acct["idToken"]
try:
    docs, page = [], ""
    while True:   # the rules allow at most 10 per request
        r = get(f"https://firestore.googleapis.com/v1/projects/{PROJ}/databases/(default)/documents/users?pageSize=10" + (f"&pageToken={page}" if page else ""), tok)
        docs += r.get("documents", []); page = r.get("nextPageToken")
        if not page or len(docs) > 300: break
    print(f"::notice title=Users::{len(docs)} accounts")
    now = time.time() * 1000
    for d in docs:
        f = {k: val(v) for k, v in d.get("fields", {}).items()}
        who = f"{f.get('name','?')} (@{f.get('username','?')})"
        n = f.get("diagNet")
        if n:
            age = int((now - n.get("at", 0)) / 60000)
            rows = " | ".join(f"{'OK ' if r.get('ok') else 'X  '}{r.get('route')}: {r.get('detail')}" for r in n.get("results", []))
            print(f"::notice title=NET {who} {age} min ago::app {n.get('app','?')} · net {n.get('net','?')} · {rows} · {n.get('ua','')}")
        c = f.get("diagCall")
        if c:
            age = int((now - c.get("at", 0)) / 60000)
            keep = {k: c.get(k) for k in ("role","video","end","connected","secs","relays","local","remote","errs","pairs","selected","audioInBytes","audioOutBytes","app","statsErr")}
            print(f"::notice title=CALL {who} {age} min ago::{json.dumps(keep)} · EVENTS: {' / '.join(c.get('ev', []))}")
        ap = f.get("diagApp")
        if ap:
            print(f"::notice title=APP {who} {int((now - ap.get('at', 0)) / 60000)} min ago::" + json.dumps({k: v for k, v in ap.items() if k != 'at'}))
        bg = f.get("diagBg")
        if bg:
            ago = lambda k: (f"{int((now - bg[k]) / 60000)} min ago" if isinstance(bg.get(k), (int, float)) else "never")
            rest = {k: v for k, v in bg.items() if not k.endswith("At")}
            print(f"::notice title=BACKGROUND {who}::service started {ago('startedAt')} · last call seen {ago('lastCallSeenAt')} · last ring shown {ago('lastRingShownAt')} · stopped {ago('stoppedAt')} · error {ago('errAt')} · " + json.dumps(rest))
        if not n and not c and not ap and not bg: print(f"::notice title={who}::no diagnostics yet")
finally:
    try: post(f"https://identitytoolkit.googleapis.com/v1/accounts:delete?key={KEY}", {"idToken": tok})
    except Exception as e: print("cleanup:", e)
