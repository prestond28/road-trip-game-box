/**
 * Simple Voice Test Component
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';

const VoiceTest = () => {
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState('');
  const [Voice, setVoice] = useState<any>(null);

  useEffect(() => {
    const loadVoice = async () => {
      try {
        const { default: Voice } = await import('@react-native-voice/voice');
        console.log('Voice module loaded:', Voice);
        
        // Check if the Voice module has the expected methods
        if (Voice && typeof Voice.start === 'function') {
          console.log('Voice.start method found');
          setVoice(Voice);
        } else {
          console.log('Voice.start method not found, checking alternative methods');
          console.log('Available methods:', Object.getOwnPropertyNames(Voice));
          console.log('Voice prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(Voice)));
          setVoice(Voice);
        }
      } catch (error) {
        console.error('Failed to load Voice module:', error);
        Alert.alert('Error', 'Failed to load voice recognition module');
      }
    };

    loadVoice();
  }, []);

  const startListening = async () => {
    if (!Voice) {
      Alert.alert('Error', 'Voice module not loaded');
      return;
    }

    try {
      console.log('Voice object:', Voice);
      console.log('Voice methods:', Object.keys(Voice));
      
      // Set up basic event handlers
      Voice.onSpeechResults = (e: any) => {
        console.log('Speech results:', e);
        setResult(e.value?.[0] || '');
      };

      Voice.onSpeechError = (e: any) => {
        console.log('Speech error:', e);
        setIsListening(false);
        Alert.alert('Error', 'Speech recognition failed');
      };

      Voice.onSpeechStart = () => {
        console.log('Speech started');
        setIsListening(true);
      };

      Voice.onSpeechEnd = () => {
        console.log('Speech ended');
        setIsListening(false);
      };

      Voice.onSpeechPartialResults = (e: any) => {
        console.log('Partial results:', e);
        setResult(e.value?.[0] || '');
      };

      await Voice.start('en-US');
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      Alert.alert('Error', 'Failed to start voice recognition: ' + error);
    }
  };

  const stopListening = async () => {
    if (!Voice) return;
    
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Test</Text>
      
      <TouchableOpacity
        style={[styles.button, isListening ? styles.stopButton : styles.startButton]}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.buttonText}>
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </Text>
      </TouchableOpacity>

      {result ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>Result: {result}</Text>
        </View>
      ) : null}

      <Text style={styles.status}>
        Voice Module: {Voice ? 'Loaded' : 'Not Loaded'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resultContainer: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 16,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
});

export default VoiceTest;