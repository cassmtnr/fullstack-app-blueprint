import Foundation

// MARK: - Generic API Response

struct APIResponse<T: Decodable>: Decodable {
    let success: Bool
    let data: T?
    let error: APIErrorDetails?
}

struct APIErrorDetails: Decodable {
    let code: String
    let message: String
}

// MARK: - Status

struct StatusResponse: Decodable {
    let status: String
    let version: String
    let environment: String
    let database: String
    let timestamp: String
}

// MARK: - Auth

struct AppleAuthRequest: Encodable {
    let identityToken: String
    let fullName: String?
}

struct RefreshRequest: Encodable {
    let refreshToken: String
}

struct LogoutRequest: Encodable {
    let refreshToken: String
}

struct AuthResponse: Decodable {
    let user: UserProfile
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

struct TokenResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let expiresIn: Int
}

struct UserProfile: Decodable {
    let id: String
    let email: String?
    let fullName: String?
    let createdAt: String?  // ISO 8601 string — kept as String to avoid dateDecodingStrategy complexity
}

struct EmptyResponse: Decodable {}
