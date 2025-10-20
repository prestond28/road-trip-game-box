import React, { useState } from 'react';
import { StatusBar, useColorScheme, View, StyleSheet } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import VoiceRecog from './components/VoiceRecog';
import TextToSpeech from './components/TextToSpeech';
import { speakText } from './components/TextToSpeech';
import ISpyGame from './components/ISpyGame';
import TitleScreen from './components/TitleScreen';
import SpeakingWave from './components/SpeakingWave';
import { voiceBus } from './src/voiceBus';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [started, setStarted] = useState(false);

  const handlePlay = () => {
    // Move to the gameplay UI and then speak
    setStarted(true);
    setTimeout(async () => {
      await speakText('Hello there! Welcome to road trip game box. Do you already know how to play?');

  voiceBus.setAwaitingAnswer(true);
      voiceBus.emitRequestListen();
      // Listen for a response; if user says "no", tell how to play
      let timer: any = null;
      let unsub: (() => void) | null = null;
      let unsubListen: (() => void) | null = null;
      const cleanupReplyWait = () => {
        if (unsub) { try { unsub(); } catch {} unsub = null; }
        if (unsubListen) { try { unsubListen(); } catch {} unsubListen = null; }
        if (timer) { try { clearTimeout(timer); } catch {} timer = null; }
        voiceBus.setAwaitingAnswer(false);
      };
      let spoken = false;
      const speakFollowup = () => {
        if (spoken) return;
        spoken = true;
        cleanupReplyWait();
        setTimeout(() => { speakText("Okay, here's how to play. Whenever you want to play I spy, just say 'Hey Game Box'. Wait for the beep, and then say 'play I spy'. I will give all the players one object to find, and who ever sees it first wins! If you want a new object, just say 'hey game box' again, and then say 'play I spy'."); }, 1000);
      };
      unsub = voiceBus.onResult((text) => {
        const norm = String(text).toLowerCase().trim();
        if (/^no[.!?]?$/i.test(norm)) {
          // Wait until listening turns false to avoid overlap
          let heardListeningChange = false;
          unsubListen = voiceBus.onListening((listening) => {
            heardListeningChange = true;
            if (!listening) speakFollowup();
          });
          // Fallback in case no listening change arrives
          setTimeout(() => { if (!heardListeningChange) speakFollowup(); }, 1500);
        } else {
          // Any other response: just stop waiting
          cleanupReplyWait();
        }
      });
      timer = setTimeout(() => { cleanupReplyWait(); }, 12000); // stop listening for a reply after 12s
    }, 250);
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={{ flex: 1 }}>
        {!started ? (
          <TitleScreen onPlay={handlePlay} />
        ) : (
          <View style={styles.content}>
            <VoiceRecog />
            <ISpyGame headless />
            <TextToSpeech headless />
            <View style={styles.waveContainer}>
              <SpeakingWave />
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
});
