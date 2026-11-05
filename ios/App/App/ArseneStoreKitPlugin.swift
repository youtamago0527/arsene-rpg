import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(ArseneStoreKitPlugin)
public class ArseneStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ArseneStoreKitPlugin"
    public let jsName = "ArseneStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pending", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    private func payload(_ transaction: Transaction) -> [String: Any] {
        return [
            "productId": transaction.productID,
            "transactionId": String(transaction.id),
            "verified": true
        ]
    }

    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("productIds", String.self) ?? []
        guard !ids.isEmpty else { call.reject("Missing product IDs"); return }
        Task {
            do {
                let products = try await Product.products(for: Set(ids))
                call.resolve(["products": products.map { product in
                    ["id": product.id,
                     "displayPrice": product.displayPrice,
                     "type": product.type == .consumable ? "consumable" : product.type == .nonConsumable ? "nonConsumable" : "unsupported"]
                }])
            } catch {
                call.reject("Unable to load App Store products", nil, error)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("Missing product ID"); return
        }
        guard let expectedType = call.getString("expectedType"),
              expectedType == "consumable" || expectedType == "nonConsumable" else {
            call.reject("Missing product type"); return
        }
        Task {
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Product unavailable in App Store Connect"); return
                }
                guard (expectedType == "consumable" && product.type == .consumable) ||
                      (expectedType == "nonConsumable" && product.type == .nonConsumable) else {
                    call.reject("App Store product type mismatch"); return
                }
                let result = try await product.purchase()
                switch result {
                case .success(.verified(let transaction)):
                    guard transaction.productID == productId else {
                        call.reject("Purchased product did not match request"); return
                    }
                    // JS persists the grant first; finish is a separate acknowledgement.
                    call.resolve(payload(transaction))
                case .success(.unverified):
                    call.reject("App Store transaction could not be verified")
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.reject("Unknown App Store purchase state")
                }
            } catch {
                call.reject("App Store purchase failed", nil, error)
            }
        }
    }

    @objc func pending(_ call: CAPPluginCall) {
        Task {
            var transactions: [[String: Any]] = []
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result { transactions.append(payload(transaction)) }
            }
            call.resolve(["transactions": transactions])
        }
    }

    @objc func finish(_ call: CAPPluginCall) {
        guard let id = call.getString("transactionId"), let transactionId = UInt64(id) else {
            call.reject("Invalid transaction ID"); return
        }
        Task {
            for await result in Transaction.unfinished {
                if case .verified(let transaction) = result, transaction.id == transactionId {
                    await transaction.finish()
                    call.resolve(["finished": true])
                    return
                }
            }
            // A previously finished transaction must not be granted again by this method.
            call.resolve(["finished": false])
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var transactions: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    if case .verified(let transaction) = result { transactions.append(payload(transaction)) }
                }
                call.resolve(["transactions": transactions])
            } catch {
                call.reject("Unable to restore App Store purchases", nil, error)
            }
        }
    }
}
