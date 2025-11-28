import {
    Canvas,
    Fill,
    Shader,
    useClock,
    vec
} from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { SHABON_SHADER_SKSL } from './ShabonShader';

import { useColorScheme } from '@/hooks/use-color-scheme';

interface ShabonCardProps {
  width?: number | string;
  height?: number;
  children?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  rainbowStrength?: number;
  fillAlpha?: number;
  interactive?: boolean;
}

const SPRING_CONFIG = {
  damping: 10,
  stiffness: 200,
  mass: 0.5,
};

export const ShabonCard: React.FC<ShabonCardProps> = ({
  width,
  height,
  children,
  style,
  contentStyle,
  rainbowStrength = 1.0,
  fillAlpha = 1.0,
  interactive = true,
}) => {
  const time = useClock();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Layout state for shader resolution
  const [layout, setLayout] = React.useState({ 
      width: typeof width === 'number' ? width : 0, 
      height: height || 0 
  });

  // Interaction values
  const scale = useSharedValue(1);
  const skewX = useSharedValue(0);
  const skewY = useSharedValue(0);
  const pressed = useSharedValue(0);

  const gesture = Gesture.Tap()
    .onBegin((e) => {
      if (!interactive) return;
      pressed.value = 1;
      scale.value = withSpring(0.95, SPRING_CONFIG);
      // Random slight skew for organic feel
      const randomSkew = Math.random() * 0.1 - 0.05;
      skewX.value = withSpring(randomSkew, SPRING_CONFIG);
    })
    .onFinalize(() => {
      if (!interactive) return;
      pressed.value = 0;
      scale.value = withSpring(1, SPRING_CONFIG);
      skewX.value = withSpring(0, SPRING_CONFIG);
      skewY.value = withSpring(0, SPRING_CONFIG);
    });

  const animatedStyle = useAnimatedStyle(() => {
    if (!interactive) return {};
    return {
      transform: [
        { scale: scale.value },
        { skewX: `${skewX.value}rad` },
        { skewY: `${skewY.value}rad` },
      ],
    };
  });

  // Calculate roundness based on style for the shader
  const flattenedStyle = StyleSheet.flatten(style || {});
  const borderRadius = typeof flattenedStyle.borderRadius === 'number' ? flattenedStyle.borderRadius : 0;
  const minDim = Math.min(layout.width || 300, layout.height || 200);
  // 0.0 = Rect, 1.0 = Circle (when radius is half of size)
  const calculatedRoundness = Math.min(Math.max((borderRadius * 2) / minDim, 0), 1.0);

  const uniforms = useDerivedValue(() => {
    return {
      iTime: time.value / 1000,
      iResolution: vec(layout.width || 300, layout.height || 200),
      iIsDark: isDark ? 1.0 : 0.0,
      iRoundness: calculatedRoundness, 
      iRainbowStrength: rainbowStrength,
      iFillAlpha: fillAlpha,
    };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View 
        style={[styles.container, { width, height }, style, animatedStyle]} 
        pointerEvents={interactive ? 'auto' : 'box-none'}
        onLayout={(e) => setLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {/* Background Bubble Layer */}
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill>
            <Shader source={SHABON_SHADER_SKSL} uniforms={uniforms} />
          </Fill>
          {/* Optional: Add a subtle border or highlight rect if needed */}
        </Canvas>

        {/* Content Layer */}
        <View style={[styles.content, contentStyle]}>
            {children}
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent', // Let shader handle color
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
