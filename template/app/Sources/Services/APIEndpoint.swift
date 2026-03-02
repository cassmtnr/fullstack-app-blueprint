import Foundation

enum APIEndpoint {
    case status

    // Auth
    case authApple(body: AppleAuthRequest)
    case authRefresh(body: RefreshRequest)
    case authMe
    case authLogout(body: LogoutRequest)

    var path: String {
        switch self {
        case .status:
            return "/status"
        case .authApple:
            return "/auth/apple"
        case .authRefresh:
            return "/auth/refresh"
        case .authMe:
            return "/auth/me"
        case .authLogout:
            return "/auth/logout"
        }
    }

    var method: String {
        switch self {
        case .status, .authMe:
            return "GET"
        case .authApple, .authRefresh, .authLogout:
            return "POST"
        }
    }

    var requiresAuth: Bool {
        switch self {
        case .status, .authApple, .authRefresh:
            return false
        case .authMe, .authLogout:
            return true
        }
    }

    var body: (any Encodable)? {
        switch self {
        case .status, .authMe:
            return nil
        case .authApple(let body):
            return body
        case .authRefresh(let body):
            return body
        case .authLogout(let body):
            return body
        }
    }
}
