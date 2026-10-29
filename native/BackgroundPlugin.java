package qa.fitx.xapp;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Context;
import android.content.pm.PackageManager;
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
        NativeWatcher.stop(); CallService.stop(getContext()); call.resolve();
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
}
