package qa.fitx.xapp;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/**
 * Google push (Firebase Cloud Messaging): wakes the phone for calls and messages, like WhatsApp,
 * so Xapp doesn't need its own always-on connection.
 */
public class XappMessagingService extends FirebaseMessagingService {

    @Override public void onNewToken(String token) {
        NativeWatcher.prefs(this).edit().putString("fcmToken", token).apply();
        NativeWatcher.saveToken(getApplicationContext(), token);
    }

    @Override public void onMessageReceived(RemoteMessage msg) {
        Map<String, String> d = msg.getData();
        if (d == null) return;
        String type = d.get("type");
        try {
            if ("call".equals(type)) NativeWatcher.onPushCall(getApplicationContext(), d.get("id"), d.get("from"), d.get("name"), "1".equals(d.get("video")));
            else if ("cancel".equals(type)) NativeWatcher.onPushCancel(getApplicationContext(), d.get("id"));
            else if ("msg".equals(type)) NativeWatcher.onPushMessage(getApplicationContext(), d.get("chat"), d.get("from"), d.get("name"), d.get("text"));
        } catch (Exception ignored) {}
    }
}
