import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface ShabonListProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

const FloatingItem = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Randomize parameters for organic feel
    const duration = 4000 + Math.random() * 2000; // 4s - 6s (Slower)
    const amplitude = 3 + Math.random() * 5; // 3px - 8px (Subtler)
    const delay = Math.random() * 1000;

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, { duration: duration, easing: Easing.inOut(Easing.sin) }),
          withTiming(amplitude, { duration: duration, easing: Easing.inOut(Easing.sin) })
        ),
        -1, // Infinite
        true // Reverse
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <Animated.View style={[styles.itemContainer, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

export const ShabonList: React.FC<ShabonListProps> = ({
  children,
  style,
  contentContainerStyle,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.scrollView, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
    >
      {React.Children.map(children, (child, index) => (
        <FloatingItem key={index} index={index}>
          {child}
        </FloatingItem>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingHorizontal: 20,
    alignItems: 'center', // Center items vertically in the scroll view
    gap: 15,
  },
  itemContainer: {
    // Ensure items have space to float without clipping if parent has overflow hidden
    paddingVertical: 20, 
  },
});
