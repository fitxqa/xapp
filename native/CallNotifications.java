package qa.fitx.xapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/** Full-screen ringing call notification, missed calls and message notifications. */
public final class CallNotifications {
    static final String CH_CALLS = "xapp_incoming_calls", CH_MISSED = "xapp_missed_calls", CH_MSG = "xapp_messages";
    static final int ID_INCOMING = 8001;
    private CallNotifications() {}

    static void ensureChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel(CH_CALLS) == null) {
            NotificationChannel ch = new NotificationChannel(CH_CALLS, "Incoming calls", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Rings when someone calls you on Xapp");
            ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            ch.enableVibration(true); ch.setVibrationPattern(new long[] { 0, 800, 600, 800, 600 });
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC); ch.setBypassDnd(true);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_MSG) == null) {
            NotificationChannel ch = new NotificationChannel(CH_MSG, "Messages", NotificationManager.IMPORTANCE_HIGH);
            ch.enableVibration(true); nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_MISSED) == null)
            nm.createNotificationChannel(new NotificationChannel(CH_MISSED, "Missed calls", NotificationManager.IMPORTANCE_DEFAULT));
    }

    private static PendingIntent open(Context ctx, String callId, String action, int req) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("xapp://call?id=" + Uri.encode(callId) + "&action=" + action), ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void showIncoming(Context ctx, String callId, String fromName, boolean video) {
        ensureChannels(ctx);
        PendingIntent full = open(ctx, callId, "open", 1);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CH_CALLS)
            .setSmallIcon(android.R.drawable.sym_call_incoming)
            .setContentTitle(fromName).setContentText(video ? "Incoming Xapp video call" : "Incoming Xapp voice call")
            .setPriority(NotificationCompat.PRIORITY_MAX).setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setColor(0xFFFF6A13)
            .setOngoing(true).setAutoCancel(true).setTimeoutAfter(45000)
            .setContentIntent(full).setFullScreenIntent(full, true)
            .addAction(0, "Decline", open(ctx, callId, "decline", 2))
            .addAction(0, "Answer", open(ctx, callId, "answer", 3));
        if (Build.VERSION.SDK_INT < 26) { b.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)); b.setVibrate(new long[] { 0, 800, 600, 800, 600 }); }
        Notification n = b.build();
        n.flags |= Notification.FLAG_INSISTENT;   // keep ringing until answered, declined or cancelled
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(ID_INCOMING, n);
    }

    static void cancelIncoming(Context ctx) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(ID_INCOMING);
    }

    private static PendingIntent openApp(Context ctx, int req) {
        Intent i = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(ctx, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void showMissed(Context ctx, String callId, String fromName, boolean video) {
        ensureChannels(ctx);
        Notification n = new NotificationCompat.Builder(ctx, CH_MISSED)
            .setSmallIcon(android.R.drawable.sym_call_missed).setContentTitle("Missed call")
            .setContentText(fromName + (video ? " (video)" : "")).setColor(0xFFFF6A13)
            .setCategory(NotificationCompat.CATEGORY_MISSED_CALL).setAutoCancel(true).setContentIntent(openApp(ctx, 4)).build();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(callId.hashCode(), n);
    }

    static void showMessage(Context ctx, String chatId, String fromName, String text) {
        ensureChannels(ctx);
        Notification n = new NotificationCompat.Builder(ctx, CH_MSG)
            .setSmallIcon(android.R.drawable.sym_action_chat).setContentTitle(fromName).setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setColor(0xFFFF6A13)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true).setContentIntent(openApp(ctx, 6)).build();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(("m" + chatId).hashCode(), n);
    }
}
