import Foundation

@Observable
final class AuthManager {
    static let shared = AuthManager()

    private(set) var isAuthenticated = false
    private(set) var currentUser: UserProfile?

    private let keychain = KeychainManager.shared
    private let apiClient = APIClient.shared

    init() {
        isAuthenticated = keychain.load(key: "accessToken") != nil
    }

    func signIn(identityToken: String, fullName: String?) async throws {
        let response: AuthResponse = try await apiClient.request(.authApple(
            body: AppleAuthRequest(identityToken: identityToken, fullName: fullName)
        ))

        try saveTokens(accessToken: response.accessToken, refreshToken: response.refreshToken)
        currentUser = response.user
        isAuthenticated = true
    }

    func refreshTokens() async throws {
        guard let refreshData = keychain.load(key: "refreshToken"),
              let refreshToken = String(data: refreshData, encoding: .utf8) else {
            signOut()
            throw APIError.unauthorized
        }

        let response: TokenResponse = try await apiClient.request(.authRefresh(
            body: RefreshRequest(refreshToken: refreshToken)
        ))

        try saveTokens(accessToken: response.accessToken, refreshToken: response.refreshToken)
    }

    func fetchCurrentUser() async {
        do {
            let user: UserProfile = try await apiClient.request(.authMe)
            currentUser = user
        } catch {
            // If fetch fails, user can still use cached auth state
        }
    }

    // Intentionally synchronous — clears local state immediately.
    // The server logout is fire-and-forget; if it fails, the refresh token
    // expires on its own. The user is signed out locally regardless.
    func signOut() {
        if let refreshData = keychain.load(key: "refreshToken"),
           let refreshToken = String(data: refreshData, encoding: .utf8) {
            Task {
                let _: EmptyResponse? = try? await apiClient.request(.authLogout(
                    body: LogoutRequest(refreshToken: refreshToken)
                ))
            }
        }
        keychain.deleteAll()
        currentUser = nil
        isAuthenticated = false
    }

    func getValidAccessToken() async throws -> String {
        guard let tokenData = keychain.load(key: "accessToken"),
              let token = String(data: tokenData, encoding: .utf8) else {
            throw APIError.unauthorized
        }
        return token
    }

    private func saveTokens(accessToken: String, refreshToken: String) throws {
        try keychain.save(key: "accessToken", data: Data(accessToken.utf8))
        try keychain.save(key: "refreshToken", data: Data(refreshToken.utf8))
    }
}
