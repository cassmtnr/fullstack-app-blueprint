import SwiftUI
import AuthenticationServices

struct OnboardingView: View {
    @State private var viewModel = AuthViewModel()

    var body: some View {
        VStack(spacing: Spacing.xl) {
            Spacer()

            Image(systemName: "app.fill")
                .font(.system(size: 80))
                .foregroundStyle(Theme.accentPrimary)

            Text("Welcome to {{PROJECT_NAME}}")
                .font(Typography.largeTitle)
                .foregroundStyle(Theme.textPrimary)

            Text("Sign in to get started")
                .font(Typography.body)
                .foregroundStyle(Theme.textSecondary)

            Spacer()

            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                Task { await viewModel.handleSignIn(result: result) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .padding(.horizontal, Spacing.xl)

            if let error = viewModel.errorMessage {
                Text(error)
                    .font(Typography.caption)
                    .foregroundStyle(Theme.accentDanger)
            }
        }
        .padding(Spacing.lg)
    }
}
