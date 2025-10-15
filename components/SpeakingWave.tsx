import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Tts from 'react-native-tts';

const BAR_COUNT = 5;

const SpeakingWave: React.FC = () => {
  const [speaking, setSpeaking] = useState(false);
  const anims = useRef(Array.from({ length: BAR_COUNT }, () => new Animated.Value(0))).current;

  useEffect(() => {
    const onStart = () => setSpeaking(true);
    const onFinish = () => setSpeaking(false);
    const subStart = Tts.addEventListener('tts-start', onStart);
    const subFinish = Tts.addEventListener('tts-finish', onFinish);
    const subCancel = Tts.addEventListener('tts-cancel', onFinish);
    return () => {
      // Newer react-native-tts returns subscriptions with remove()
      // Fall back to removeEventListener only if needed
      // @ts-ignore
      if (subStart?.remove) subStart.remove();
      // @ts-ignore
      if (subFinish?.remove) subFinish.remove();
      // @ts-ignore
      if (subCancel?.remove) subCancel.remove();
      // @ts-ignore
      if (!subStart?.remove) Tts.removeEventListener?.('tts-start', onStart);
      // @ts-ignore
      if (!subFinish?.remove) Tts.removeEventListener?.('tts-finish', onFinish);
      // @ts-ignore
      if (!subCancel?.remove) Tts.removeEventListener?.('tts-cancel', onFinish);
    };
  }, []);

  useEffect(() => {
    if (speaking) {
      const loops = anims.map((v, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 300 + i * 40, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
            Animated.timing(v, { toValue: 0, duration: 300 + i * 40, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          ])
        )
      );
      loops.forEach((l) => l.start());
      return () => loops.forEach((l) => l.stop());
    } else {
      // Ensure bars return to smallest size when TTS stops
      anims.forEach((v, i) => {
        Animated.timing(v, { toValue: 0, duration: 150 + i * 20, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
      });
    }
  }, [speaking, anims]);

  return (
    <View style={styles.container}>
      {anims.map((v, idx) => {
        const scaleY = v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
        return <Animated.View key={idx} style={[styles.bar, { transform: [{ scaleY }] }]} />;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingVertical: 10 },
  bar: { width: 10, height: 40, backgroundColor: '#10B981', borderRadius: 5, marginHorizontal: 4 },
});

export default SpeakingWave;
