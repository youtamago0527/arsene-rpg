import Capacitor
import UIKit

class ArseneBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ArseneStoreKitPlugin())
        bridge?.registerPluginInstance(ArseneGameCenterPlugin())
        bridge?.registerPluginInstance(ArseneAppInfoPlugin())
    }
}

@objc(ArseneAppInfoPlugin)
public class ArseneAppInfoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ArseneAppInfoPlugin"
    public let jsName = "ArseneAppInfo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVersion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppStore", returnType: CAPPluginReturnPromise)
    ]

    @objc func getVersion(_ call: CAPPluginCall) {
        guard let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String else {
            call.reject("App version unavailable")
            return
        }
        call.resolve(["version": version])
    }

    @objc func openAppStore(_ call: CAPPluginCall) {
        guard let url = URL(string: "itms-apps://apps.apple.com/app/id6806899939") else {
            call.reject("Invalid App Store URL")
            return
        }
        DispatchQueue.main.async {
            UIApplication.shared.open(url) { opened in
                call.resolve(["opened": opened])
            }
        }
    }
}
