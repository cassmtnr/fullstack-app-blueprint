import Foundation

@MainActor
@Observable
final class StatusViewModel {
    var isConnected = false
    var isChecking = false
    var errorMessage: String?

    private let apiClient: APIClient

    init(apiClient: APIClient = .shared) {
        self.apiClient = apiClient
    }

    func checkStatus() async {
        isChecking = true
        errorMessage = nil

        do {
            let response: StatusResponse = try await apiClient.request(.status)
            isConnected = response.status == "ok"
        } catch {
            isConnected = false
            errorMessage = error.localizedDescription
        }

        isChecking = false
    }
}
