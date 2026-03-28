import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import LottieView from 'lottie-react-native';

interface AnimatedSplashProps {
  onAnimationFinish?: () => void;
  isLoading?: boolean;
}

export const AnimatedSplash: React.FC<AnimatedSplashProps> = ({
  onAnimationFinish,
  isLoading = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    // ローディング完了かつアニメーション完了したらフェードアウト
    if (!isLoading && animationFinished) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onAnimationFinish?.();
      });
    }
  }, [isLoading, animationFinished]);

  const handleAnimationFinish = () => {
    setAnimationFinished(true);
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.logoContainer}>
        <LottieView
          source={require('../assets/animations/logo.json')}
          autoPlay
          loop={false}
          onAnimationFinish={handleAnimationFinish}
          style={styles.lottie}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: 200,
    height: 200,
  },
});

export default AnimatedSplash;

