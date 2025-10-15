import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type Props = { onPlay: () => void };

const TitleScreen: React.FC<Props> = ({ onPlay }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Road Trip Game Box</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.playButton} onPress={onPlay}>
        <Text style={styles.playText}>Play</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  title: {
    position: 'absolute',
    top: 40,
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  playButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  playText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default TitleScreen;
