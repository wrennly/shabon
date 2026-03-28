//
//  LiquidGlassShader.metal
//  iOS 26 Liquid Glass Effect - Metal Shader Implementation
//
//  物理ベースのリキッドグラス効果:
//  1. スネルの法則に基づく屈折シミュレーション
//  2. 色収差（Chromatic Aberration）
//  3. フレネル反射
//  4. 流体ノイズによる動的歪み
//  5. スペキュラハイライト
//

#include <metal_stdlib>
#include <SwiftUI/SwiftUI_Metal.h>

using namespace metal;

// ============================================
// ユーティリティ関数
// ============================================

// 擬似乱数生成
float hash(float2 p) {
    return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453123);
}

// 2Dノイズ（バイリニア補間）
float noise(float2 p) {
    float2 i = floor(p);
    float2 f = fract(p);
    
    float a = hash(i);
    float b = hash(i + float2(1.0, 0.0));
    float c = hash(i + float2(0.0, 1.0));
    float d = hash(i + float2(1.0, 1.0));
    
    float2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM（フラクタルブラウン運動）- 流体の複雑な動きを生成
float fbm(float2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (int i = 0; i < 4; i++) {
        value += amplitude * noise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

// レンズ歪み強度計算（放物線フォールオフ）
// 中心で1.0、エッジで0.0
float calculateLensDistortion(float2 position, float2 center, float radius) {
    float dist = distance(position, center);
    float normalizedDist = clamp(dist / radius, 0.0, 1.0);
    // 放物線関数 (1 - r^2)^2 でより急峻なエッジを実現
    float factor = 1.0 - normalizedDist * normalizedDist;
    return factor * factor;
}

// フレネル係数計算（Schlick近似）
float fresnelSchlick(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}

// ============================================
// メインシェーダー関数
// ============================================

[[stitchable]]
half4 liquidGlass(
    float2 position,
    SwiftUI::Layer layer,
    float2 size,
    float time,
    float intensity,
    float depth,
    float isPressed
) {
    // 1. 座標の正規化
    float2 uv = position / size;
    float2 center = size / 2.0;
    float radius = min(size.x, size.y) / 2.0;
    
    // 中心からの距離（正規化）
    float2 toCenter = center - position;
    float dist = length(toCenter);
    float normalizedDist = dist / radius;
    
    // 2. 表面法線の計算（球面を仮定）
    // z成分は球の高さ（中心で最大、エッジで0）
    float zHeight = sqrt(max(0.0, 1.0 - normalizedDist * normalizedDist));
    float3 normal = normalize(float3(toCenter / radius, zHeight));
    
    // 3. 流体ノイズによる動的歪み
    float2 noiseCoord = uv * 3.0 + time * 0.2;
    float2 q = float2(fbm(noiseCoord), fbm(noiseCoord + float2(5.2, 1.3)));
    float2 r = float2(
        fbm(noiseCoord + 4.0 * q + float2(1.7, 9.2) + time * 0.15),
        fbm(noiseCoord + 4.0 * q + float2(8.3, 2.8) + time * 0.15)
    );
    
    // 流体歪みの強度（深度とプレス状態に応じて変化）
    float fluidStrength = 0.008 * intensity * (1.0 + depth * 0.5 + isPressed * 0.3);
    float2 fluidDistortion = (r - 0.5) * fluidStrength * size;
    
    // 4. レンズ歪み（屈折シミュレーション）
    float lensFactor = calculateLensDistortion(position, center, radius);
    
    // 屈折率（ガラス ≈ 1.5、深度で変化）
    float ior = 1.45 + depth * 0.1 + fbm(uv * 2.0 + time * 0.1) * 0.05;
    
    // 屈折による歪みベクトル
    float refractionStrength = 25.0 * intensity * (1.0 - lensFactor * 0.3);
    float2 refractionOffset = normalize(toCenter) * refractionStrength * (1.0 / ior);
    
    // 動的波紋
    float wave = sin(dist * 0.08 - time * 2.5) * 0.5 + 0.5;
    float2 waveOffset = normalize(toCenter) * wave * 3.0 * intensity;
    
    // 総合歪みベクトル
    float2 totalDistortion = refractionOffset + fluidDistortion + waveOffset;
    
    // 5. 色収差（Chromatic Aberration）
    // RGB各チャンネルで異なる屈折率をシミュレート
    float aberrationStrength = 2.0 * intensity * (1.0 + normalizedDist * 0.5);
    
    float2 redOffset = totalDistortion * (1.0 + 0.015 * aberrationStrength);
    float2 greenOffset = totalDistortion;
    float2 blueOffset = totalDistortion * (1.0 - 0.015 * aberrationStrength);
    
    // 背景レイヤーをチャンネルごとにサンプリング
    half4 redSample = layer.sample(position + redOffset);
    half4 greenSample = layer.sample(position + greenOffset);
    half4 blueSample = layer.sample(position + blueOffset);
    
    // チャンネル再結合
    half4 refractedColor = half4(redSample.r, greenSample.g, blueSample.b, 1.0);
    
    // 6. フレネル反射（視線角度依存）
    float3 viewDir = float3(0.0, 0.0, 1.0);
    float cosTheta = max(0.0, dot(normal, viewDir));
    float fresnel = fresnelSchlick(cosTheta, 0.04); // ガラスのF0 ≈ 0.04
    
    // エッジでの反射強度を増加
    float edgeFresnel = pow(1.0 - cosTheta, 3.0) * 0.6;
    
    // 7. スペキュラハイライト（Blinn-Phong）
    float3 lightDir = normalize(float3(-0.4, -0.6, 1.0)); // 左上からの光源
    float3 halfVec = normalize(lightDir + viewDir);
    
    // メインスペキュラ（鋭いハイライト）
    float specular = pow(max(0.0, dot(normal, halfVec)), 128.0);
    
    // セカンダリスペキュラ（広いハイライト）
    float specular2 = pow(max(0.0, dot(normal, halfVec)), 32.0) * 0.4;
    
    // ノイズでハイライトを揺らす
    float highlightNoise = fbm(uv * 6.0 - time * 0.3) * 0.2;
    specular *= (1.0 + highlightNoise);
    
    // 8. リムライト（エッジの輝き）
    float rimWidth = 0.15;
    float rimIntensity = smoothstep(1.0 - rimWidth, 1.0, normalizedDist);
    rimIntensity *= (1.0 - smoothstep(1.0, 1.0 + rimWidth * 0.1, normalizedDist));
    
    // 9. 内部グロー（ガラスの厚み感）
    float innerGlow = pow(1.0 - normalizedDist, 2.0) * 0.15;
    
    // 10. 表面の光沢グラデーション
    float gloss = smoothstep(0.0, 0.6, 1.0 - uv.y) * 0.08;
    
    // ============================================
    // 最終合成
    // ============================================
    
    // ベースカラー（iOS Blue）
    half3 tintColor = half3(0.0, 0.478, 1.0);
    
    // 屈折色にティントを軽く乗せる
    half3 color = mix(refractedColor.rgb, tintColor, half(0.15 + depth * 0.1));
    
    // フレネル反射を加算
    half3 reflectionColor = half3(0.95, 0.97, 1.0);
    color = mix(color, reflectionColor, half(fresnel * 0.3 + edgeFresnel));
    
    // スペキュラハイライト
    color += half3(1.0) * half(specular * 0.7);
    color += half3(1.0) * half(specular2 * 0.3);
    
    // リムライト
    color += half3(1.0) * half(rimIntensity * 0.5);
    
    // 内部グロー
    color += half3(1.0) * half(innerGlow);
    
    // 表面光沢
    color += half3(1.0) * half(gloss);
    
    // 11. アルファ計算
    // 中心は透明、エッジは不透明
    float alpha = 0.4 + fresnel * 0.3 + edgeFresnel * 0.2;
    alpha += specular * 0.15;
    alpha += rimIntensity * 0.3;
    alpha *= (0.85 + depth * 0.3);
    
    // プレス時の暗転
    color *= half(1.0 - isPressed * 0.1);
    alpha += isPressed * 0.1;
    
    // 12. 円形クリッピング（アンチエイリアス）
    float circleMask = 1.0 - smoothstep(0.95, 1.0, normalizedDist);
    alpha *= circleMask;
    
    return half4(color * half(alpha), half(alpha));
}

// ============================================
// 矩形用シェーダー（角丸対応）
// ============================================

[[stitchable]]
half4 liquidGlassRect(
    float2 position,
    SwiftUI::Layer layer,
    float2 size,
    float cornerRadius,
    float time,
    float intensity,
    float depth
) {
    // 角丸矩形のSDF（Signed Distance Field）
    float2 center = size / 2.0;
    float2 q = abs(position - center) - (size / 2.0 - cornerRadius);
    float sdf = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - cornerRadius;
    
    // 正規化距離
    float normalizedDist = clamp(-sdf / cornerRadius, 0.0, 1.0);
    
    // 以降は円形と同様の処理（簡略化版）
    float2 toCenter = center - position;
    float3 normal = normalize(float3(toCenter / size, normalizedDist));
    
    // 流体ノイズ
    float2 uv = position / size;
    float2 noiseCoord = uv * 3.0 + time * 0.2;
    float fluidNoise = fbm(noiseCoord) * 0.01 * intensity;
    
    // 屈折
    float2 distortion = toCenter * 0.05 * intensity + float2(fluidNoise);
    
    // 色収差
    half4 redSample = layer.sample(position + distortion * 1.02);
    half4 greenSample = layer.sample(position + distortion);
    half4 blueSample = layer.sample(position + distortion * 0.98);
    
    half4 refractedColor = half4(redSample.r, greenSample.g, blueSample.b, 1.0);
    
    // フレネル
    float fresnel = pow(1.0 - normalizedDist, 3.0) * 0.4;
    
    // 合成
    half3 color = mix(refractedColor.rgb, half3(0.0, 0.478, 1.0), half(0.1));
    color += half3(1.0) * half(fresnel * 0.3);
    
    float alpha = 0.5 + fresnel * 0.3;
    
    // SDFによるクリッピング
    float mask = 1.0 - smoothstep(-1.0, 0.0, sdf);
    alpha *= mask;
    
    return half4(color * half(alpha), half(alpha));
}

