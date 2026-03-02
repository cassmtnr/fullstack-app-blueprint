import SwiftUI

struct ContentView: View {
    @State private var authManager = AuthManager.shared

    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                OnboardingView()
            }
        }
        .task {
            if authManager.isAuthenticated {
                await authManager.fetchCurrentUser()
            }
        }
    }
}
