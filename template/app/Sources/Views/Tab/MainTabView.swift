import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            Tab("Home", systemImage: "house.fill") {
                NavigationStack {
                    Text("Home")
                        .navigationTitle("Home")
                }
            }
            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView()
            }
        }
    }
}

struct SettingsView: View {
    @State private var authManager = AuthManager.shared
    @State private var statusVM = StatusViewModel()

    var body: some View {
        NavigationStack {
            List {
                if let user = authManager.currentUser {
                    Section("Profile") {
                        if let name = user.fullName {
                            LabeledContent("Name", value: name)
                        }
                        if let email = user.email {
                            LabeledContent("Email", value: email)
                        }
                    }
                }

                Section("Backend Status") {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "circle.fill")
                            .foregroundStyle(statusVM.isConnected ? .green : .red)
                            .font(.caption)
                        Text(statusVM.isConnected ? "Connected" : "Disconnected")
                            .font(Typography.headline)
                    }
                    if let error = statusVM.errorMessage {
                        Text(error)
                            .font(Typography.caption)
                            .foregroundStyle(.red)
                    }
                    Button("Check Connection") {
                        Task { await statusVM.checkStatus() }
                    }
                    .disabled(statusVM.isChecking)
                }

                Section {
                    Button("Sign Out", role: .destructive) {
                        authManager.signOut()
                    }
                }
            }
            .navigationTitle("Settings")
            .task {
                await statusVM.checkStatus()
            }
        }
    }
}
