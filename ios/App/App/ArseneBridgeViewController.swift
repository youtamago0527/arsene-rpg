import Capacitor

class ArseneBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(ArseneStoreKitPlugin())
        bridge?.registerPluginInstance(ArseneGameCenterPlugin())
    }
}
