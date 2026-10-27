package qa.fitx.xapp;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/** Keeps Xapp listening in the background so calls ring with the app closed. Shows a quiet permanent notification. */
public class CallService extends Service {
    static final String CH_SERVICE = "xapp_ready";
    static final int ID_SERVICE = 8000;
    static volatile boolean running = false;
    static volatile String callPeer = null;
    static volatile long callStartedAt = 0;
    static volatile boolean callVideo = false;

    static void start(Context ctx, boolean inCall) {
        Intent i = new Intent(ctx, CallService.class).putExtra("inCall", inCall);
        try { if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i); else ctx.startService(i); } catch (Exception ignored) {}
    }

    static void stop(Context ctx) { try { ctx.stopService(new Intent(ctx, CallService.class)); } catch (Exception ignored) {} }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        boolean inCall = intent != null && intent.getBooleanExtra("inCall", false);
        ensureChannel();
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 20, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CH_SERVICE)
            .setSmallIcon(android.R.drawable.sym_action_call).setColor(0xFFFF6A13)
            .setOngoing(true).setSilent(true).setContentIntent(pi);
        if (inCall) {
            Intent hang = new Intent(this, HangupReceiver.class).setAction("qa.fitx.xapp.HANGUP");
            PendingIntent hangPi = PendingIntent.getBroadcast(this, 21, hang, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            b.setContentTitle(callPeer != null ? callPeer : "Xapp")
             .setContentText(callStartedAt > 0 ? (callVideo ? "Video call · tap to return" : "Call · tap to return") : "Calling…")
             .setCategory(NotificationCompat.CATEGORY_CALL).setPriority(NotificationCompat.PRIORITY_HIGH)
             .addAction(0, "End call", hangPi);
            if (callStartedAt > 0) b.setUsesChronometer(true).setWhen(callStartedAt).setShowWhen(true);
        } else {
            b.setContentTitle("Xapp").setContentText(NativeWatcher.signedIn(this) ? "Ready to receive calls" : "Open Xapp to finish setup")
             .setPriority(NotificationCompat.PRIORITY_LOW);
        }
        Notification n = b.build();
        int type = 0;
        if (Build.VERSION.SDK_INT >= 34) { type = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE; if (inCall) type |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE; }
        try { ServiceCompat.startForeground(this, ID_SERVICE, n, type); }
        catch (Exception e) {
            try { ServiceCompat.startForeground(this, ID_SERVICE, n, Build.VERSION.SDK_INT >= 34 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0); }
            catch (Exception ignored) { stopSelf(); return START_NOT_STICKY; }
        }
        running = true;
        NativeWatcher.start(this);
        return START_STICKY;
    }

    @Override public void onDestroy() { running = false; NativeWatcher.stop(); super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null && nm.getNotificationChannel(CH_SERVICE) == null) {
            NotificationChannel ch = new NotificationChannel(CH_SERVICE, "Ready for calls", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Keeps Xapp running so calls can ring"); ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
    }
}
