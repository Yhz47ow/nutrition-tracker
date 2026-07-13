import Foundation
import Capacitor
import MusicKit

@available(iOS 15.0, *)
@objc(AppleMusicPlugin)
public class AppleMusicPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppleMusicPlugin"
    public let jsName = "AppleMusic"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playSong", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "next", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "previous", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise)
    ]

    private let player = ApplicationMusicPlayer.shared

    @objc public func requestAuthorization(_ call: CAPPluginCall) {
        Task { @MainActor in
            let status = await MusicAuthorization.request()
            call.resolve(["status": authorizationName(status), "authorized": status == .authorized])
        }
    }

    @objc public func playSong(_ call: CAPPluginCall) {
        guard let songId = call.getString("songId"), !songId.isEmpty else {
            call.reject("songId is required")
            return
        }
        Task { @MainActor in
            do {
                var request = MusicCatalogResourceRequest<Song>(matching: \.id, equalTo: MusicItemID(songId))
                request.limit = 1
                let response = try await request.response()
                guard let song = response.items.first else {
                    call.reject("Apple Music song not found")
                    return
                }
                player.queue = ApplicationMusicPlayer.Queue(for: [song])
                try await player.play()
                call.resolve(statePayload())
            } catch {
                call.reject("Unable to play Apple Music song", nil, error)
            }
        }
    }

    @objc public func play(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await player.play()
                call.resolve(statePayload())
            } catch {
                call.reject("Unable to play Apple Music", nil, error)
            }
        }
    }

    @objc public func pause(_ call: CAPPluginCall) {
        Task { @MainActor in
            player.pause()
            call.resolve(statePayload())
        }
    }

    @objc public func next(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await player.skipToNextEntry()
                call.resolve(statePayload())
            } catch {
                call.reject("Unable to skip to next Apple Music entry", nil, error)
            }
        }
    }

    @objc public func previous(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await player.skipToPreviousEntry()
                call.resolve(statePayload())
            } catch {
                call.reject("Unable to skip to previous Apple Music entry", nil, error)
            }
        }
    }

    @objc public func getState(_ call: CAPPluginCall) {
        Task { @MainActor in
            call.resolve(statePayload())
        }
    }

    @objc public func setVolume(_ call: CAPPluginCall) {
        call.resolve([
            "supported": false,
            "reason": "iOS system volume is user-controlled"
        ])
    }

    @MainActor
    private func statePayload() -> [String: Any] {
        let entry = player.queue.currentEntry
        let status = String(describing: player.state.playbackStatus).lowercased()
        var payload: [String: Any] = [
            "status": status,
            "playing": status == "playing",
            "title": entry?.title ?? "",
            "artist": entry?.subtitle ?? "",
            "volumeControl": false
        ]
        if let artworkUrl = entry?.artwork?.url(width: 240, height: 240)?.absoluteString {
            payload["coverUrl"] = artworkUrl
        }
        return payload
    }

    private func authorizationName(_ status: MusicAuthorization.Status) -> String {
        switch status {
        case .authorized: return "authorized"
        case .denied: return "denied"
        case .restricted: return "restricted"
        case .notDetermined: return "notDetermined"
        @unknown default: return "unknown"
        }
    }
}
