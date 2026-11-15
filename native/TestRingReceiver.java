package qa.fitx.xapp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

/** "Test ringing": an Android alarm wakes Xapp a few seconds later (even if Android has frozen it) and shows the incoming-call screen. */
public class TestRingReceiver extends BroadcastReceiver {
    static void schedule(Context ctx, long delayMs) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long at = SystemClock.elapsedRealtime() + delayMs;
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, pi(ctx, "ring"));
        else am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, pi(ctx, "ring"));
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at + 25000, pi(ctx, "stop"));
        else am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at + 25000, pi(ctx, "stop"));
    }
    private static PendingIntent pi(Context ctx, String what) {
        Intent i = new Intent(ctx, TestRingReceiver.class).setAction("qa.fitx.xapp.TEST_" + what);
        return PendingIntent.getBroadcast(ctx, "ring".equals(what) ? 7101 : 7102, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    @Override public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction() == null ? "" : intent.getAction();
        if (a.endsWith("TEST_ring")) { if (!MainActivity.inForeground) CallNotifications.showIncoming(ctx, "test", "Xapp test call", false); }
        else CallNotifications.cancelIncoming(ctx);
    }
}
