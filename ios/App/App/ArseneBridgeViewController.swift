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
    private struct StoreLookup: Decodable {
        struct App: Decodable {
            let trackId: Int
            let version: String
        }
        let results: [App]
    }

    public let identifier = "ArseneAppInfoPlugin"
    public let jsName = "ArseneAppInfo"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getVersion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStoreVersion", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openAppStore", returnType: CAPPluginReturnPromise)
    ]

    @objc func getVersion(_ call: CAPPluginCall) {
        guard let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String else {
            call.reject("App version unavailable")
            return
        }
        call.resolve(["version": version])
    }

    @objc func getStoreVersion(_ call: CAPPluginCall) {
        let appID = 6806899939
        guard let url = URL(string: "https://itunes.apple.com/lookup?id=\(appID)&country=jp") else {
            call.reject("Invalid App Store lookup URL")
            return
        }
        let request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 5)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard let data, (response as? HTTPURLResponse)?.statusCode == 200,
                  let lookup = try? JSONDecoder().decode(StoreLookup.self, from: data),
                  let app = lookup.results.first(where: { $0.trackId == appID }) else {
                call.reject("App Store version unavailable")
                return
            }
            call.resolve(["version": app.version])
        }.resume()
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
