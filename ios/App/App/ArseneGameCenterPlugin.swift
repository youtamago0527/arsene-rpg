import Capacitor
import GameKit

@objc(ArseneGameCenterPlugin)
public class ArseneGameCenterPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ArseneGameCenterPlugin"
    public let jsName = "ArseneGameCenter"
    public let pluginMethods = [
        CAPPluginMethod(name: "currentPlayer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]
    private var pendingLogin: CAPPluginCall?

    @objc func currentPlayer(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            call.resolve(player.isAuthenticated ? ["playerId": player.teamPlayerID] : [:])
        }
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let player = GKLocalPlayer.local
            if player.isAuthenticated {
                self.signedIdentity(player, call)
                return
            }
            let interactive = call.getBool("interactive") == true
            guard self.pendingLogin == nil else {
                call.reject("Game Center sign-in is already open", "SIGN_IN_PENDING")
                return
            }
            self.pendingLogin = call
            player.authenticateHandler = { [weak self] controller, error in
                DispatchQueue.main.async {
                    guard let self, let pending = self.pendingLogin else { return }
                    if interactive, let controller, let host = self.bridge?.viewController {
                        var presenter = host
                        while let next = presenter.presentedViewController { presenter = next }
                        if presenter !== controller { presenter.present(controller, animated: true) }
                        return
                    }
                    self.pendingLogin = nil
                    guard error == nil, player.isAuthenticated else {
                        pending.reject("Game Center sign-in required", "SIGN_IN_REQUIRED", error)
                        return
                    }
                    self.signedIdentity(player, pending)
                }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 20) { [weak self] in
                guard !interactive, self?.pendingLogin === call else { return }
                self?.pendingLogin = nil
                call.reject("Game Center sign-in required", "SIGN_IN_REQUIRED")
            }
        }
    }

    private func signedIdentity(_ player: GKLocalPlayer, _ call: CAPPluginCall) {
        let playerId = player.teamPlayerID
        player.fetchItems(forIdentityVerificationSignature: { keyUrl, signature, salt, timestamp, error in
            if let error {
                call.reject("Game Center identity unavailable", "IDENTITY_UNAVAILABLE", error)
                return
            }
            guard let keyUrl, let signature, let salt else {
                call.reject("Game Center identity unavailable", "IDENTITY_UNAVAILABLE")
                return
            }
            call.resolve([
                "playerId": playerId,
                "publicKeyUrl": keyUrl.absoluteString,
                "signature": signature.base64EncodedString(),
                "salt": salt.base64EncodedString(),
                "timestamp": NSNumber(value: timestamp)
            ])
        })
    }
}
