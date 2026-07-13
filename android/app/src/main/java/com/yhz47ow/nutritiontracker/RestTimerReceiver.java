package com.yhz47ow.nutritiontracker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;

import androidx.core.app.NotificationCompat;

public class RestTimerReceiver extends BroadcastReceiver {
    static final String ACTION_FINISH = "com.yhz47ow.nutritiontracker.rest.FINISH";
    static final String EXTRA_ID = "timer_id";
    static final String EXTRA_TITLE = "timer_title";
    static final String EXTRA_BODY = "timer_body";
    static final String CHANNEL_FINISHED = "rest_timer_finished";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION_FINISH.equals(intent.getAction())) return;
        String id = intent.getStringExtra(EXTRA_ID);
        if (id == null) return;

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(CHANNEL_FINISHED, "休息结束提醒", NotificationManager.IMPORTANCE_HIGH);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[]{0, 250, 100, 250});
        channel.setSound(
            RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build()
        );
        manager.createNotificationChannel(channel);

        Intent openIntent = new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context, RestTimerPlugin.requestCode(id), openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        manager.notify(notificationId(id), new NotificationCompat.Builder(context, CHANNEL_FINISHED)
            .setSmallIcon(R.drawable.ic_rest_timer)
            .setContentTitle(intent.getStringExtra(EXTRA_TITLE))
            .setContentText(intent.getStringExtra(EXTRA_BODY))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setVibrate(new long[]{0, 250, 100, 250})
            .build());

        context.getSharedPreferences(RestTimerPlugin.PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        context.stopService(new Intent(context, RestTimerService.class));
    }

    static int notificationId(String id) {
        return 0x4f200000 | (id.hashCode() & 0x000fffff);
    }
}
