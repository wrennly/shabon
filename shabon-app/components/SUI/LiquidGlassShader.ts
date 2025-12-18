// NOTE: このShaderは将来Skiaを使う時のために保存してある
// 現在はLinearGradientとBlurViewを使用中

// import { Skia } from "@shopify/react-native-skia";

// let _shader: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;

/**
 * iOS 26 Liquid Glass シェーダー（物理ベース実装）
 * 
 * Gemini Pro レポートに基づく実装:
 * 1. 変動的ガウスぼかし（深度依存）
 * 2. 屈折と色収差（Chromatic Aberration）
 * 3. フレネル反射（視線角度依存の反射）
 * 4. 流体ノイズによる動的歪み
 * 5. スペキュラハイライト（鏡面反射）
 */
export const getLiquidGlassShader = () => {
    return null; // Skia未使用
    /* if (!_shader && Skia) {
        try {
            _shader = Skia.RuntimeEffect.Make(`
uniform float iTime;
uniform vec2 iResolution;
uniform float iIsDark;
uniform float iPressed;
uniform float iDepth;  // 仮想深度 (0.0 = 表面, 1.0 = 深い)

// ============================================
// ノイズ関数群（流体シミュレーション用）
// ============================================

// 擬似乱数
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// 2Dノイズ（バイリニア補間）
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // 4隅のランダム値
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    // スムーズ補間
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// FBM（フラクタルブラウン運動）- 流体の複雑な動きを生成
float fbm(vec2 p) {
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

// ============================================
// 光学シミュレーション
// ============================================

// フレネル方程式（視線角度による反射率）
// 浅い角度ほど反射が強くなる
float fresnel(float cosTheta, float n1, float n2) {
    float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

// 屈折ベクトル計算（スネルの法則）
vec2 refract2D(vec2 incident, vec2 normal, float eta) {
    float cosI = -dot(normal, incident);
    float sinT2 = eta * eta * (1.0 - cosI * cosI);
    if (sinT2 > 1.0) return reflect(incident, normal); // 全反射
    float cosT = sqrt(1.0 - sinT2);
    return eta * incident + (eta * cosI - cosT) * normal;
}

// ============================================
// メインレンダリング
// ============================================

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution;
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;
    
    // 正規化された距離（0 = 中心, 1 = エッジ）
    float dist = length(p) * 2.0;
    
    // 時間パラメータ（ゆっくりとした流動）
    float t = iTime * 0.15;
    
    // プレス時の深度変化（押すと背景に近づく感覚）
    float depth = iDepth + iPressed * 0.3;
    
    // ============================================
    // 1. 流体ノイズによる歪み（Liquid 感の核心）
    // ============================================
    
    // ドメインワーピング（複数のノイズを重ねて有機的な動きを生成）
    vec2 q = vec2(fbm(p * 2.0 + t), fbm(p * 2.0 + vec2(5.2, 1.3) + t));
    vec2 r = vec2(fbm(p * 2.0 + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
                  fbm(p * 2.0 + 4.0 * q + vec2(8.3, 2.8) + t * 0.5));
    
    // 最終的な歪み量（深度に応じて変化）
    float distortionStrength = 0.015 * (1.0 + depth * 0.5);
    vec2 distortion = r * distortionStrength;
    
    // ============================================
    // 2. 屈折シミュレーション
    // ============================================
    
    // ガラス表面の法線（球面を仮定）
    vec3 normal3D = normalize(vec3(p * 2.0, sqrt(max(0.0, 1.0 - dist * dist))));
    vec2 normal2D = normal3D.xy;
    
    // 屈折率（ガラス ≈ 1.5）
    float ior = 1.45 + fbm(p * 3.0 + t) * 0.1; // 微細な変動
    
    // 屈折による UV オフセット
    vec2 refractionOffset = refract2D(normalize(p), normal2D, 1.0 / ior) * 0.03 * depth;
    
    // ============================================
    // 3. 色収差（Chromatic Aberration）
    // ============================================
    
    // RGB各チャンネルで微妙に異なる屈折
    float chromaticStrength = 0.008 * (1.0 + dist * 0.5);
    vec2 uvR = uv + distortion + refractionOffset * 1.0;
    vec2 uvG = uv + distortion + refractionOffset * 1.02;
    vec2 uvB = uv + distortion + refractionOffset * 1.04;
    
    // ============================================
    // 4. ベースカラーとガラス質感
    // ============================================
    
    // iOS Blue をベースに
    vec3 glassColorLight = vec3(0.0, 0.478, 1.0);   // #007AFF
    vec3 glassColorDark = vec3(0.25, 0.45, 0.85);
    vec3 baseColor = mix(glassColorLight, glassColorDark, iIsDark);
    
    // 流体ノイズによる色の揺らぎ
    float colorNoise = fbm(p * 4.0 + t * 0.3) * 0.1;
    baseColor += vec3(colorNoise * 0.5, colorNoise * 0.3, colorNoise * 0.1);
    
    // ============================================
    // 5. フレネル反射（エッジで強い反射）
    // ============================================
    
    // 視線ベクトル（画面に垂直）
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float cosTheta = max(0.0, dot(normal3D, viewDir));
    
    // フレネル係数（空気 n=1.0, ガラス n=1.5）
    float fresnelFactor = fresnel(cosTheta, 1.0, 1.5);
    
    // エッジでの白い反射
    vec3 reflectionColor = mix(vec3(0.9), vec3(1.0), iIsDark);
    
    // ============================================
    // 6. スペキュラハイライト（鏡面反射）
    // ============================================
    
    // 光源位置（左上から）
    vec3 lightDir = normalize(vec3(-0.5, -0.7, 1.0));
    vec3 halfVec = normalize(lightDir + viewDir);
    
    // Blinn-Phong スペキュラ
    float specular = pow(max(0.0, dot(normal3D, halfVec)), 64.0);
    
    // 二次ハイライト（より広い範囲）
    float specular2 = pow(max(0.0, dot(normal3D, halfVec)), 16.0) * 0.3;
    
    // 流体ノイズでハイライトを揺らす
    float highlightNoise = fbm(p * 8.0 - t) * 0.3;
    specular *= (1.0 + highlightNoise);
    
    // ============================================
    // 7. 内部グロー（ガラスの厚み感）
    // ============================================
    
    float innerGlow = 1.0 - smoothstep(0.0, 0.7, dist);
    innerGlow *= innerGlow; // より中心に集中
    
    // ============================================
    // 8. 最終合成
    // ============================================
    
    vec3 color = baseColor;
    
    // フレネル反射を加算
    color = mix(color, reflectionColor, fresnelFactor * 0.4);
    
    // スペキュラハイライト
    color += vec3(1.0) * specular * 0.6;
    color += vec3(1.0) * specular2 * 0.3;
    
    // 内部グロー（明るさを加算）
    color = mix(color, vec3(1.0), innerGlow * 0.15);
    
    // ============================================
    // 9. アルファ計算（深度依存の透明度）
    // ============================================
    
    // 基本アルファ（中心は透明、エッジは不透明）
    float alpha = 0.45 + fresnelFactor * 0.35;
    
    // 深度による透明度変化（深いほど不透明）
    alpha *= (0.8 + depth * 0.4);
    
    // 内部グローでアルファを上げる
    alpha += innerGlow * 0.1;
    
    // スペキュラはアルファを上げる
    alpha += specular * 0.2;
    
    // ダークモード調整（やや透明に）
    if (iIsDark > 0.5) {
        alpha *= 0.85;
        color *= 0.95;
    }
    
    // プレス時の暗転
    color *= 1.0 - iPressed * 0.15;
    alpha += iPressed * 0.1;
    
    // ============================================
    // 10. 円形クリッピング（アンチエイリアス）
    // ============================================
    
    float circleMask = 1.0 - smoothstep(0.92, 1.0, dist);
    alpha *= circleMask;
    
    // エッジに微細な白いリム
    float rim = smoothstep(0.85, 0.95, dist) * (1.0 - smoothstep(0.95, 1.0, dist));
    color += vec3(1.0) * rim * 0.3;
    
    return vec4(color * alpha, alpha);
}
\`);
        } catch (e) {
            console.warn("LiquidGlassShader creation failed:", e);
        }
    }
    return _shader; */
};

