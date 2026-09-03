import Capacitor
import StoreKit

@objc(ArseneStoreKitPlugin)
public final class ArseneStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ArseneStoreKitPlugin"
    public let jsName = "ArseneStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getUnfinished", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]

    private var transactionUpdates: Task<Void, Never>?

    public override func load() {
        transactionUpdates = Task { [weak self] in
            for await result in Transaction.updates {
                guard !Task.isCancelled, let self else { return }
                guard case .verified(let transaction) = result else { continue }
                self.notifyListeners("transactionUpdated", data: [
                    "transaction": self.transactionPayload(transaction)
                ])
                // Delivery belongs to the web layer. It persists the granted item
                // first, then calls finish(transactionId:). Never finish here.
            }
        }
    }

    deinit {
        transactionUpdates?.cancel()
    }

    @objc public func getProducts(_ call: CAPPluginCall) {
        guard let productIds = call.getArray("productIds", String.self), !productIds.isEmpty else {
            call.reject("productIds must be a non-empty string array", "INVALID_ARGUMENT")
            return
        }

        Task { @MainActor in
            do {
                let products = try await Product.products(for: productIds)
                let found = Set(products.map(\.id))
                call.resolve([
                    "products": products.map(productPayload),
                    "missingProductIds": productIds.filter { !found.contains($0) }
                ])
            } catch {
                call.reject("Unable to load App Store products", "PRODUCT_FETCH_FAILED", error)
            }
        }
    }

    @objc public func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.reject("productId is required", "INVALID_ARGUMENT")
            return
        }

        Task { @MainActor in
            do {
                guard let product = try await Product.products(for: [productId]).first else {
                    call.reject("Product is unavailable", "PRODUCT_NOT_FOUND")
                    return
                }

                switch try await product.purchase() {
                case .success(let verification):
                    guard case .verified(let transaction) = verification else {
                        call.reject("App Store transaction verification failed", "UNVERIFIED_TRANSACTION")
                        return
                    }
                    call.resolve([
                        "status": "purchased",
                        "transaction": transactionPayload(transaction)
                    ])
                case .pending:
                    call.resolve(["status": "pending"])
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                @unknown default:
                    call.reject("Unknown App Store purchase result", "UNKNOWN_PURCHASE_RESULT")
                }
            } catch {
                call.reject("App Store purchase failed", "PURCHASE_FAILED", error)
            }
        }
    }

    @objc public func restore(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                try await AppStore.sync()
                var transactions: [[String: Any]] = []
                for await result in Transaction.currentEntitlements {
                    guard case .verified(let transaction) = result else { continue }
                    transactions.append(transactionPayload(transaction))
                }
                call.resolve(["transactions": transactions])
            } catch {
                call.reject("Unable to restore App Store purchases", "RESTORE_FAILED", error)
            }
        }
    }

    @objc public func getUnfinished(_ call: CAPPluginCall) {
        Task { @MainActor in
            var transactions: [[String: Any]] = []
            for await result in Transaction.unfinished {
                guard case .verified(let transaction) = result else { continue }
                transactions.append(transactionPayload(transaction))
            }
            call.resolve(["transactions": transactions])
        }
    }

    @objc public func finish(_ call: CAPPluginCall) {
        guard let transactionId = call.getString("transactionId"), !transactionId.isEmpty else {
            call.reject("transactionId is required", "INVALID_ARGUMENT")
            return
        }

        Task { @MainActor in
            for await result in Transaction.unfinished {
                guard case .verified(let transaction) = result else { continue }
                guard String(transaction.id) == transactionId else { continue }
                await transaction.finish()
                call.resolve(["finished": true])
                return
            }
            // Idempotent success: a retry after a previous successful finish is safe.
            call.resolve(["finished": true])
        }
    }

    private func productPayload(_ product: Product) -> [String: Any] {
        [
            "productId": product.id,
            "displayName": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "type": productType(product.type)
        ]
    }

    private func transactionPayload(_ transaction: Transaction) -> [String: Any] {
        var payload: [String: Any] = [
            // StoreKit identifiers are UInt64; strings avoid JavaScript precision loss.
            "transactionId": String(transaction.id),
            "originalTransactionId": String(transaction.originalID),
            "productId": transaction.productID,
            "purchaseDate": Self.dateFormatter.string(from: transaction.purchaseDate),
            "ownershipType": String(describing: transaction.ownershipType),
            "jwsRepresentation": transaction.jwsRepresentation
        ]
        if let expirationDate = transaction.expirationDate {
            payload["expirationDate"] = Self.dateFormatter.string(from: expirationDate)
        }
        if let revocationDate = transaction.revocationDate {
            payload["revocationDate"] = Self.dateFormatter.string(from: revocationDate)
        }
        if #available(iOS 16.0, *) {
            payload["environment"] = String(describing: transaction.environment)
        } else {
            payload["environment"] = "unknown"
        }
        return payload
    }

    private func productType(_ type: Product.ProductType) -> String {
        switch type {
        case .consumable: return "consumable"
        case .nonConsumable: return "nonConsumable"
        case .autoRenewable: return "autoRenewable"
        case .nonRenewable: return "nonRenewable"
        default: return "unknown"
        }
    }

    private static let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
