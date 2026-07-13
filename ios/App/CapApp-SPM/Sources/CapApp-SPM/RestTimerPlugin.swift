import Foundation
import Capacitor
import UserNotifications

@objc(RestTimerPlugin)
public class RestTimerPlugin: CAPPlugin, CAPBridgedPlugin, UNUserNotificationCenterDelegate {
    public let identifier = "RestTimerPlugin"
    public let jsName = "RestTimer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]

    private let center = UNUserNotificationCenter.current()
    private let activeIdKey = "native_rest_timer.active_id"
    private let activeEndAtKey = "native_rest_timer.active_end_at"

    public override func load() {
        center.delegate = self
        let category = UNNotificationCategory(identifier: "WORKOUT_REST", actions: [], intentIdentifiers: [], options: [])
        center.setNotificationCategories([category])
    }

    @objc public func requestAuthorization(_ call: CAPPluginCall) {
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error {
                call.reject("Notification authorization failed", nil, error)
                return
            }
            call.resolve(["notifications": granted, "exactAlarm": true])
        }
    }

    @objc public func schedule(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty,
              let endAt = call.getDouble("endAt") else {
            call.reject("id and endAt are required")
            return
        }
        let title = call.getString("title") ?? "组间休息结束"
        let body = call.getString("body") ?? "可以开始下一组了"
        let interval = max(1, endAt / 1000 - Date().timeIntervalSince1970)

        center.removePendingNotificationRequests(withIdentifiers: [id])
        center.removeDeliveredNotifications(withIdentifiers: [id])

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = "WORKOUT_REST"
        content.userInfo = ["timerId": id, "endAt": endAt]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: interval, repeats: false)
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        center.add(request) { [weak self] error in
            if let error {
                call.reject("Unable to schedule rest timer", nil, error)
                return
            }
            UserDefaults.standard.set(id, forKey: self?.activeIdKey ?? "native_rest_timer.active_id")
            UserDefaults.standard.set(endAt, forKey: self?.activeEndAtKey ?? "native_rest_timer.active_end_at")
            call.resolve(["scheduled": true, "exact": true, "endAt": endAt])
        }
    }

    @objc public func cancel(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty else {
            call.reject("id is required")
            return
        }
        center.removePendingNotificationRequests(withIdentifiers: [id])
        center.removeDeliveredNotifications(withIdentifiers: [id])
        clearStoredTimer()
        call.resolve(["cancelled": true])
    }

    @objc public func getStatus(_ call: CAPPluginCall) {
        let id = UserDefaults.standard.string(forKey: activeIdKey)
        let endAt = UserDefaults.standard.double(forKey: activeEndAtKey)
        let now = Date().timeIntervalSince1970 * 1000
        call.resolve([
            "active": id != nil && endAt > now,
            "id": id as Any,
            "endAt": endAt,
            "expired": id != nil && endAt > 0 && endAt <= now,
            "exactAlarm": true
        ])
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        clearStoredTimer()
        completionHandler([.banner, .list, .sound])
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        clearStoredTimer()
        let data = response.notification.request.content.userInfo
        notifyListeners("restTimerFinished", data: data)
        completionHandler()
    }

    private func clearStoredTimer() {
        UserDefaults.standard.removeObject(forKey: activeIdKey)
        UserDefaults.standard.removeObject(forKey: activeEndAtKey)
    }
}
