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

    @Override
    /** Set by the web app when its first screen is ready; until then Android's own splash stays up (one splash, no second icon). */
    static volatile boolean appReady = false;

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
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[] { Manifest.permission.POST_NOTIFICATIONS }, 501);
        try { if (NativeWatcher.signedIn(this)) CallService.start(this, false); } catch (Exception ignored) {}
    }

    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); handleCallIntent(intent); }
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
