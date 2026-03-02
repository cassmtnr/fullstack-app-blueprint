import Foundation
import AuthenticationServices

@Observable
final class AuthViewModel {
    var errorMessage: String?
    var isSigningIn = false

    private let authManager: AuthManager

    init(authManager: AuthManager = .shared) {
        self.authManager = authManager
    }

    func handleSignIn(result: Result<ASAuthorization, Error>) async {
        isSigningIn = true
        errorMessage = nil

        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityTokenData = credential.identityToken,
                  let identityToken = String(data: identityTokenData, encoding: .utf8) else {
                errorMessage = "Failed to get Apple credentials"
                isSigningIn = false
                return
            }

            let fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
                .compactMap { $0 }
                .joined(separator: " ")

            do {
                try await authManager.signIn(
                    identityToken: identityToken,
                    fullName: fullName.isEmpty ? nil : fullName
                )
            } catch {
                errorMessage = error.localizedDescription
            }

        case .failure(let error):
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                errorMessage = error.localizedDescription
            }
        }

        isSigningIn = false
    }
}
