package com.yhz47ow.nutritiontracker;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "RestTimer",
    permissions = {
        @Permission(alias = RestTimerPlugin.NOTIFICATION_PERMISSION, strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class RestTimerPlugin extends Plugin {
    static final String NOTIFICATION_PERMISSION = "notifications";
    static final String PREFS = "native_rest_timer";
    static final String ACTIVE_ID = "active_id";
    static final String ACTIVE_END_AT = "active_end_at";

    @PluginMethod
    public void requestAuthorization(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATION_PERMISSION) == PermissionState.GRANTED) {
            resolveAuthorization(call);
            return;
        }
        requestPermissionForAlias(NOTIFICATION_PERMISSION, call, "notificationPermissionCallback");
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolveAuthorization(call);
    }

    private void resolveAuthorization(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notifications", Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATION_PERMISSION) == PermissionState.GRANTED);
        result.put("exactAlarm", canScheduleExactAlarms());
        call.resolve(result);
    }

    @PluginMethod
    public void requestExactAlarmAccess(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !canScheduleExactAlarms()) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            JSObject result = new JSObject();
            result.put("openedSettings", true);
            call.resolve(result);
            return;
        }
        JSObject result = new JSObject();
        result.put("openedSettings", false);
        result.put("exactAlarm", true);
        call.resolve(result);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id");
        Long endAt = call.getLong("endAt");
        if (id == null || id.trim().isEmpty() || endAt == null) {
            call.reject("id and endAt are required");
            return;
        }

        String title = call.getString("title", "组间休息结束");
        String body = call.getString("body", "可以开始下一组了");
        cancelStoredTimer();

        Intent receiverIntent = new Intent(getContext(), RestTimerReceiver.class)
            .setAction(RestTimerReceiver.ACTION_FINISH)
            .putExtra(RestTimerReceiver.EXTRA_ID, id)
            .putExtra(RestTimerReceiver.EXTRA_TITLE, title)
            .putExtra(RestTimerReceiver.EXTRA_BODY, body);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(), requestCode(id), receiverIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        boolean exact = canScheduleExactAlarms();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (exact) alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pendingIntent);
            else alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, endAt, pendingIntent);
        }

        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(ACTIVE_ID, id)
            .putLong(ACTIVE_END_AT, endAt)
            .apply();

        Intent serviceIntent = new Intent(getContext(), RestTimerService.class)
            .setAction(RestTimerService.ACTION_START)
            .putExtra(RestTimerService.EXTRA_ID, id)
            .putExtra(RestTimerService.EXTRA_END_AT, endAt);
        ContextCompat.startForegroundService(getContext(), serviceIntent);

        JSObject result = new JSObject();
        result.put("scheduled", true);
        result.put("exact", exact);
        result.put("endAt", endAt);
        call.resolve(result);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.trim().isEmpty()) {
            call.reject("id is required");
            return;
        }
        cancelTimer(id);
        JSObject result = new JSObject();
        result.put("cancelled", true);
        call.resolve(result);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        SharedPreferences preferences = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String id = preferences.getString(ACTIVE_ID, null);
        long endAt = preferences.getLong(ACTIVE_END_AT, 0);
        JSObject result = new JSObject();
        result.put("active", id != null && endAt > System.currentTimeMillis());
        result.put("id", id);
        result.put("endAt", endAt);
        result.put("expired", id != null && endAt > 0 && endAt <= System.currentTimeMillis());
        result.put("exactAlarm", canScheduleExactAlarms());
        call.resolve(result);
    }

    private boolean canScheduleExactAlarms() {
        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms();
    }

    private void cancelStoredTimer() {
        String activeId = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(ACTIVE_ID, null);
        if (activeId != null) cancelTimer(activeId);
    }

    private void cancelTimer(String id) {
        Intent intent = new Intent(getContext(), RestTimerReceiver.class).setAction(RestTimerReceiver.ACTION_FINISH);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(), requestCode(id), intent, PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (pendingIntent != null) {
            AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();
        }
        getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply();
        getContext().stopService(new Intent(getContext(), RestTimerService.class));
        ((NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE)).cancel(RestTimerReceiver.notificationId(id));
    }

    static int requestCode(String id) {
        return 0x4f000000 | (id.hashCode() & 0x00ffffff);
    }
}
