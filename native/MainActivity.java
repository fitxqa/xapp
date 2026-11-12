package qa.fitx.xapp;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** True while Xapp is on screen: then the web app rings itself instead of the notification. */
    public static volatile boolean inForeground = false;
    /** Call action from a notification tap, waiting for the web app to pick it up. */
    static volatile String pendingCallId = null, pendingAction = null;

    /** Set by the web app when its first screen is ready; until then Android's own splash stays up (one splash, no second icon). */
    static volatile boolean appReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        final long t0 = System.currentTimeMillis();
        try {
            androidx.core.splashscreen.SplashScreen sp = androidx.core.splashscreen.SplashScreen.installSplashScreen(this);
            sp.setKeepOnScreenCondition(() -> !appReady && System.currentTimeMillis() - t0 < 4000);
        } catch (Exception ignored) {}
        registerPlugin(AudioRoutePlugin.class);
        registerPlugin(BackgroundPlugin.class);
        registerPlugin(LocationPlugin.class);
        super.onCreate(savedInstanceState);
        CallNotifications.ensureChannels(this);
        handleCallIntent(getIntent());
        handleShareIntent(getIntent());
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 501);
        try { if (NativeWatcher.needService(this)) { CallService.start(this, false); WatchdogReceiver.schedule(this, 15 * 60 * 1000L); } } catch (Exception ignored) {}
    }

    // ---- picture-in-picture during video calls (like WhatsApp): pressing Home keeps the video and camera running in a small window ----
    static volatile boolean videoCall = false;
    private android.app.PictureInPictureParams pipParams() {
        android.app.PictureInPictureParams.Builder b = new android.app.PictureInPictureParams.Builder().setAspectRatio(new android.util.Rational(9, 16));
        if (Build.VERSION.SDK_INT >= 31) b.setAutoEnterEnabled(videoCall).setSeamlessResizeEnabled(true);
        return b.build();
    }
    /** called from the web app (via BackgroundPlugin.callState) when a video call starts / ends / is held */
    void setVideoCall(boolean on) {
        videoCall = on;
        if (Build.VERSION.SDK_INT >= 26) { try { setPictureInPictureParams(pipParams()); } catch (Exception ignored) {} }
    }
    @Override public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (videoCall && Build.VERSION.SDK_INT >= 26 && Build.VERSION.SDK_INT < 31) { try { enterPictureInPictureMode(pipParams()); } catch (Exception ignored) {} }
    }
    @Override public void onPictureInPictureModeChanged(boolean inPip, android.content.res.Configuration cfg) {
        super.onPictureInPictureModeChanged(inPip, cfg);
        com.getcapacitor.JSObject o = new com.getcapacitor.JSObject(); o.put("pip", inPip);
        BackgroundPlugin.emit("pip", o);
    }

    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); handleCallIntent(intent); handleShareIntent(intent); }

    // ---- "Share to Xapp" from other apps (screenshots, photos, videos, text) ----
    static volatile com.getcapacitor.JSObject pendingShare = null;
    private void handleShareIntent(Intent intent) {
        if (intent == null) return;
        String act = intent.getAction();
        if (!Intent.ACTION_SEND.equals(act) && !Intent.ACTION_SEND_MULTIPLE.equals(act)) return;
        final Intent in = intent;
        new Thread(() -> {
            try {
                java.util.ArrayList<Uri> uris = new java.util.ArrayList<>();
                if (Intent.ACTION_SEND_MULTIPLE.equals(act)) { java.util.ArrayList<Uri> l = in.getParcelableArrayListExtra(Intent.EXTRA_STREAM); if (l != null) uris.addAll(l); }
                else { Uri u = in.getParcelableExtra(Intent.EXTRA_STREAM); if (u != null) uris.add(u); }
                com.getcapacitor.JSArray files = new com.getcapacitor.JSArray();
                java.io.File dir = new java.io.File(getCacheDir(), "shared"); dir.mkdirs();
                int n = 0;
                for (Uri u : uris) {
                    if (n >= 10) break;
                    String type = getContentResolver().getType(u); if (type == null) type = in.getType() != null ? in.getType() : "application/octet-stream";
                    java.io.File f = new java.io.File(dir, "s" + System.currentTimeMillis() + "_" + (n++));
                    try (java.io.InputStream is = getContentResolver().openInputStream(u); java.io.OutputStream os = new java.io.FileOutputStream(f)) {
                        if (is == null) continue; byte[] buf = new byte[65536]; int r; while ((r = is.read(buf)) > 0) os.write(buf, 0, r);
                    }
                    com.getcapacitor.JSObject o = new com.getcapacitor.JSObject();
                    o.put("url", getBridge().getLocalUrl() + "/_capacitor_file_" + f.getAbsolutePath()); o.put("type", type); o.put("size", f.length());
                    files.put(o);
                }
                com.getcapacitor.JSObject sh = new com.getcapacitor.JSObject();
                sh.put("files", files);
                String text = in.getStringExtra(Intent.EXTRA_TEXT); if (text != null) sh.put("text", text);
                pendingShare = sh;
                runOnUiThread(() -> BackgroundPlugin.emit("share", sh));
            } catch (Exception ignored) {}
        }).start();
        setIntent(new Intent(this, MainActivity.class));   // don't handle the same share twice
    }
    @Override public void onResume() { super.onResume(); inForeground = true; CallNotifications.cancelIncoming(this); }
    @Override public void onPause() { super.onPause(); inForeground = false; }

    /** Phone switched between light and dark: tell the web app. */
    @Override
    public void onConfigurationChanged(android.content.res.Configuration cfg) {
        super.onConfigurationChanged(cfg);
        com.getcapacitor.JSObject o = new com.getcapacitor.JSObject();
        o.put("dark", (cfg.uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK) == android.content.res.Configuration.UI_MODE_NIGHT_YES);
        BackgroundPlugin.emit("theme", o);
    }

    /** Opened from the ringing notification: show over the lock screen and hand the action to the web app. */
    private void handleCallIntent(Intent intent) {
        Uri data = intent != null ? intent.getData() : null;
        boolean isCall = data != null && "xapp".equals(data.getScheme());
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(isCall); setTurnScreenOn(isCall); }
        else if (isCall) getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        if (!isCall) return;
        CallNotifications.cancelIncoming(this);
        pendingCallId = data.getQueryParameter("id");
        pendingAction = data.getQueryParameter("action");
        com.getcapacitor.JSObject o = new com.getcapacitor.JSObject();
        o.put("id", pendingCallId); o.put("action", pendingAction);
        BackgroundPlugin.emit("callAction", o);
    }
}
