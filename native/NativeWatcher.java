package qa.fitx.xapp;

import android.content.Context;
import android.content.SharedPreferences;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentChange;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import android.app.NotificationManager;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationManagerCompat;
import android.os.Handler;
import android.os.Looper;
import java.util.HashMap;
import java.util.Map;

/** Watches Xapp's Firestore for incoming calls and new messages from native code, so the phone rings with the app closed. */
final class NativeWatcher {
    private static ListenerRegistration callReg, chatReg;
    private static String watchingUid = null;
    private static final Map<String, Long> chatLast = new HashMap<>();
    private static final Map<String, String[]> ringing = new HashMap<>();   // callId -> {name, video}
    private static final Map<String, String> names = new HashMap<>();
    private static boolean firstChats = true;
    private static boolean firstCalls = true;
    private static Context appCtx;
    private static final Handler main = new Handler(Looper.getMainLooper());
    private static int retry = 0;
    private static long lastCallSnapAt = 0;
    private static final long STALE_FIRST_SNAPSHOT_MS = 180000;   // only for calls already waiting when the listener (re)attaches

    private NativeWatcher() {}

    static SharedPreferences prefs(Context ctx) { return ctx.getSharedPreferences("xapp_native", Context.MODE_PRIVATE); }

    /** Firebase is set up from the options the web app passes on sign-in (no google-services.json needed). */
    static FirebaseApp app(Context ctx) {
        if (!FirebaseApp.getApps(ctx).isEmpty()) return FirebaseApp.getInstance();
        SharedPreferences p = prefs(ctx);
        String key = p.getString("apiKey", null), proj = p.getString("projectId", null), appId = p.getString("appId", null);
        if (key == null || proj == null || appId == null) return null;
        FirebaseOptions o = new FirebaseOptions.Builder().setApiKey(key).setProjectId(proj).setApplicationId(appId)
            .setGcmSenderId(p.getString("senderId", null)).setStorageBucket(p.getString("bucket", null)).build();
        return FirebaseApp.initializeApp(ctx, o);
    }

    static boolean signedIn(Context ctx) {
        try { FirebaseApp a = app(ctx); return a != null && FirebaseAuth.getInstance(a).getCurrentUser() != null; } catch (Exception e) { return false; }
    }

    static synchronized void start(Context ctx) {
        final Context app = ctx.getApplicationContext();
        appCtx = app;
        FirebaseApp fa; FirebaseUser u;
        try { fa = app(app); if (fa == null) return; u = FirebaseAuth.getInstance(fa).getCurrentUser(); } catch (Exception e) { return; }
        if (u == null) { stop(); return; }
        if (u.getUid().equals(watchingUid) && callReg != null) return;
        stop();
        watchingUid = u.getUid();
        final String uid = watchingUid;
        final FirebaseFirestore fs = FirebaseFirestore.getInstance(fa);
        Map<String, Object> info = new HashMap<>();
        info.put("startedAt", System.currentTimeMillis()); info.put("state", "listening");
        info.put("device", Build.MANUFACTURER + " " + Build.MODEL + " · Android " + Build.VERSION.RELEASE);
        info.put("notifications", NotificationManagerCompat.from(app).areNotificationsEnabled());
        PowerManager pm = (PowerManager) app.getSystemService(Context.POWER_SERVICE);
        info.put("batteryUnrestricted", pm != null && pm.isIgnoringBatteryOptimizations(app.getPackageName()));
        if (Build.VERSION.SDK_INT >= 34) { NotificationManager nm = app.getSystemService(NotificationManager.class); info.put("fullScreenAllowed", nm != null && nm.canUseFullScreenIntent()); }
        diag(fs, uid, info);

        listenCalls(app, fs, uid);

        firstChats = true; chatLast.clear();
        chatReg = fs.collection("chats").whereArrayContains("members", uid)
            .addSnapshotListener((snap, err) -> {
                if (err != null) { Map<String, Object> e = new HashMap<>(); e.put("chatListenerError", err.getMessage()); e.put("errAt", System.currentTimeMillis()); diag(fs, uid, e); scheduleRestart(); return; }
                if (snap == null) return;
                for (DocumentSnapshot c : snap.getDocuments()) {
                    Long at = c.getLong("lastAt"); Long prev = chatLast.get(c.getId());
                    chatLast.put(c.getId(), at == null ? 0L : at);
                    if (firstChats || at == null || (prev != null && at <= prev)) continue;
                    String from = str(c.get("lastFrom"), "");
                    if (from.equals(uid) || MainActivity.inForeground) continue;
                    if (!prefs(app).getBoolean("msgNotif", true)) continue;
                    final String text = str(c.get("last"), "New message"), chatId = c.getId();
                    final boolean grp = chatId.startsWith("grp_"); final String gname = str(c.get("name"), "Group");
                    withName(fs, from, name -> CallNotifications.showMessage(app, chatId, grp ? gname : name, grp ? name + ": " + text : text));
                }
                firstChats = false;
            });
    }


    /** Listens for calls to this user. A Firestore listener dies for good after an error, so errors re-subscribe. */
    private static synchronized void listenCalls(final Context app, final FirebaseFirestore fs, final String uid) {
        if (callReg != null) callReg.remove();
        firstCalls = true;
        callReg = fs.collection("calls").whereEqualTo("callee", uid).whereEqualTo("status", "ringing")
            .addSnapshotListener((snap, err) -> {
                if (err != null) {
                    Map<String, Object> e = new HashMap<>(); e.put("callListenerError", err.getMessage()); e.put("errAt", System.currentTimeMillis()); diag(fs, uid, e);
                    scheduleRestart(); return;
                }
                if (snap == null) return;
                retry = 0; lastCallSnapAt = System.currentTimeMillis();
                final boolean initial = firstCalls; firstCalls = false;
                for (DocumentChange dc : snap.getDocumentChanges()) {
                    final DocumentSnapshot d = dc.getDocument();
                    final String id = d.getId();
                    final boolean video = Boolean.TRUE.equals(d.getBoolean("video"));
                    if (dc.getType() == DocumentChange.Type.ADDED) {
                        if (ringing.containsKey(id)) continue;   // already ringing (listener re-attached)
                        // A call that appears while we are listening is new, whatever the two phones' clocks say.
                        // Only calls already waiting when the listener attaches are checked for age (old leftovers).
                        Long created = d.getLong("createdAt");
                        if (initial && created != null && Math.abs(System.currentTimeMillis() - created) > STALE_FIRST_SNAPSHOT_MS) continue;
                        Map<String, Object> e = new HashMap<>(); e.put("lastCallSeenAt", System.currentTimeMillis()); e.put("inForeground", MainActivity.inForeground); diag(fs, uid, e);
                        holdAwake(app, 20000);
                        final String caller = str(d.get("caller"), "");
                        final String cached = cachedName(app, caller);
                        ringing.put(id, new String[] { cached != null ? cached : "Xapp", video ? "1" : "0" });
                        try { d.getReference().update("ringingAt", System.currentTimeMillis()); } catch (Exception ignored) {}   // caller sees "Ringing…"
                        if (!MainActivity.inForeground) {
                            // ring at once; the name is filled in when it arrives
                            CallNotifications.showIncoming(app, id, cached != null ? cached : "Incoming call", video);
                            Map<String, Object> e2 = new HashMap<>(); e2.put("lastRingShownAt", System.currentTimeMillis()); diag(fs, uid, e2);
                        }
                        if (cached == null) withName(fs, caller, name -> {
                            remember(app, caller, name);
                            String[] r = ringing.get(id);
                            if (r == null) return;   // already answered / ended
                            r[0] = name;
                            if (!MainActivity.inForeground) CallNotifications.showIncoming(app, id, name, video);
                        });
                    } else if (dc.getType() == DocumentChange.Type.REMOVED) {
                        final String[] r = ringing.remove(id);
                        CallNotifications.cancelIncoming(app);
                        if (r != null) d.getReference().get().addOnSuccessListener(full -> {
                            String st = full != null ? str(full.get("status"), "") : "";
                            if (("missed".equals(st) || "ringing".equals(st)) && !MainActivity.inForeground)
                                CallNotifications.showMissed(app, id, r[0], "1".equals(r[1]));
                        });
                    }
                }
            });
    }

    /** Watchdog / network back: re-attach the call listener so a silently dropped connection can't miss calls. */
    static synchronized void refresh(Context ctx) {
        Context app = ctx.getApplicationContext();
        try {
            FirebaseApp fa = app(app); if (fa == null) return;
            FirebaseUser u = FirebaseAuth.getInstance(fa).getCurrentUser();
            if (u == null) return;
            if (callReg == null || chatReg == null || !u.getUid().equals(watchingUid)) { start(app); return; }
            if (!ringing.isEmpty()) return;   // never interrupt a ringing call
            listenCalls(app, FirebaseFirestore.getInstance(fa), u.getUid());
        } catch (Exception ignored) {}
    }

    /** After a listener error: start again in 3 s, 6 s, 12 s … up to 2 minutes. */
    private static void scheduleRestart() {
        final Context app = appCtx; if (app == null) return;
        long delay = Math.min(120000L, 3000L << Math.min(retry, 6)); retry++;
        main.postDelayed(() -> { synchronized (NativeWatcher.class) { stop(); } start(app); }, delay);
    }

    private static PowerManager.WakeLock wl;
    /** Keep the CPU awake briefly so the ringing notification is shown even if the phone is dozing. */
    static synchronized void holdAwake(Context app, long ms) {
        try {
            if (wl == null) { PowerManager pm = (PowerManager) app.getSystemService(Context.POWER_SERVICE); wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "xapp:incoming"); wl.setReferenceCounted(false); }
            wl.acquire(ms);
        } catch (Exception ignored) {}
    }

    private static String cachedName(Context app, String uid) {
        String n = names.get(uid);
        if (n == null) { n = prefs(app).getString("name_" + uid, null); if (n != null) names.put(uid, n); }
        return n;
    }
    private static void remember(Context app, String uid, String name) {
        if (uid == null || uid.isEmpty() || name == null || "Xapp".equals(name)) return;
        names.put(uid, name); prefs(app).edit().putString("name_" + uid, name).apply();
    }

    interface NameCb { void got(String name); }
    private static void withName(FirebaseFirestore fs, String uid, NameCb cb) {
        String n = names.get(uid);
        if (n != null) { cb.got(n); return; }
        fs.collection("users").document(uid).get()
            .addOnSuccessListener(s -> { String v = s != null ? str(s.get("name"), str(s.get("username"), "Xapp")) : "Xapp"; names.put(uid, v); cb.got(v); })
            .addOnFailureListener(e -> cb.got("Xapp"));
    }

    /** Writes the service state into diag/{uid}.diagBg (read back by the diagnostics check). */
    static void diag(FirebaseFirestore fs, String uid, Map<String, Object> fields) {
        try {
            // own small document (diag/{uid}), so contacts don't re-download the whole profile each time
            Map<String, Object> up = new HashMap<>();
            up.put("diagBg", fields);
            fs.collection("diag").document(uid).set(up, com.google.firebase.firestore.SetOptions.merge());
        } catch (Exception ignored) {}
    }

    static synchronized void stop() {
        main.removeCallbacksAndMessages(null);
        if (callReg != null) callReg.remove();
        if (chatReg != null) chatReg.remove();
        callReg = null; chatReg = null; watchingUid = null; ringing.clear();
    }

    static String str(Object o, String def) { return o == null ? def : o.toString(); }

    // ---------------- Google push ----------------
    static boolean pushMode(Context ctx) { return prefs(ctx).getBoolean("pushMode", false); }
    /** The always-on service is only needed when Google push isn't working on this phone. */
    static boolean needService(Context ctx) { return signedIn(ctx) && !pushMode(ctx); }

    /** Push token → tokens/{uid} (the Worker reads it to wake this phone). */
    static void saveToken(Context ctx, String token) {
        try {
            FirebaseApp fa = app(ctx); if (fa == null || token == null) return;
            FirebaseUser u = FirebaseAuth.getInstance(fa).getCurrentUser(); if (u == null) return;
            Map<String, Object> t = new HashMap<>();
            t.put("fcm", token); t.put("at", System.currentTimeMillis()); t.put("platform", "android");
            FirebaseFirestore.getInstance(fa).collection("tokens").document(u.getUid()).set(t);
        } catch (Exception ignored) {}
    }

    /** Push said someone is calling: ring now, then watch the call so the ringing stops when it ends. */
    static synchronized void onPushCall(Context ctx, String id, String from, String name, boolean video) {
        if (id == null) return;
        final Context app = ctx.getApplicationContext(); appCtx = app;
        holdAwake(app, 45000);
        String nm = name != null && !name.isEmpty() ? name : (from != null ? cachedName(app, from) : null);
        if (nm == null) nm = "Incoming call";
        if (from != null && name != null) remember(app, from, name);
        if (!ringing.containsKey(id)) {
            ringing.put(id, new String[] { nm, video ? "1" : "0" });
            if (!MainActivity.inForeground) CallNotifications.showIncoming(app, id, nm, video);
            try {
                FirebaseApp fa = app(app);
                if (fa != null) {
                    FirebaseFirestore fs = FirebaseFirestore.getInstance(fa);
                    fs.collection("calls").document(id).update("ringingAt", System.currentTimeMillis());   // caller sees "Ringing…"
                    FirebaseUser u = FirebaseAuth.getInstance(fa).getCurrentUser();
                    if (u != null) { Map<String, Object> e = new HashMap<>(); e.put("lastCallSeenAt", System.currentTimeMillis()); e.put("inForeground", MainActivity.inForeground); e.put("lastRingShownAt", System.currentTimeMillis()); e.put("via", "push"); diag(fs, u.getUid(), e); }
                }
            } catch (Exception ignored) {}
        }
        start(app);   // the call listener sees when the call is answered elsewhere / cancelled / missed
        main.postDelayed(() -> { synchronized (NativeWatcher.class) { if (pushMode(app) && ringing.isEmpty() && !CallService.running) stop(); } }, 60000);
    }

    static synchronized void onPushCancel(Context ctx, String id) {
        Context app = ctx.getApplicationContext();
        String[] r = id != null ? ringing.remove(id) : null;
        CallNotifications.cancelIncoming(app);
        if (r != null && !MainActivity.inForeground) CallNotifications.showMissed(app, id, r[0], "1".equals(r[1]));
    }

    static void onPushMessage(Context ctx, String chatId, String from, String name, String text, String title) {
        Context app = ctx.getApplicationContext();
        if (MainActivity.inForeground || !prefs(app).getBoolean("msgNotif", true) || chatId == null) return;
        String who = name != null && !name.isEmpty() ? name : "Xapp", body = text != null ? text : "New message";
        if (title != null && !title.isEmpty()) CallNotifications.showMessage(app, chatId, title, who + ": " + body);   // group
        else CallNotifications.showMessage(app, chatId, who, body);
    }
}
