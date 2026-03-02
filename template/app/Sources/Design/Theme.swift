import SwiftUI

struct Theme {
    // Backgrounds — use semantic system colors so content layers work with Liquid Glass chrome
    static let backgroundPrimary = Color(.systemBackground)
    static let backgroundSecondary = Color(.secondarySystemBackground)
    static let backgroundGrouped = Color(.systemGroupedBackground)

    // Text — semantic colors adapt to light/dark mode and Liquid Glass vibrancy
    static let textPrimary = Color(.label)
    static let textSecondary = Color(.secondaryLabel)
    static let textTertiary = Color(.tertiaryLabel)

    // Accent
    static let accentPrimary = Color(hex: "#3B82F6")
    static let accentSuccess = Color(hex: "#22C55E")
    static let accentWarning = Color(hex: "#F59E0B")
    static let accentDanger = Color(hex: "#EF4444")
}

struct Typography {
    static let largeTitle = Font.system(size: 24, weight: .semibold)
    static let title = Font.system(size: 18, weight: .semibold)
    static let headline = Font.system(size: 15, weight: .medium)
    static let body = Font.system(size: 14, weight: .regular)
    static let caption = Font.system(size: 11, weight: .medium)
    static let tiny = Font.system(size: 10, weight: .medium)
}

struct Spacing {
    static let xs: CGFloat = 4
    static let sm: CGFloat = 8
    static let md: CGFloat = 12
    static let lg: CGFloat = 16
    static let xl: CGFloat = 24
    static let xxl: CGFloat = 32
}
