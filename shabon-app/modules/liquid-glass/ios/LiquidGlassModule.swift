//
//  LiquidGlassModule.swift
//  iOS 26 Liquid Glass - Expo Module Definition
//
//  JavaScript インターフェースの定義
//

import ExpoModulesCore

public class LiquidGlassModule: Module {
    public func definition() -> ModuleDefinition {
        // モジュール名（JS から参照する際の名前）
        Name("LiquidGlass")
        
        // ビューの登録
        View(LiquidGlassView.self) {
            // Props の定義
            
            // エフェクトの強度 (0.0 - 2.0)
            Prop("intensity") { (view: LiquidGlassView, value: Double) in
                view.intensity = value
            }
            
            // 仮想深度 (0.0 - 1.0)
            // 深いほど屈折が強くなり、背景に近づく感覚
            Prop("depth") { (view: LiquidGlassView, value: Double) in
                view.depth = value
            }
            
            // プレス状態
            Prop("isPressed") { (view: LiquidGlassView, value: Bool) in
                view.isPressed = value
            }
            
            // サイズ
            Prop("glassSize") { (view: LiquidGlassView, value: Double) in
                view.glassSize = CGFloat(value)
            }
            
            // 角丸半径（矩形の場合）
            Prop("cornerRadius") { (view: LiquidGlassView, value: Double) in
                view.cornerRadius = CGFloat(value)
            }
            
            // 形状: "circle" or "rect"
            Prop("shape") { (view: LiquidGlassView, value: String) in
                view.shape = value
            }
        }
    }
}

