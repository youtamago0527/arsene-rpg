import XCTest
import StoreKit
import StoreKitTest
import Capacitor
@testable import App

@available(iOS 17.0, *)
final class StoreKitVerification: XCTestCase {
    var session: SKTestSession!
    var plugin: ArseneStoreKitPlugin!
    let ids = ["time_complete_pass", "ad_skip_license", "ad_skip_tickets_10", "auto3_license", "sweep_license", "otherworld_tickets_5", "rebirth_arcana_1", "protection_arcana_1", "blessed_protection_arcana_1"].map { "com.arsene.remix." + $0 }
    var settings: [String: Any] = [:]
    override func setUpWithError() throws {
        plugin = ArseneStoreKitPlugin()
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "Products", withExtension: "storekit"))
        let data = try Data(contentsOf: url)
        settings = (try JSONSerialization.jsonObject(with: data) as? [String: Any])?["settings"] as? [String: Any] ?? [:]
    }
    func requireAutomatic() throws {
        guard settings["_disableDialogs"] as? Bool == true, settings["_askToBuyEnabled"] as? Bool != true else {
            throw XCTSkip("This configuration is reserved for manual cancellation or pending tests.")
        }
    }
    override func tearDown() { plugin = nil }
    func invoke(_ method: String, _ options: [String: Any] = [:]) async throws -> [String: Any] {
        try await withCheckedThrowingContinuation { continuation in
            print("STOREKIT INVOKE: \(method)")
            let call = CAPPluginCall(callbackId: UUID().uuidString, methodName: method, options: options, success: { result, _ in
                print("STOREKIT RESOLVED: \(method)")
                continuation.resume(returning: result?.data ?? [:])
            }, error: { error in
                continuation.resume(throwing: NSError(domain: "ArseneStoreKit", code: 1, userInfo: [NSLocalizedDescriptionKey: error?.message ?? "rejected"]))
            })!
            switch method {
            case "getProducts": plugin.getProducts(call)
            case "purchase": plugin.purchase(call)
            case "pending": plugin.pending(call)
            case "finish": plugin.finish(call)
            case "restore": plugin.restore(call)
            default: fatalError("unknown test method")
            }
        }
    }
    func testNineProductsAndVerifiedPurchases() async throws {
        try requireAutomatic()
        let response = try await invoke("getProducts", ["productIds": ids])
        let products = try XCTUnwrap(response["products"] as? [[String: Any]])
        XCTAssertEqual(products.count, 9)
        var completedIDs = Set<String>()
        for product in products {
            let id = try XCTUnwrap(product["id"] as? String)
            let type = try XCTUnwrap(product["type"] as? String)
            let result = try await invoke("purchase", ["productId": id, "expectedType": type])
            XCTAssertEqual(result["verified"] as? Bool, true)
            XCTAssertEqual(result["productId"] as? String, id)
            let transactionId = try XCTUnwrap(result["transactionId"] as? String)
            _ = try await invoke("finish", ["transactionId": transactionId])
            completedIDs.insert(transactionId)
        }
        var pending = try await invoke("pending")
        for _ in 0..<20 {
            let current = Set((pending["transactions"] as? [[String: Any]] ?? []).compactMap { $0["transactionId"] as? String })
            if completedIDs.isDisjoint(with: current) { break }
            try await Task.sleep(nanoseconds: 200_000_000)
            pending = try await invoke("pending")
        }
        print("STOREKIT FINISHED IDS: \(completedIDs); REMAINING: \(pending)")
        let unfinishedIDs = Set((pending["transactions"] as? [[String: Any]] ?? []).compactMap { $0["transactionId"] as? String })
        XCTAssertTrue(completedIDs.isDisjoint(with: unfinishedIDs))
    }
    func testCancellationDoesNotCreateTransaction() async throws {
        guard settings["_disableDialogs"] as? Bool == false, settings["_askToBuyEnabled"] as? Bool != true else { throw XCTSkip("Run manual configuration to check the visible sheet and cancel it.") }
        let result = try await invoke("purchase", ["productId": ids[2], "expectedType": "consumable"])
        XCTAssertEqual(result["status"] as? String, "cancelled")
        XCTAssertNil(result["verified"])
        XCTAssertNil(result["transactionId"])
    }
    func testPendingDoesNotReturnVerifiedGrant() async throws {
        guard settings["_askToBuyEnabled"] as? Bool == true else { throw XCTSkip("Run Ask-to-Buy configuration for this case.") }
        let result = try await invoke("purchase", ["productId": ids[2], "expectedType": "consumable"])
        XCTAssertEqual(result["status"] as? String, "pending")
        XCTAssertNil(result["verified"])
        XCTAssertNil(result["transactionId"])
    }
    func testUnavailableAndWrongTypeAreRejected() async throws {
        try requireAutomatic()
        for options in [["productId": "com.arsene.remix.missing", "expectedType": "consumable"], ["productId": ids[0], "expectedType": "consumable"]] {
            do { _ = try await invoke("purchase", options); XCTFail("Invalid purchase succeeded") } catch { }
        }
    }
    func testUnfinishedReplayAndFinish() async throws {
        try requireAutomatic()
        let result = try await invoke("purchase", ["productId": ids[2], "expectedType": "consumable"])
        let id = try XCTUnwrap(result["transactionId"] as? String)
        plugin = ArseneStoreKitPlugin()
        let pending = try await invoke("pending")
        XCTAssertTrue((pending["transactions"] as? [[String: Any]] ?? []).contains { $0["transactionId"] as? String == id })
        _ = try await invoke("finish", ["transactionId": id])
        let repeatedFinish = try await invoke("finish", ["transactionId": id])
        XCTAssertEqual(repeatedFinish["finished"] as? Bool, false)
    }
    func testRestoreStableNonConsumableEntitlements() async throws {
        try requireAutomatic()
        let purchase = try await invoke("purchase", ["productId": ids[0], "expectedType": "nonConsumable"])
        print("STOREKIT NONCONSUMABLE PURCHASE: status=\(purchase["status"] ?? "none"), verified=\(purchase["verified"] ?? false)")
        guard purchase["verified"] as? Bool == true else {
            XCTFail("Non-consumable purchase was not verified; restore success cannot be assessed.")
            return
        }
        XCTAssertEqual(purchase["productId"] as? String, ids[0])
        let restored = try await invoke("restore")
        let entries = restored["transactions"] as? [[String: Any]] ?? []
        XCTAssertTrue(entries.contains { $0["productId"] as? String == ids[0] && $0["verified"] as? Bool == true })
        let repeated = try await invoke("restore")
        let again = repeated["transactions"] as? [[String: Any]] ?? []
        XCTAssertEqual(Set(entries.compactMap { $0["transactionId"] as? String }), Set(again.compactMap { $0["transactionId"] as? String }))
        XCTAssertTrue(again.allSatisfy { $0["verified"] as? Bool == true })
    }
}
