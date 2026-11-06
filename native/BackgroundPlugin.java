package qa.fitx.xapp;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.media.ToneGenerator;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;

/** Bridge between the web app and the background ringing service. */
@CapacitorPlugin(name = "Background")
public class BackgroundPlugin extends Plugin {
    private static BackgroundPlugin instance;
    @Override public void load() { instance = this; }

    static void emit(String event, JSObject data) {
        BackgroundPlugin p = instance;
        if (p != null) p.notifyListeners(event, data, true);
    }

    /** Signs the background service in with the same account as the app, then starts it. */
    @PluginMethod
    public void signIn(PluginCall call) {
        Context ctx = getContext();
        JSObject o = call.getObject("options", new JSObject());
        NativeWatcher.prefs(ctx).edit()
            .putString("apiKey", o.getString("apiKey")).putString("projectId", o.getString("projectId"))
            .putString("appId", o.getString("appId")).putString("senderId", o.getString("messagingSenderId"))
            .putString("bucket", o.getString("storageBucket")).apply();
        FirebaseApp app;
        try { app = NativeWatcher.app(ctx); } catch (Exception e) { call.reject("Firebase setup failed: " + e.getMessage()); return; }
        if (app == null) { call.reject("Missing Firebase settings"); return; }
        String email = call.getString("email"), password = call.getString("password");
        FirebaseAuth.getInstance(app).signInWithEmailAndPassword(email, password)
            .addOnSuccessListener(r -> { CallService.start(ctx, false); JSObject res = new JSObject(); res.put("ok", true); call.resolve(res); })
            .addOnFailureListener(e -> call.reject("Background sign-in failed: " + e.getMessage()));
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        try { FirebaseApp a = NativeWatcher.app(getContext()); if (a != null) FirebaseAuth.getInstance(a).signOut(); } catch (Exception ignored) {}
        WatchdogReceiver.cancel(getContext()); NativeWatcher.stop(); CallService.stop(getContext()); call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        Context ctx = getContext(); JSObject r = new JSObject();
        r.put("signedIn", NativeWatcher.signedIn(ctx));
        r.put("running", CallService.running);
        r.put("notifications", NotificationManagerCompat.from(ctx).areNotificationsEnabled());
        PowerManager pm = (PowerManager) ctx.getSystemService(Context.POWER_SERVICE);
        r.put("batteryUnrestricted", pm == null || pm.isIgnoringBatteryOptimizations(ctx.getPackageName()));
        r.put("manufacturer", Build.MANUFACTURER);
        r.put("microphone", ctx.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED);
        r.put("camera", ctx.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED);
        boolean fs = true;
        if (Build.VERSION.SDK_INT >= 34) { NotificationManager nm = ctx.getSystemService(NotificationManager.class); fs = nm != null && nm.canUseFullScreenIntent(); }
        r.put("fullScreenAllowed", fs);
        r.put("overlay", Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx));
        boolean pop = true;
        if (Build.VERSION.SDK_INT >= 26) {
            CallNotifications.ensureChannels(ctx);
            NotificationManager nm = ctx.getSystemService(NotificationManager.class);
            android.app.NotificationChannel ch = nm != null ? nm.getNotificationChannel(CallNotifications.CH_CALLS) : null;
            pop = ch == null || ch.getImportance() >= NotificationManager.IMPORTANCE_HIGH;
        }
        r.put("callPopup", pop);
        call.resolve(r);
    }

    @PluginMethod
    public void start(PluginCall call) { if (NativeWatcher.signedIn(getContext())) CallService.start(getContext(), false); call.resolve(); }

    /** Ask Android to let Xapp run in the background (no battery restrictions). */
    @PluginMethod
    public void requestBattery(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i);
        } catch (Exception e) { openAppSettings(); }
        call.resolve();
    }

    /** Opens the phone maker's "auto-launch / app launch" page when there is one (Honor, Huawei, Xiaomi, Oppo, Vivo…). */
    @PluginMethod
    public void openAutostart(PluginCall call) {
        String[][] targets = {
            {"com.hihonor.systemmanager", "com.hihonor.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
            {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
            {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
            {"com.oplus.safecenter", "com.oplus.safecenter.permission.startup.StartupAppListActivity"},
            {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
            {"com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity"}
        };
        for (String[] t : targets) {
            try {
                Intent i = new Intent().setClassName(t[0], t[1]).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i); call.resolve(); return;
            } catch (Exception ignored) {}
        }
        openAppSettings(); call.resolve();
    }

    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) { openAppSettings(); }
        call.resolve();
    }

    /** The web app has drawn its first screen: let Android's splash go. */
    @PluginMethod
    public void appReady(PluginCall call) { MainActivity.appReady = true; call.resolve(); }

        /** Is the phone in dark mode? */
    @PluginMethod
    public void isDark(PluginCall call) {
        int m = getContext().getResources().getConfiguration().uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        JSObject r = new JSObject(); r.put("dark", m == android.content.res.Configuration.UI_MODE_NIGHT_YES); call.resolve(r);
    }

    /** Status bar and navigation bar match the app's theme. */
    @PluginMethod
    public void setBars(PluginCall call) {
        final boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", true));
        final android.app.Activity a = getActivity();
        if (a != null) a.runOnUiThread(() -> {
            try {
                android.view.Window w = a.getWindow();
                int bg = dark ? 0xFF0B0B0C : 0xFFFFFFFF;
                w.setStatusBarColor(bg); w.setNavigationBarColor(bg);
                androidx.core.view.WindowInsetsControllerCompat c = androidx.core.view.WindowCompat.getInsetsController(w, w.getDecorView());
                c.setAppearanceLightStatusBars(!dark); c.setAppearanceLightNavigationBars(!dark);
            } catch (Exception ignored) {}
        });
        call.resolve();
    }

    /** App info page (permissions: microphone, camera…). */
    @PluginMethod
    public void openAppInfo(PluginCall call) { openAppSettings(); call.resolve(); }

    /** Android 14+: "Full screen notifications" switch, so incoming calls fill the screen. */
    @PluginMethod
    public void openFullScreenSettings(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                Intent i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + getContext().getPackageName()))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i); call.resolve(); return;
            }
        } catch (Exception ignored) {}
        openAppSettings(); call.resolve();
    }

    private void openAppSettings() {
        try {
            Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getContext().getPackageName()))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception ignored) {}
    }

    /** Web app asks: was Xapp opened from a call notification? */
    @PluginMethod
    public void takeCallAction(PluginCall call) {
        JSObject r = new JSObject();
        r.put("id", MainActivity.pendingCallId); r.put("action", MainActivity.pendingAction);
        MainActivity.pendingCallId = null; MainActivity.pendingAction = null;
        call.resolve(r);
    }

    /** Ongoing call shown in the notification bar; keeps the microphone working with the screen off. */
    @PluginMethod
    public void callState(PluginCall call) {
        boolean active = Boolean.TRUE.equals(call.getBoolean("active", false));
        CallService.callPeer = call.getString("peer");
        CallService.callVideo = Boolean.TRUE.equals(call.getBoolean("video", false));
        Long started = call.getLong("startedAt");
        CallService.callStartedAt = started == null ? 0 : started;
        CallService.callHeld = Boolean.TRUE.equals(call.getBoolean("held", false));
        if (NativeWatcher.signedIn(getContext()) || active) CallService.start(getContext(), active);
        call.resolve();
    }

    @PluginMethod
    public void setMessageNotifications(PluginCall call) {
        NativeWatcher.prefs(getContext()).edit().putBoolean("msgNotif", Boolean.TRUE.equals(call.getBoolean("on", true))).apply();
        call.resolve();
    }

    // ---- ringing sounds while Xapp is open ----
    private static Ringtone rt; private static ToneGenerator tg; private static Vibrator vib; private static boolean bgShown = false;

    /** kind: "incoming" = the phone's own ringtone + vibration (respects silent/vibrate mode); "ringback" = the ringing tone the caller hears. */
    @PluginMethod
    public void ring(PluginCall call) {
        stopAll();
        Context ctx = getContext();
        JSObject r = new JSObject();
        boolean ok = false;
        try {
            AudioManager am = (AudioManager) ctx.getSystemService(Context.AUDIO_SERVICE);
            if ("ringback".equals(call.getString("kind"))) {
                tg = new ToneGenerator(AudioManager.STREAM_VOICE_CALL, 80);
                ok = tg.startTone(ToneGenerator.TONE_SUP_RINGTONE);   // 1 s ring, 4 s pause, repeating
            } else {
                if (!MainActivity.inForeground) {       // Xapp is in the background: show the ringing notification (same as the test)
                    String id = call.getString("id", "");
                    if (id != null && !id.isEmpty()) {
                        CallNotifications.showIncoming(ctx, id, call.getString("name", "Xapp"), Boolean.TRUE.equals(call.getBoolean("video", false)));
                        bgShown = true;
                    }
                    r.put("ok", true); call.resolve(r); return;
                }
                CallNotifications.cancelIncoming(ctx);   // the call screen is showing: one ringtone, not two
                int mode = am != null ? am.getRingerMode() : AudioManager.RINGER_MODE_NORMAL;
                if (mode == AudioManager.RINGER_MODE_NORMAL) {
                    Uri u = RingtoneManager.getActualDefaultRingtoneUri(ctx, RingtoneManager.TYPE_RINGTONE);
                    if (u == null) u = Settings.System.DEFAULT_RINGTONE_URI;
                    rt = RingtoneManager.getRingtone(ctx, u);
                    if (rt != null) {
                        rt.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
                        if (Build.VERSION.SDK_INT >= 28) rt.setLooping(true);
                        rt.play(); ok = true;
                    }
                }
                if (mode != AudioManager.RINGER_MODE_SILENT) {
                    vib = (Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
                    if (vib != null && vib.hasVibrator()) {
                        long[] pat = { 0, 900, 1100 };
                        if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createWaveform(pat, 0));
                        else vib.vibrate(pat, 0);
                    }
                    ok = true;   // silent / vibrate mode: vibrating is the right "ring"
                } else ok = true; // phone on silent: stay quiet on purpose
            }
        } catch (Exception e) { ok = false; }
        r.put("ok", ok);
        call.resolve(r);
    }

    @PluginMethod
    public void stopRing(PluginCall call) {
        stopAll();
        if (bgShown) { bgShown = false; CallNotifications.cancelIncoming(getContext()); }
        call.resolve();
    }

    private static void stopAll() {
        try { if (rt != null) rt.stop(); } catch (Exception ignored) {} rt = null;
        try { if (tg != null) { tg.stopTone(); tg.release(); } } catch (Exception ignored) {} tg = null;
        try { if (vib != null) vib.cancel(); } catch (Exception ignored) {} vib = null;
    }

    /** Calls tab opened: remove the "Missed call" notifications. */
    @PluginMethod
    public void clearMissed(PluginCall call) {
        try {
            NotificationManager nm = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && Build.VERSION.SDK_INT >= 26)
                for (android.service.notification.StatusBarNotification n : nm.getActiveNotifications())
                    if (CallNotifications.CH_MISSED.equals(n.getNotification().getChannelId())) nm.cancel(n.getTag(), n.getId());
        } catch (Exception ignored) {}
        call.resolve();
    }

    /** "Display over other apps": lets the call screen pop up by itself. */
    @PluginMethod
    public void openOverlaySettings(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getContext().getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
        } catch (Exception e) { openAppSettings(); }
        call.resolve();
    }

    /** The "Incoming calls" notification category: Pop on screen / Alerting must be on. */
    @PluginMethod
    public void openCallChannel(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= 26) {
                CallNotifications.ensureChannels(getContext());
                Intent i = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                    .putExtra(Settings.EXTRA_CHANNEL_ID, CallNotifications.CH_CALLS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i); call.resolve(); return;
            }
        } catch (Exception ignored) {}
        openAppSettings(); call.resolve();
    }

    /** Test: rings like a real incoming call 8 seconds later, so you can press Home and check it. */
    @PluginMethod
    public void testRing(PluginCall call) {
        final Context ctx = getContext().getApplicationContext();
        android.os.Handler h = new android.os.Handler(android.os.Looper.getMainLooper());
        h.postDelayed(() -> CallNotifications.showIncoming(ctx, "test", "Xapp test call", false), 8000);
        h.postDelayed(() -> CallNotifications.cancelIncoming(ctx), 26000);
        call.resolve();
    }
}
