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
        FirebaseApp fa; FirebaseUser u;
        try { fa = app(app); if (fa == null) return; u = FirebaseAuth.getInstance(fa).getCurrentUser(); } catch (Exception e) { return; }
        if (u == null) { stop(); return; }
        if (u.getUid().equals(watchingUid) && callReg != null) return;
        stop();
        watchingUid = u.getUid();
        final String uid = watchingUid;
        final FirebaseFirestore fs = FirebaseFirestore.getInstance(fa);

        callReg = fs.collection("calls").whereEqualTo("callee", uid).whereEqualTo("status", "ringing")
            .addSnapshotListener((snap, err) -> {
                if (snap == null) return;
                for (DocumentChange dc : snap.getDocumentChanges()) {
                    DocumentSnapshot d = dc.getDocument();
                    final String id = d.getId();
                    final boolean video = Boolean.TRUE.equals(d.getBoolean("video"));
                    if (dc.getType() == DocumentChange.Type.ADDED) {
                        Long created = d.getLong("createdAt");
                        if (created != null && System.currentTimeMillis() - created > 45000) continue;   // old call
                        final String caller = str(d.get("caller"), "");
                        withName(fs, caller, name -> {
                            ringing.put(id, new String[] { name, video ? "1" : "0" });
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

        firstChats = true; chatLast.clear();
        chatReg = fs.collection("chats").whereArrayContains("members", uid)
            .addSnapshotListener((snap, err) -> {
                if (snap == null) return;
                for (DocumentSnapshot c : snap.getDocuments()) {
                    Long at = c.getLong("lastAt"); Long prev = chatLast.get(c.getId());
                    chatLast.put(c.getId(), at == null ? 0L : at);
                    if (firstChats || at == null || (prev != null && at <= prev)) continue;
                    String from = str(c.get("lastFrom"), "");
                    if (from.equals(uid) || MainActivity.inForeground) continue;
                    if (!prefs(app).getBoolean("msgNotif", true)) continue;
                    final String text = str(c.get("last"), "New message"), chatId = c.getId();
                    withName(fs, from, name -> CallNotifications.showMessage(app, chatId, name, text));
                }
                firstChats = false;
            });
    }

    interface NameCb { void got(String name); }
    private static void withName(FirebaseFirestore fs, String uid, NameCb cb) {
        String n = names.get(uid);
        if (n != null) { cb.got(n); return; }
        fs.collection("users").document(uid).get()
            .addOnSuccessListener(s -> { String v = s != null ? str(s.get("name"), str(s.get("username"), "Xapp")) : "Xapp"; names.put(uid, v); cb.got(v); })
            .addOnFailureListener(e -> cb.got("Xapp"));
    }

    static synchronized void stop() {
        if (callReg != null) callReg.remove();
        if (chatReg != null) chatReg.remove();
        callReg = null; chatReg = null; watchingUid = null; ringing.clear();
    }

    static String str(Object o, String def) { return o == null ? def : o.toString(); }
}
