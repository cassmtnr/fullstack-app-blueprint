import Foundation

// MARK: - Environment Configuration

enum AppEnvironment {
    case development, production

    static var current: AppEnvironment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
}

struct EnvironmentConfig {
    let apiBaseURL: String

    static var current: EnvironmentConfig {
        switch AppEnvironment.current {
        case .development:
            // Simulator: localhost works. Device: replace with your machine's IP or use ngrok.
            return EnvironmentConfig(apiBaseURL: "http://localhost:3000/api/v1")
        case .production:
            return EnvironmentConfig(apiBaseURL: "https://{{API_DOMAIN}}/api/v1")
        }
    }
}

// MARK: - API Errors

enum APIError: Error, LocalizedError {
    case invalidURL
    case networkError(Error)
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .serverError(let code):
            return "Server error: \(code)"
        case .unauthorized:
            return "Unauthorized"
        case .unknown:
            return "Unknown error"
        }
    }
}

// MARK: - API Client

actor APIClient {
    static let shared = APIClient()

    private let baseURL: String
    private let session: URLSession

    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init() {
        self.baseURL = EnvironmentConfig.current.apiBaseURL

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    func request<T: Decodable>(_ endpoint: APIEndpoint, retryOn401: Bool = true) async throws -> T {
        let urlString = baseURL + endpoint.path

        guard let url = URL(string: urlString) else {
            throw APIError.invalidURL
        }

        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = endpoint.method
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if endpoint.requiresAuth {
            let token = try await AuthManager.shared.getValidAccessToken()
            urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = endpoint.body {
            urlRequest.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: urlRequest)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        // Automatic 401 retry with token refresh (once only)
        if httpResponse.statusCode == 401 && endpoint.requiresAuth && retryOn401 {
            do {
                try await AuthManager.shared.refreshTokens()
                return try await request(endpoint, retryOn401: false)
            } catch {
                await AuthManager.shared.signOut()
                throw APIError.unauthorized
            }
        }

        do {
            let apiResponse = try decoder.decode(APIResponse<T>.self, from: data)
            if apiResponse.success, let responseData = apiResponse.data {
                return responseData
            }
            throw APIError.serverError(apiResponse.error?.code ?? "UNKNOWN")
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - Type Erasure
// Swift can't directly encode existential `any Encodable` — this wrapper bridges it.

private struct AnyEncodable: Encodable {
    private let encode: (Encoder) throws -> Void

    init(_ wrapped: any Encodable) {
        self.encode = { encoder in
            try wrapped.encode(to: encoder)
        }
    }

    func encode(to encoder: Encoder) throws {
        try encode(encoder)
    }
}
