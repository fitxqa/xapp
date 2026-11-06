package qa.fitx.xapp;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;

/** Every ~15 minutes (and right after Xapp is swiped away): make sure the background call service is running and connected. */
public class WatchdogReceiver extends BroadcastReceiver {
    static final String ACTION = "qa.fitx.xapp.WATCHDOG";

    @Override public void onReceive(Context ctx, Intent intent) {
        try {
            if (!NativeWatcher.signedIn(ctx)) return;
            if (!CallService.running) CallService.start(ctx, false);
            else NativeWatcher.refresh(ctx);
        } catch (Exception ignored) {}
        schedule(ctx, 15 * 60 * 1000L);
    }

    private static PendingIntent pi(Context ctx) {
        Intent i = new Intent(ctx, WatchdogReceiver.class).setAction(ACTION);
        return PendingIntent.getBroadcast(ctx, 30, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** One wake-up after delayMs that also works in Doze (the next one is set when it fires). */
    static void schedule(Context ctx, long delayMs) {
        try {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;
            long at = SystemClock.elapsedRealtime() + delayMs;
            boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, pi(ctx));
            else am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, at, pi(ctx));
        } catch (Exception ignored) {}
    }

    static void cancel(Context ctx) {
        try { AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE); if (am != null) am.cancel(pi(ctx)); } catch (Exception ignored) {}
    }
}
