import React from 'react';
import {
  StatusBar,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import VoiceRecog from './components/VoiceRecog';
import TextToSpeech from './components/TextToSpeech';
import ISpyGame from './components/ISpyGame';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{flex: 1}}>
        <VoiceRecog />
        <ISpyGame />
        <TextToSpeech />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
