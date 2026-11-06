package qa.fitx.xapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Phone restarted or app updated: start listening for calls again if signed in. */
public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context ctx, Intent intent) {
        try { if (NativeWatcher.signedIn(ctx)) { CallService.start(ctx, false); WatchdogReceiver.schedule(ctx, 60000); } } catch (Exception ignored) {}
    }
}
