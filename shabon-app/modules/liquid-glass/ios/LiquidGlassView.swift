//
//  LiquidGlassView.swift
//  iOS 26 Liquid Glass - Expo Module View
//
//  UIHostingController を使用して SwiftUI ビューを UIKit にブリッジ
//

import ExpoModulesCore
import SwiftUI

class LiquidGlassView: ExpoView {
    
    // ============================================
    // Props（React Native から渡されるパラメータ）
    // ============================================
    
    var intensity: Double = 1.0 {
        didSet { updateView() }
    }
    
    var depth: Double = 0.5 {
        didSet { updateView() }
    }
    
    var isPressed: Bool = false {
        didSet { updateView() }
    }
    
    var glassSize: CGFloat = 38.0 {
        didSet { updateView() }
    }
    
    var cornerRadius: CGFloat = 0.0 {
        didSet { updateView() }
    }
    
    var shape: String = "circle" {
        didSet { updateView() }
    }
    
    // ============================================
    // Hosting Controller
    // ============================================
    
    private var hostingController: UIHostingController<AnyView>?
    
    required init(appContext: AppContext? = nil) {
        super.init(appContext: appContext)
        setupHostingController()
    }
    
    private func setupHostingController() {
        let contentView = createContentView()
        hostingController = UIHostingController(rootView: AnyView(contentView))
        
        guard let hostingView = hostingController?.view else { return }
        
        hostingView.translatesAutoresizingMaskIntoConstraints = false
        hostingView.backgroundColor = .clear
        addSubview(hostingView)
        
        NSLayoutConstraint.activate([
            hostingView.topAnchor.constraint(equalTo: topAnchor),
            hostingView.leadingAnchor.constraint(equalTo: leadingAnchor),
            hostingView.trailingAnchor.constraint(equalTo: trailingAnchor),
            hostingView.bottomAnchor.constraint(equalTo: bottomAnchor)
        ])
    }
    
    private func updateView() {
        let contentView = createContentView()
        hostingController?.rootView = AnyView(contentView)
    }
    
    private func createContentView() -> some View {
        Group {
            if #available(iOS 26.0, *) {
                // iOS 26+ : 公式 Liquid Glass API
                LiquidGlassContentView(
                    intensity: intensity,
                    depth: depth,
                    isPressed: isPressed,
                    size: glassSize,
                    cornerRadius: cornerRadius,
                    shape: shape
                )
            } else if #available(iOS 17.0, *) {
                // iOS 17-25 : Material フォールバック
                LiquidGlassContentViewiOS17(
                    intensity: intensity,
                    depth: depth,
                    isPressed: isPressed,
                    size: glassSize,
                    cornerRadius: cornerRadius,
                    shape: shape
                )
            } else {
                // iOS 16以下 : シンプルフォールバック
                LiquidGlassContentViewFallback(
                    intensity: intensity,
                    depth: depth,
                    isPressed: isPressed,
                    size: glassSize,
                    cornerRadius: cornerRadius,
                    shape: shape
                )
            }
        }
    }
}

// ============================================
// SwiftUI Content View
// ============================================

@available(iOS 26.0, *)
struct LiquidGlassContentView: View {
    let intensity: Double
    let depth: Double
    let isPressed: Bool
    let size: CGFloat
    let cornerRadius: CGFloat
    let shape: String
    
    var body: some View {
        Group {
            if shape == "circle" {
                // 円形 - 公式 Liquid Glass API
                Circle()
                    .fill(.clear)
                    .frame(width: size, height: size)
                    .glassEffect(.regular.interactive(isPressed), in: .circle)
            } else {
                // 角丸矩形 - 公式 Liquid Glass API
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.clear)
                    .frame(width: size, height: size)
                    .glassEffect(.regular.interactive(isPressed), in: .rect(cornerRadius: cornerRadius))
            }
        }
    }
}

// iOS 17-25 用フォールバック
@available(iOS 17.0, *)
struct LiquidGlassContentViewiOS17: View {
    let intensity: Double
    let depth: Double
    let isPressed: Bool
    let size: CGFloat
    let cornerRadius: CGFloat
    let shape: String
    
    var body: some View {
        Group {
            if shape == "circle" {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: size, height: size)
                    .overlay(
                        Circle()
                            .stroke(
                                LinearGradient(
                                    colors: [.white.opacity(0.6), .white.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                    .scaleEffect(isPressed ? 0.95 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
            } else {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .frame(width: size, height: size)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [.white.opacity(0.6), .white.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
                    .scaleEffect(isPressed ? 0.95 : 1.0)
                    .animation(.spring(response: 0.3, dampingFraction: 0.6), value: isPressed)
            }
        }
    }
}

// iOS 17未満のフォールバック
struct LiquidGlassContentViewFallback: View {
    let intensity: Double
    let depth: Double
    let isPressed: Bool
    let size: CGFloat
    let cornerRadius: CGFloat
    let shape: String
    
    var body: some View {
        Group {
            if shape == "circle" {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: size, height: size)
                    .overlay(
                        Circle()
                            .stroke(
                                LinearGradient(
                                    colors: [.white.opacity(0.6), .white.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            } else {
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .frame(width: size, height: size)
                    .overlay(
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .stroke(
                                LinearGradient(
                                    colors: [.white.opacity(0.6), .white.opacity(0.1)],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
            }
        }
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .opacity(isPressed ? 0.8 : 1.0)
    }
}

