package com.yhz47ow.nutritiontracker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class RestTimerService extends Service {
    static final String ACTION_START = "com.yhz47ow.nutritiontracker.rest.START";
    static final String EXTRA_ID = "timer_id";
    static final String EXTRA_END_AT = "timer_end_at";
    static final String CHANNEL_ACTIVE = "rest_timer_active";
    static final int FOREGROUND_ID = 0x4f100001;

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationChannel channel = new NotificationChannel(CHANNEL_ACTIVE, "训练休息计时", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("训练期间显示正在进行的组间休息");
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || !ACTION_START.equals(intent.getAction())) return START_NOT_STICKY;
        String timerId = intent.getStringExtra(EXTRA_ID);
        long endAt = intent.getLongExtra(EXTRA_END_AT, System.currentTimeMillis());

        Intent openIntent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ACTIVE)
            .setSmallIcon(R.drawable.ic_rest_timer)
            .setContentTitle("组间休息")
            .setContentText("计时结束后会提醒你")
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setWhen(endAt)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .build();
        startForeground(FOREGROUND_ID, notification);
        return START_NOT_STICKY;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
