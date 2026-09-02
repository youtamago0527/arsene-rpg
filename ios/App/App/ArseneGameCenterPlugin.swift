import Capacitor
import DeviceCheck
import GameKit

@objc(ArseneGameCenterPlugin)
public class ArseneGameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ArseneGameCenterPlugin"
    public let jsName = "ArseneGameCenter"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "submitScore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "appAttestStatus", returnType: CAPPluginReturnPromise)
    ]

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            player.authenticateHandler = { viewController, error in
                if let viewController {
                    self.bridge?.viewController?.present(viewController, animated: true)
                    return
                }
                if let error { call.reject("Game Center login failed", nil, error); return }
                guard player.isAuthenticated else { call.reject("Game Center is not signed in", "GAME_CENTER_SIGN_IN_REQUIRED"); return }
                player.fetchItems(forIdentityVerificationSignature: { publicKeyURL, signature, salt, timestamp, error in
                    if let error { call.reject("Identity signature failed", nil, error); return }
                    guard let publicKeyURL, let signature, let salt else { call.reject("Identity signature was incomplete"); return }
                    call.resolve([
                        "playerId": player.teamPlayerID,
                        "displayName": player.displayName,
                        "publicKeyUrl": publicKeyURL.absoluteString,
                        "signature": signature.base64EncodedString(),
                        "salt": salt.base64EncodedString(),
                        "timestamp": NSNumber(value: timestamp)
                    ])
                })
            }
        }
    }

    @objc func submitScore(_ call: CAPPluginCall) {
        guard GKLocalPlayer.local.isAuthenticated else { call.reject("Game Center is not signed in", "GAME_CENTER_SIGN_IN_REQUIRED"); return }
        guard let leaderboardId = call.getString("leaderboardId"), let score = call.getInt("score"), score > 0 else { call.reject("Invalid leaderboard score"); return }
        GKLeaderboard.submitScore(score, context: 0, player: GKLocalPlayer.local, leaderboardIDs: [leaderboardId]) { error in
            if let error { call.reject("Game Center score submission failed", nil, error); return }
            call.resolve()
        }
    }

    @objc func appAttestStatus(_ call: CAPPluginCall) {
        let service = DCAppAttestService.shared
        guard service.isSupported else { call.resolve(["supported": false]); return }
        if let keyId = UserDefaults.standard.string(forKey: "arsene.appAttest.keyId") {
            call.resolve(["supported": true, "keyId": keyId]); return
        }
        service.generateKey { keyId, error in
            if let error { call.reject("App Attest key generation failed", nil, error); return }
            guard let keyId else { call.reject("App Attest returned no key"); return }
            UserDefaults.standard.set(keyId, forKey: "arsene.appAttest.keyId")
            call.resolve(["supported": true, "keyId": keyId, "needsAttestation": true])
        }
    }
}
