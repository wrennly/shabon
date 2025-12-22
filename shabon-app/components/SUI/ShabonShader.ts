import { Skia } from "@shopify/react-native-skia";

let _shader: ReturnType<typeof Skia.RuntimeEffect.Make> | null = null;

export const getShabonShader = () => {
    if (!_shader && Skia) {
        console.log('[ShabonShader] Attempting to create shader...');
        try {
            _shader = Skia.RuntimeEffect.Make(`
uniform float iTime;
uniform vec2 iResolution;
uniform float iIsDark; // 0.0 = Light, 1.0 = Dark
uniform float iRoundness; // 0.0 = Rect, 1.0 = Circle
uniform float iRainbowStrength; // 0.0 = No Rainbow, 1.0 = Full Rainbow
uniform float iFillAlpha; // 0.0 = Transparent, 1.0 = Opaque

// --- Noise Functions ---
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
    for (int i = 0; i < 2; i++) { // Reduced from 3 to 2 for performance
        f += w * noise(p);
        p *= 2.0;
        w *= 0.5;
    }
    return f;
}

// --- Palette for Iridescence ---
// Softer, more pastel palette for Light Mode
vec3 paletteLight(float t) {
    // Much lighter, more pastel colors
    vec3 a = vec3(0.9, 0.9, 0.95); 
    vec3 b = vec3(0.1, 0.1, 0.1); // Reduced saturation significantly
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67); 
    return a + b * cos(6.28318 * (c * t + d));
}

// Soft, dreamy palette for Dark Mode
vec3 paletteDark(float t) {
    // Much softer, pastel-like colors for dark mode
    // Inspired by aurora and night sky
    vec3 a = vec3(0.5, 0.5, 0.6);   // Lighter base (more visible)
    vec3 b = vec3(0.15, 0.15, 0.2); // Very low saturation (soft)
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

vec4 main(vec2 fragCoord) {
    vec2 uv = fragCoord.xy / max(iResolution.xy, vec2(1.0));
    vec2 p = uv - 0.5; // Center coordinates for Fresnel
    
    // Time factor
    float t = iTime * 0.05; // Much slower movement (was 0.15)
    
    // 1. Fluid Surface Movement (Domain Warping)
    vec2 q = vec2(0.);
    q.x = fbm(uv + 0.1 * t);
    q.y = fbm(uv + vec2(1.0) - 0.1 * t);

    vec2 r = vec2(0.);
    r.x = fbm(uv + 1.0 * q + vec2(1.7, 9.2) + 0.15 * t);
    r.y = fbm(uv + 1.0 * q + vec2(8.3, 2.8) + 0.126 * t);

    float f = fbm(uv + r); // The main noise pattern

    // 2. Iridescence (Rainbow Effect)
    // Use length(p) to create concentric rainbow patterns near edges
    float rainbowInput = f * 0.4 + length(p) * 4.0 + t;
    vec3 colorLight = paletteLight(rainbowInput);
    vec3 colorDark = paletteDark(rainbowInput);
    
    // ダークモードはよりパステルに（白を混ぜる）
    colorDark = mix(colorDark, vec3(0.85), 0.35);
    
    vec3 rainbow = mix(colorLight, colorDark, iIsDark);
    
    // 3. Fresnel / Edge Glow (The "Bubble" 3D look)
    
    // Superellipse approximation for shape distance
    // This ensures the rainbow follows the shape (Rect vs Circle) uniformly
    // Map iRoundness (0=Rect, 1=Circle) to exponent n (High=Rect, 2=Circle)
    float n = mix(12.0, 2.0, iRoundness);
    
    // Normalize p to -1..1 for easier power math
    vec2 p2 = p * 2.0;
    
    // Calculate distance using superellipse formula: (x^n + y^n)^(1/n)
    // This creates contours that match the rounded rectangle shape
    float dist = pow(pow(abs(p2.x), n) + pow(abs(p2.y), n), 1.0/n) * 0.5;
    
    // Rainbow visibility mask
    // Modulate start based on diagonal to make Bottom-Right significantly wider
    // (uv.x + uv.y) / 2.0 ranges from 0.0 (Top-Left) to 1.0 (Bottom-Right)
    float diagonal = (uv.x + uv.y) * 0.5;
    // Top-Left: 0 (中心まで到達), Bottom-Right: -1.5 (Much wider, reaches center and beyond)
    float rainbowStart = mix(0.2, -1.2, diagonal);
    
    // Apply iRainbowStrength to control visibility
    // smoothstepの範囲を広げて中心部分もカバー
    float rainbowMask = smoothstep(rainbowStart, 0.5, dist) * iRainbowStrength;

    // 3D Lighting Effect: Reduce rainbow in Top-Left to simulate light source reflection
    // Top-Left is roughly angle -2.35 rad (-135 deg) in atan2(y, x)
    // We want to mask out the rainbow in that direction
    float angle = atan(p.y, p.x);
    // Create a mask that is 0.0 at top-left and 1.0 elsewhere
    // Peak reduction at -2.35 rad. Width of reduction controlled by smoothstep.
    // We use cos(angle - targetAngle) to get a smooth gradient around the circle
    float lightingFactor = cos(angle - (-2.35)); 
    // Map -1..1 to 0..1, but we want the "back" side (opposite to light) to be full rainbow
    // and the "light" side (top-left) to be reduced.
    // lightingFactor is 1.0 at -2.35 (Top-Left). We want to REDUCE rainbow there.
    // So we invert it: 1.0 - lightingFactor (normalized)
    
    // Simpler approach: Use dot product with light direction vector
    vec2 lightDir = normalize(vec2(-1.0, -1.0)); // Top-Left direction
    float lightDot = dot(normalize(p), lightDir); // 1.0 at Top-Left, -1.0 at Bottom-Right
    
    // Mask: 0.1 (中心部分も虹を見せる) at Top-Left, 1.0 (full rainbow) at Bottom-Right
    // lightDot is 1.0 at Top-Left, -1.0 at Bottom-Right.
    // We want 1.0 (Full) when lightDot is low (Bottom-Right).
    // smoothstep(-0.2, 0.8, lightDot) -> 0.0 at Bottom-Right, 1.0 at Top-Left.
    // Invert it to get the mask we want.
    float lightingMask = 1.0 - smoothstep(-0.2, 0.8, lightDot); 
    // Clamp to ensure we don't go below a minimum visibility (0.4に上げて中心部分も色を乗せる)
    lightingMask = max(0.2, lightingMask);
    
    rainbowMask *= lightingMask;
    
    // Sharper edge for opacity/white glow
    
    // Sharper edge for opacity/white glow
    // Reduced power for softer edge
    float fresnel = pow(smoothstep(0.4, 0.5, dist), 2.0); 
    
    // 4. Specular Highlights (Gloss)
    float highlight = smoothstep(0.65, 0.7, f) * 0.5; // Softer highlight
    
    // 5. Top-Left White Highlight (新規追加)
    // 左上に白いハイライトを追加
    vec2 highlightPos = vec2(-0.25, -0.25); // 左上の位置
    float highlightDist = length(p - highlightPos);
    float topLeftHighlight = smoothstep(0.3, 0.0, highlightDist) * 0.6; // 0.6は強度
    
    // 6. Edge Glow (立体感のある縁の光 - LiquidGlass風)
    // ダークモードは縁を狭く
    float edgeInner = mix(0.42, 0.45, iIsDark); // ダークモードは内側を狭く
    float edgeBase = smoothstep(edgeInner, 0.5, dist) * smoothstep(0.5, edgeInner, dist);
    
    // 既存のlightDotを再利用（133-134行目で定義済み）
    // lightDot: 1.0 (左上), -1.0 (右下)
    
    // 左上と右下で強い光沢（フレネル風）
    float topLeftGlow = smoothstep(-0.3, 1.0, lightDot);      // 左上が強い
    float bottomRightGlow = smoothstep(-1.0, 0.3, -lightDot); // 右下が強い
    
    // 合成：左上と右下で縁が厚く光る
    float edgeGlow = edgeBase * (topLeftGlow * 0.8 + bottomRightGlow * 0.6);
    // ダークモードは縁の強度を下げる
    float edgeStrength = mix(1.2, 0.7, iIsDark);
    edgeGlow = pow(edgeGlow, 0.5) * edgeStrength;
    
    // --- Composition ---
    
    // Center color: Light Grey for Light mode (白いハイライトを目立たせる), Transparent for Dark mode
    vec3 centerColor = mix(vec3(0.88), vec3(0.0), iIsDark);
    
    // Apply rainbow based on rainbowMask
    // Reduced mix strength to make rainbow more subtle (was 0.9)
    vec3 baseColor = mix(centerColor, rainbow, rainbowMask * 0.6);
    
    // 7. Rainbow Depth Effect (虹に立体感を追加)
    // 虹のエリアにグラデーションを追加して奥行き感を出す
    float rainbowDepth = smoothstep(0.3, 0.5, dist) * rainbowMask;
    
    // 虹のエリアに微細なスペキュラハイライト（光沢感）
    vec3 rainbowLightDir = normalize(vec3(-0.7, -0.7, 1.0)); // 左上からの光
    vec3 normal3D = normalize(vec3(p * 2.0, sqrt(max(0.0, 1.0 - dist * dist))));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    vec3 halfVec = normalize(rainbowLightDir + viewDir);
    float rainbowSpecular = pow(max(0.0, dot(normal3D, halfVec)), 32.0) * rainbowMask;
    
    // 虹に白いハイライトを加算（ガラスのような光沢）
    // ダークモードは光沢を減らす
    float specularStrength = mix(0.7, 0.01, iIsDark);
    baseColor += vec3(1.0) * rainbowSpecular * specularStrength;
    
    // 虹のエリアに深度グラデーション（明るさの変化）
    baseColor = mix(baseColor, baseColor * 1.15, rainbowDepth * 0.3);
    
    // Add top-left white highlight
    // ダークモードは左上ハイライトも抑える
    float highlightStrength = mix(1.0, 0.4, iIsDark);
    baseColor = mix(baseColor, vec3(1.0), topLeftHighlight * highlightStrength);
    
    // Add edge glow (立体感のある縁の光)
    // ダークモードは縁の光沢を抑える
    float edgeGlowStrength = mix(0.7, 0.25, iIsDark);
    baseColor = mix(baseColor, vec3(1.0), edgeGlow * edgeGlowStrength);
    
    // --- Transparency (Alpha) ---
    
    float alpha = 0.0;
    
    // Very transparent body
    // Scaled by iFillAlpha to allow fully transparent centers
    // Reduced base opacity for better transparency (was 0.15)
    alpha += (0.05 + f * 0.05) * iFillAlpha; 
    
    // Rainbow visibility: If there is a rainbow, we need alpha to show it!
    // Reduced slightly to make it less intense (was 0.2)
    alpha += rainbowMask * 0.15;
    
    // Edges are visible but translucent
    // Scale by max(iRainbowStrength, iFillAlpha) to ensure it disappears when both are 0
    alpha += fresnel * 0.4 * clamp(iRainbowStrength + iFillAlpha, 0.0, 1.0);
    
    // Highlights
    // Scale highlight by iFillAlpha to remove "white part" when transparent
    alpha += highlight * 0.6 * iFillAlpha;
    
    // Top-left highlight alpha
    alpha += topLeftHighlight * 0.5 * clamp(iRainbowStrength + iFillAlpha, 0.0, 1.0);
    
    // Edge glow alpha (縁の光の透明度)
    alpha += edgeGlow * 0.6;
    
    // Dark mode adjustment: Make it slightly more visible/glowing
    // Reduced from 0.1 to 0.05 to reduce glare
    alpha += iIsDark * 0.05 * f * iFillAlpha; 
    
    // Light mode adjustment: Make the body slightly more opaque to stand out
    alpha += (1.0 - iIsDark) * 0.05 * iFillAlpha;

    // Clamp alpha
    alpha = clamp(alpha, 0.0, 1.0);
    
    // --- Final Color Mixing ---
    
    vec3 finalColor = baseColor;
    
    // Add extra white glow on the very edge and highlights
    // Reduced intensity to let rainbow show through (was 0.2)
    finalColor += vec3(1.0) * fresnel * 0.15;
    // Only add highlight color if we are showing highlights (based on fill alpha)
    finalColor += vec3(1.0) * highlight * iFillAlpha;
    
    
    return vec4(finalColor * alpha, alpha);
}
`);
            console.log('[ShabonShader] ✅ Shader created successfully!');
        } catch (e) {
            console.warn("[ShabonShader] ❌ Skia RuntimeEffect creation failed:", e);
        }
    } else if (!Skia) {
        console.warn("[ShabonShader] ⚠️ Skia is not available!");
    }
    return _shader;
};
