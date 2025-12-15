import { Skia } from "@shopify/react-native-skia";

let _shader: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;

/**
 * CrystalBubble Shader - Shabon + Liquid Hybrid
 * 
 * Geminiの提案による「宝石のような厚みのあるクリスタルバブル」
 * 
 * 特徴:
 * - 物理ベースの法線マップで立体感
 * - フレネル反射でエッジの光り
 * - スペキュラハイライトで濡れた質感
 * - 屈折で模様が歪む
 */
export const getCrystalBubbleShader = () => {
    if (!_shader && Skia) {
        try {
            _shader = Skia.RuntimeEffect.Make(`
uniform float iTime;
uniform vec2 iResolution;
uniform float iIsDark;
uniform float iRoundness; // 0.0 = Rect, 1.0 = Circle
uniform float iRainbowStrength;

// --- Noise Functions (Shabon由来) ---
vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
    const float K1 = 0.366025404;
    const float K2 = 0.211324865;
    vec2 i = floor(p + (p.x + p.y) * K1);
    vec2 a = p - i + (i.x + i.y) * K2;
    float m = step(a.y, a.x); 
    vec2 o = vec2(m, 1.0 - m);
    vec2 b = a - o + K2;
    vec2 c = a - 1.0 + 2.0 * K2;
    vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
    return dot(n, vec3(70.0));
}

float fbm(vec2 p) {
    float f = 0.0;
    float w = 0.5;
    for (int i = 0; i < 3; i++) {
        f += w * noise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
}

// --- Color Palette (Shabon由来) ---
vec3 palette(float t) {
    // 鮮やかさと深みを両立させたパレット
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

// --- Lighting Physics (LiquidGlass由来) ---
float fresnel(float cosTheta, float n1, float n2) {
    float r0 = pow((n1 - n2) / (n1 + n2), 2.0);
    return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = uv - 0.5;
    
    // アスペクト比補正（正円を保つため）
    // p.x *= iResolution.x / iResolution.y; 
    
    float t = iTime * 0.1;

    // 1. 形状と深度の計算 (Hybrid)
    // スーパー楕円で形状を作りつつ、それを球体の「高さ(z)」に変換する
    float n = mix(12.0, 2.0, iRoundness);
    vec2 p2 = p * 2.0;
    float dist = pow(pow(abs(p2.x), n) + pow(abs(p2.y), n), 1.0/n) * 0.5;
    
    // 外側はクリッピング
    float alpha = 1.0 - smoothstep(0.48, 0.5, dist);
    if (alpha < 0.01) return vec4(0.0);

    // 疑似3D法線（Normal）の生成
    // dist（中心からの距離）を使って、中心が盛り上がっているように見せる
    float z = sqrt(max(0.0, 0.25 - dist * dist)); // 半球の高さ
    vec3 normal = normalize(vec3(p.x, p.y, z * 2.0)); // Zを強調して立体感を出す

    // 2. 屈折と歪み (Liquid要素)
    // 表面のカーブ（normal）に合わせて、内部の模様（uv）を歪ませる
    vec2 refractedUV = uv + normal.xy * 0.15; // 0.15は屈折の強さ
    
    // 3. 流体ノイズ (Shabon要素)
    // 歪ませた座標系を使ってノイズを生成（ガラスの中で液体が動いているように見える）
    vec2 q = vec2(0.);
    q.x = fbm(refractedUV + 0.1 * t);
    q.y = fbm(refractedUV + vec2(1.0) - 0.1 * t);
    
    float f = fbm(refractedUV + q + t);
    
    // 色の決定（虹色 + ダークモード対応）
    vec3 color = palette(f * 0.5 + dist * 2.0 + t);
    color = mix(color, color * 0.5, iIsDark); // ダークモードは少し落ち着かせる

    // 4. ライティング (Liquid要素の真骨頂)
    
    // A. フレネル反射（エッジの光り）
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    float cosTheta = max(0.0, dot(normal, viewDir));
    float fFactor = fresnel(cosTheta, 1.0, 1.3); // 屈折率1.3くらい
    
    // エッジに白い光と虹色を混ぜる
    vec3 rimColor = mix(vec3(1.0), palette(dist * 5.0 + t * 2.0), 0.5);
    color = mix(color, rimColor, fFactor * 0.8);

    // B. スペキュラハイライト（濡れたようなツヤ）
    vec3 lightDir = normalize(vec3(-1.0, -1.0, 1.0)); // 左上からの光
    vec3 halfVec = normalize(lightDir + viewDir);
    float specular = pow(max(0.0, dot(normal, halfVec)), 40.0); // 40.0はツヤの鋭さ
    
    // ハイライトを加算（虹色の上から白を乗せる）
    color += vec3(1.0) * specular * 0.8;

    // 5. 最終合成
    // 透明感の調整：中心は少し透けさせて、エッジは濃くする
    float opacity = 0.3 + fFactor * 0.7; // ベース透明度0.3
    opacity = clamp(opacity * iRainbowStrength, 0.0, 1.0);
    
    // アルファチャンネルにも形状マスクを適用
    return vec4(color * opacity * alpha, opacity * alpha);
}
`);
        } catch (e) { 
            console.warn('CrystalBubble Shader compilation failed:', e); 
        }
    }
    return _shader;
};

