import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { ensureISpySeeded, getRandomISpyItem, deleteTable } from '../src/iSpyDb';
import { speakText } from './TextToSpeech';
import { voiceBus } from '../src/voiceBus';

const ISpyGame: React.FC = () => {
  const dbRef = useRef<any>(null);
  const [lastHeard, setLastHeard] = useState('');
  const [lastISpy, setLastISpy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        dbRef.current = await ensureISpySeeded();
      } catch (e) {
        console.warn('Failed to init iSpy DB:', e);
      }
    })();
    const unsub = voiceBus.onResult(handleResult);
    return () => {
      unsub();
    };
  }, []);

  const handleResult = async (text: string) => {
    setLastHeard(text);
    // Look for the phrase "i spy" anywhere in the sentence
    if (/\bi\s*spy\b/i.test(text)) {
      try {
        if (!dbRef.current) {
          dbRef.current = await ensureISpySeeded();
        }
        const item = await getRandomISpyItem(dbRef.current);
        if (item) {
          setLastISpy(item);
          await speakText(`Okay, let's play! I spy ${item}`);
        }
      } catch (e) {
        console.warn('Failed to fetch/speak iSpy item:', e);
      }
    }
  };

  const handleResetDb = async () => {
    try {
      if (!dbRef.current) {
        dbRef.current = await ensureISpySeeded();
      }
      await deleteTable(dbRef.current);
      // Recreate and reseed for a clean slate
      dbRef.current = await ensureISpySeeded();
      setLastISpy(null);
      setLastHeard('');
    } catch (e) {
      console.warn('Failed to reset iSpy DB:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I Spy (Voice)</Text>
      <Text style={styles.caption}>Say "Hey Game Box" and then something with "I spy"</Text>
      <View style={styles.actionsRow}>
        <Button title="Reset I Spy DB" onPress={handleResetDb} />
      </View>

      {lastHeard ? (
        <View style={styles.card}><Text style={styles.label}>Heard:</Text><Text style={styles.value}>{lastHeard}</Text></View>
      ) : null}

      {lastISpy ? (
        <View style={styles.card}><Text style={styles.label}>I Spy item:</Text><Text style={styles.value}>{lastISpy}</Text></View>
      ) : null}
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 28 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  caption: { color: '#666', marginBottom: 16 },
  card: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 12 },
  label: { fontSize: 12, color: '#555', marginBottom: 4 },
  value: { fontSize: 16 },
  actionsRow: { marginBottom: 12, alignSelf: 'flex-start' },
});

export default ISpyGame;
