/**
 * Voice Recognition Demo
 * React Native Voice Recognition App
 */

import React from 'react';
import {
  StatusBar,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import VoiceTest from './VoiceTest';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{flex: 1}}>
        <VoiceTest />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
