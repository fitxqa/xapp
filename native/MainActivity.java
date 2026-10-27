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
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AudioRoutePlugin.class);
        registerPlugin(BackgroundPlugin.class);
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
