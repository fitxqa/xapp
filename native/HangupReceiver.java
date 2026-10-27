package qa.fitx.xapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** "End call" button on the ongoing-call notification. */
public class HangupReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context ctx, Intent intent) { BackgroundPlugin.emit("hangup", new com.getcapacitor.JSObject()); }
}
