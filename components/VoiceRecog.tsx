import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Alert, Vibration } from 'react-native';
import { PorcupineManager } from '@picovoice/porcupine-react-native';
import Sound from 'react-native-sound';
import { PORCUPINE_ACCESS_KEY } from '@env';
import { voiceBus } from '../src/voiceBus';
import Tts from 'react-native-tts';

type VoiceRecogProps = {
  onResult?: (finalText: string) => void;
  onWake?: () => void;
  onListeningChange?: (listening: boolean) => void;
  language?: string; // e.g., 'en-US'
  enableBeep?: boolean; // play beep on speech start
};

const VoiceRecog: React.FC<VoiceRecogProps> = ({
  onResult,
  onWake,
  onListeningChange,
  language = 'en-US',
  enableBeep = true,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [result, setResult] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [Voice, setVoice] = useState<any>(null);
  const porcupineRef = useRef<PorcupineManager | null>(null);
  const porcupineActiveRef = useRef(false);
  const porcupinePausedByTTSRef = useRef(false);
  const isCleaningUpRef = useRef(false);
  const hasPlayedBeepRef = useRef(false);
  const voiceSessionActiveRef = useRef(false);
  const sessionTimeoutRef = useRef<any>(null);
  const lastResultRef = useRef<string>('');
  const emittedThisSessionRef = useRef(false);
  const [needsCleanup, setNeedsCleanup] = useState(false);
  const sawSpeechEndRef = useRef(false);
  const handlersRegisteredRef = useRef(false);
  const cleanupRequestedRef = useRef(false);
  const ttsClearTimerRef = useRef<any>(null);
  const ttsActiveRef = useRef(false);

  const requestCleanup = () => {
    if (!cleanupRequestedRef.current) {
      cleanupRequestedRef.current = true;
      // Immediately mark session inactive to halt UI updates
      voiceSessionActiveRef.current = false;
      setNeedsCleanup(true);
    }
  };

  const startCleanup = () => {
    if (isCleaningUpRef.current) {
      console.log('Cleanup already in progress, skipping...');
      return;
    }
    console.log('STARTING CLEANUP PROCESS...');
    isCleaningUpRef.current = true;
    voiceSessionActiveRef.current = false;
    handlersRegisteredRef.current = false;
  // keep cleanupRequestedRef true until teardown completes
    
    try {
      setIsListening(false);
      onListeningChange?.(false);
      voiceBus.emitListening(false);
    } catch (e) {
      console.error('Error setting isListening to false during cleanup:', e);
    }

    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = null;
    }

    // Immediately detach handlers to prevent re-entrancy during teardown
    try {
      if (Voice) {
        Voice.onSpeechResults = undefined as any;
        Voice.onSpeechPartialResults = undefined as any;
        Voice.onSpeechError = undefined as any;
        Voice.onSpeechStart = undefined as any;
        Voice.onSpeechEnd = undefined as any;
        if (typeof Voice.removeAllListeners === 'function') {
          Voice.removeAllListeners();
        }
      }
    } catch (e) {
      console.log('Detaching handlers threw, continuing...');
    }

    // Strategy:
    // - If we already received onSpeechEnd, avoid calling stop/destroy (these can crash after end)
    // - Else, use cancel/destroy with spacing.
    if (sawSpeechEndRef.current) {
      console.log('Speech already ended; skipping Voice.stop/destroy to avoid native crash.');
      sawSpeechEndRef.current = false; // reset for next session
      // Try a safe cancel to hint the service to release mic (should be no-op post-end)
      setTimeout(() => {
        try { if (Voice?.cancel) Voice.cancel().catch(() => {}); } catch {}
      }, 100);
      // Longer delay before restarting Porcupine to avoid mic contention
      setTimeout(() => {
        console.log('Restarting Porcupine after safe delay (post-end)...');
        if (ttsActiveRef.current) {
          console.log('TTS active during cleanup; deferring Porcupine restart.');
          porcupinePausedByTTSRef.current = true;
          isCleaningUpRef.current = false;
          cleanupRequestedRef.current = false;
          return;
        }
        if (porcupineRef.current) {
          porcupineRef.current
            .start()
            .then(() => {
              console.log('Porcupine restarted successfully.');
              porcupineActiveRef.current = true;
              isCleaningUpRef.current = false;
              cleanupRequestedRef.current = false;
            })
            .catch((error: any) => {
              console.error('Error restarting Porcupine:', error);
              isCleaningUpRef.current = false;
              cleanupRequestedRef.current = false;
            });
        } else {
          isCleaningUpRef.current = false;
          cleanupRequestedRef.current = false;
        }
      }, 2000);
      return;
    }

    // If we didn't get onSpeechEnd, cancel/destroy with spacing
    setTimeout(() => {
      console.log('Teardown path: Step 1 - cancel');
      try { if (Voice?.cancel) Voice.cancel().catch(() => {}); } catch {}
      setTimeout(() => {
        console.log('Teardown path: Step 2 - destroy');
        try { if (Voice?.destroy) Voice.destroy().catch(() => {}); } catch {}
        setTimeout(() => {
          console.log('Teardown path: Step 3 - restart Porcupine');
          if (ttsActiveRef.current) {
            console.log('TTS active during cleanup; deferring Porcupine restart.');
            porcupinePausedByTTSRef.current = true;
            isCleaningUpRef.current = false;
            cleanupRequestedRef.current = false;
            return;
          }
          if (porcupineRef.current) {
            porcupineRef.current
              .start()
              .then(() => {
                console.log('Porcupine restarted successfully.');
                porcupineActiveRef.current = true;
                isCleaningUpRef.current = false;
                cleanupRequestedRef.current = false;
              })
              .catch((error: any) => {
                console.error('Error restarting Porcupine:', error);
                isCleaningUpRef.current = false;
                cleanupRequestedRef.current = false;
              });
          } else {
            isCleaningUpRef.current = false;
            cleanupRequestedRef.current = false;
          }
        }, 1200);
      }, 800);
    }, 400);
  };

  // Run cleanup outside of Voice callbacks to avoid native race conditions
  useEffect(() => {
    if (needsCleanup) {
      console.log('Cleanup requested via state trigger. Running startCleanup()...');
      // Let any current event callback unwind before tearing down native modules
      setTimeout(() => startCleanup(), 0);
      setNeedsCleanup(false);
    }
  }, [needsCleanup]);

  // Audio feedback function using custom beep.mp3
  const playBeep = () => {
    try {
      // Vibrate with a distinctive pattern for tactile feedback
      Vibration.vibrate([100, 50, 100]);
      // Set audio category for playback
      Sound.setCategory('Playback', true); // Allow mixing with other sounds
      // Load and play the custom beep.mp3 from bundle (Android raw)
      const beepSound = new Sound('beep.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.log('Failed to load beep.mp3 from bundle:', error);
          // Fallback to system sound if custom beep fails
          const fallbackSound = new Sound('/system/media/audio/ui/camera_click.ogg', '', (fallbackErr) => {
            if (fallbackErr) {
              console.log('Fallback system sound also failed, using vibration only');
            } else {
              fallbackSound.setVolume(0.7);
              fallbackSound.play((success) => {
                console.log(success ? 'Fallback sound played' : 'Fallback sound failed');
                fallbackSound.release();
              });
            }
          });
        } else {
          beepSound.setVolume(0.8);
          beepSound.play((success) => {
            if (success) {
              console.log('Custom beep.mp3 played successfully');
            } else {
              console.log('Custom beep.mp3 playback failed');
            }
            beepSound.release();
          });
        }
      });
    } catch (error) {
      console.error('Error with audio feedback:', error);
      // Fallback to just vibration
      Vibration.vibrate([100, 50, 100]);
    }
  };

  // Track TTS speaking state to hide status while TTS is active
  useEffect(() => {
    const onStart = () => {
      // Mark TTS active and ensure nothing else is listening
      ttsActiveRef.current = true;
      setIsSpeaking(true);
      // If somehow a recognition session is active, end it to avoid recording TTS
      if (isListening || voiceSessionActiveRef.current) {
        try { requestCleanup(); } catch {}
      }
      // Pause Porcupine so wake word won't trigger from our own TTS
      try {
        if (porcupineRef.current && porcupineActiveRef.current) {
          porcupineRef.current.stop().catch(() => {});
          porcupineActiveRef.current = false;
          porcupinePausedByTTSRef.current = true;
        }
      } catch {}
      // Always clear the quoted result with a small delay
      try { if (ttsClearTimerRef.current) { clearTimeout(ttsClearTimerRef.current); ttsClearTimerRef.current = null; } } catch {}
      const last = (lastResultRef.current || result || '').toString();
      const delay = last.trim().length > 0 ? 1200 : 0;
      if (delay > 0) {
        ttsClearTimerRef.current = setTimeout(() => {
          setResult('');
          try { lastResultRef.current = ''; } catch {}
          ttsClearTimerRef.current = null;
        }, delay);
      } else {
        setResult('');
        try { lastResultRef.current = ''; } catch {}
      }
    };
    const onEnd = () => {
      setIsSpeaking(false);
      ttsActiveRef.current = false;
      // Resume Porcupine only if we paused it for TTS and no voice session is active
      try {
        if (porcupineRef.current && porcupinePausedByTTSRef.current && !voiceSessionActiveRef.current && !isListening && !isCleaningUpRef.current) {
          porcupineRef.current
            .start()
            .then(() => {
              porcupineActiveRef.current = true;
              porcupinePausedByTTSRef.current = false;
            })
            .catch(() => {
              porcupinePausedByTTSRef.current = false;
            });
        }
      } catch {}
      try { if (ttsClearTimerRef.current) { clearTimeout(ttsClearTimerRef.current); ttsClearTimerRef.current = null; } } catch {}
      if ((lastResultRef.current || '').trim().length > 0) {
        setResult('');
        try { lastResultRef.current = ''; } catch {}
      }
    };
    Tts.addEventListener('tts-start', onStart);
    Tts.addEventListener('tts-finish', onEnd);
    Tts.addEventListener('tts-cancel', onEnd);
    return () => {
      try { if (ttsClearTimerRef.current) { clearTimeout(ttsClearTimerRef.current); ttsClearTimerRef.current = null; } } catch {}
      try { (Tts as any).removeEventListener('tts-start', onStart); } catch {}
      try { (Tts as any).removeEventListener('tts-finish', onEnd); } catch {}
      try { (Tts as any).removeEventListener('tts-cancel', onEnd); } catch {}
    };
  }, [isListening, result]);

  // Partial results handler, performs early detection
  const handlePartialResults = (e: any) => {
    if (cleanupRequestedRef.current || isCleaningUpRef.current || !voiceSessionActiveRef.current) return;
    const alts: string[] = Array.isArray(e?.value) ? e.value : [];
    if (alts.length === 0) return;
    const primary = String(alts[0] ?? '').trim();
    if (primary && primary !== lastResultRef.current) {
      lastResultRef.current = primary;
      setResult(primary);
    }
    try {
      // Early yes/no detection when awaiting an answer
      if (typeof voiceBus.isAwaitingAnswer === 'function' && voiceBus.isAwaitingAnswer()) {
        const matchYN = alts.some((v) => /\b(yes|yeah|yep|yup|no|nope|nah)\b/i.test(String(v)));
        if (matchYN && !emittedThisSessionRef.current) {
          emittedThisSessionRef.current = true;
          const emitText = primary || String(alts.find(Boolean) || '').trim();
          try { onResult?.(emitText); } catch {}
          try { voiceBus.emitResult(emitText); } catch {}
        }
      }
    } catch {}
    try {
      // Early iSpy detection
      const hasISpy = alts.some((v) => String(v).toLowerCase().replace(/[^a-z]/g, '').includes('ispy'));
      if (hasISpy && !emittedThisSessionRef.current) {
        emittedThisSessionRef.current = true;
        const emitText = primary || String(alts.find(Boolean) || '').trim();
        try { onResult?.(emitText); } catch {}
        try { voiceBus.emitResult(emitText); } catch {}
      }
    } catch {}
  };

  useEffect(() => {
    const loadVoice = async () => {
      try {
        const { default: Voice } = await import('@react-native-voice/voice');
        console.log('Voice module loaded:', Voice);
        
        setVoice(Voice);
        
      } catch (error) {
        console.error('Failed to load Voice module:', error);
        Alert.alert('Error', 'Failed to load voice recognition module');
      }
    };

    loadVoice();
  }, []);


  useEffect(() => {
    const unsub = voiceBus.onRequestListen(async () => {
      try {
        hasPlayedBeepRef.current = false;
        voiceSessionActiveRef.current = false;
        lastResultRef.current = '';
        emittedThisSessionRef.current = false;
        if (porcupineRef.current) {
          await porcupineRef.current.stop();
          porcupineActiveRef.current = false;
        }
        try {
          await Voice?.cancel?.();
          await Voice?.stop?.();
          await Voice?.destroy?.();
          await Voice?.removeAllListeners?.();
        } catch {}
        await new Promise<void>((r) => setTimeout(r, 1200));
        if (Voice && typeof Voice.start === 'function') {
          Voice.onSpeechStart = () => {
            if (voiceSessionActiveRef.current) return;
            voiceSessionActiveRef.current = true;
            setIsListening(true);
            onListeningChange?.(true);
            voiceBus.emitListening(true);
            if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
            sessionTimeoutRef.current = setTimeout(() => requestCleanup(), 15000);
          };
          Voice.onSpeechEnd = () => {
            sawSpeechEndRef.current = true;
            // Fallback: some devices may not fire final results. Ensure cleanup shortly after end.
            setTimeout(() => { if (!cleanupRequestedRef.current) requestCleanup(); }, 2500);
          };
          Voice.onSpeechResults = (e: any) => {
            if (cleanupRequestedRef.current || isCleaningUpRef.current || !voiceSessionActiveRef.current) return;
            const values: string[] = Array.isArray(e.value) ? e.value : [];
            const text = String(values[0] ?? '').trim();
            if (text && !emittedThisSessionRef.current) {
              emittedThisSessionRef.current = true;
              lastResultRef.current = text;
              setResult(text);
              try { onResult?.(text); } catch {}
              try { voiceBus.emitResult(text); } catch {}
            }
            requestCleanup();
          };
          Voice.onSpeechPartialResults = handlePartialResults;
          Voice.onSpeechError = (e: any) => {
            const code = e?.error?.code;
            const message = e?.error?.message || '';
            if (code === '5' || message.includes('Client side error')) {
              console.log('Ignoring benign client-side error (code 5) after session.');
              return;
            }
            requestCleanup();
          };
          // Play beep before starting recognition to avoid contaminating mic input
          if (enableBeep && !hasPlayedBeepRef.current) { hasPlayedBeepRef.current = true; playBeep(); }
          await new Promise<void>((r) => setTimeout(r, 200));
          await Voice.start(language, {
            EXTRA_PARTIAL_RESULTS: true,
            REQUEST_PERMISSIONS_AUTO: true,
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 6000,
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 12000,
            EXTRA_MAX_RESULTS: 10,
          });
        }
      } catch (e) {
        console.warn('Programmatic listen failed:', e);
      }
    });
    return () => unsub();
  }, [Voice, language, enableBeep]);

  // Only initialize Porcupine after Voice is loaded
  useEffect(() => {
    if (!Voice) return;
    const initPorcupine = async () => {
      if (!PORCUPINE_ACCESS_KEY) {
        Alert.alert('Porcupine error', 'Access key is missing.');
        return;
      }
      try {
        // Use your custom wake word
        porcupineRef.current = await PorcupineManager.fromKeywordPaths(
          PORCUPINE_ACCESS_KEY,
          ['Hey-Game-Box_en_android_v3_0_0.ppn'],
          async (keywordIndex) => {
            console.log('Wake word "Hey Game Box" detected! Starting listening...');
            // If TTS is speaking, ignore this wake trigger to avoid self-activation
            if (ttsActiveRef.current) {
              console.log('Ignoring wake word during TTS.');
              return;
            }
            onWake?.();
            voiceBus.emitWake();
            // Reset flags for new listening session
            hasPlayedBeepRef.current = false;
            voiceSessionActiveRef.current = false;
            lastResultRef.current = '';
            emittedThisSessionRef.current = false;
            if (Voice && typeof Voice.start === 'function') {
              try {
                // Check if we're already listening and skip if so
                if (isListening) {
                  console.log('Already listening, ignoring wake word');
                  return;
                }
                
                // Stop Porcupine to free up the microphone
                console.log('Stopping Porcupine to free microphone...');
                if (porcupineRef.current) {
                  await porcupineRef.current.stop();
                  porcupineActiveRef.current = false;
                }
                
                // More thorough cleanup of Voice recognition
                console.log('Cleaning up any existing voice recognition...');
                try {
                  await Voice.cancel();
                  await Voice.stop();
                  await Voice.destroy();
                  await Voice.removeAllListeners();
                } catch (stopError) {
                  console.log('Voice cleanup completed (some calls expected to fail)');
                }
                
                // Longer wait to ensure complete cleanup
                await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
                
                console.log('Setting up voice recognition callbacks...');

                // Results (final)
                Voice.onSpeechResults = (e: any) => {
                  if (cleanupRequestedRef.current || isCleaningUpRef.current || !voiceSessionActiveRef.current) return;
                  const values: string[] = Array.isArray(e.value) ? e.value : [];
                  console.log('Final speech result (onSpeechResults):', values);
                  try {
                    const text = String(values[0] ?? '').trim();
                    if (text && !emittedThisSessionRef.current) {
                      emittedThisSessionRef.current = true;
                      lastResultRef.current = text;
                      setResult(text);
                      try { onResult?.(text); } catch {}
                      try { voiceBus.emitResult(text); } catch {}
                    }
                  } catch (err) {
                    console.error('Error processing final result:', err);
                  }
                  requestCleanup();
                };

                // Partials (early detection)
                Voice.onSpeechPartialResults = (e: any) => {
                  try { console.log('Partial speech result:', Array.isArray(e?.value) ? e.value : []); } catch {}
                  handlePartialResults(e);
                };

                // Errors
                Voice.onSpeechError = (e: any) => {
                  if (cleanupRequestedRef.current || isCleaningUpRef.current) return;
                  const code = e?.error?.code;
                  const message = e?.error?.message || '';
                  if (code === '5' || message.includes('Client side error')) {
                    console.log('Ignoring benign client-side error (code 5) after session.');
                    return;
                  }
                  console.warn('Speech recognition error (handling):', e);
                  requestCleanup();
                };

                // Start
                Voice.onSpeechStart = () => {
                  console.log('Speech recognition started - you can speak now!');
                  if (voiceSessionActiveRef.current) {
                    console.log('Voice session already active, ignoring duplicate start');
                    return;
                  }
                  voiceSessionActiveRef.current = true;
                  setIsListening(true);
                  onListeningChange?.(true);
                  voiceBus.emitListening(true);
                  if (sessionTimeoutRef.current) {
                    clearTimeout(sessionTimeoutRef.current);
                  }
                  sessionTimeoutRef.current = setTimeout(() => {
                    console.log('Safety timeout: Force ending voice session');
                    requestCleanup();
                  }, 15000);
                };

                // End
                Voice.onSpeechEnd = () => {
                  console.log('Speech recognition ended. Waiting for final result...');
                  sawSpeechEndRef.current = true;
                  // Fallback if no final results arrive
                  setTimeout(() => { if (!cleanupRequestedRef.current) requestCleanup(); }, 2500);
                };
                // Start recognition with tuning options
                // Play beep before starting recognition to avoid contaminating mic input
                if (enableBeep && !hasPlayedBeepRef.current) {
                  hasPlayedBeepRef.current = true;
                  playBeep();
                }
                await new Promise<void>((r) => setTimeout(r, 200));
                await Voice.start(language, {
                  EXTRA_PARTIAL_RESULTS: true,
                  REQUEST_PERMISSIONS_AUTO: true,
                  EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 8000,
                  EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 6000,
                  EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 12000,
                  EXTRA_MAX_RESULTS: 10,
                });
                console.log('Voice recognition started with timeouts: complete=8s, possibly=6s, minimum=12s');
              } catch (error) {
                console.error('Failed to start voice recognition:', error);
                Alert.alert('Error', `Failed to start voice recognition: ${error}`);
              }
            } else {
              Alert.alert('Voice error', 'Voice.start method not found.');
            }
          }
        );
        if (porcupineRef.current) {
          await porcupineRef.current.start();
          porcupineActiveRef.current = true;
        } else {
          Alert.alert('Porcupine error', 'PorcupineManager failed to initialize.');
        }
      } catch (err) {
        Alert.alert('Porcupine error', err instanceof Error ? err.message : String(err));
        console.error('Porcupine error details:', err);
      }
    };
    initPorcupine();
    return () => {
      if (porcupineRef.current) {
        porcupineRef.current.stop();
        porcupineRef.current.delete();
      }
    };
  }, [Voice]);

  // Optional helper for manual start without Porcupine
  const startVoiceRecognition = async () => {
    if (Voice && typeof Voice.start === 'function') {
      try {
        Voice.onSpeechResults = (e: any) => {
          setResult(e.value?.[0] || '');
          setIsListening(false);
        };
        Voice.onSpeechPartialResults = (e: any) => {
          setResult(e.value?.[0] || '');
        };
        Voice.onSpeechError = (e: any) => {
          setIsListening(false);
          Alert.alert('Error', 'Speech recognition failed');
        };
        Voice.onSpeechStart = () => setIsListening(true);
        Voice.onSpeechEnd = () => setIsListening(false);
        await Voice.start('en-US');
      } catch (error) {
        Alert.alert('Error', 'Failed to start voice recognition: ' + error);
      }
    } else {
      Alert.alert('Voice error', 'Voice.start method not found.');
    }
  };

  const stopVoiceRecognition = async () => {
    try {
      if (Voice && typeof Voice.stop === 'function') {
        await Voice.stop();
      }
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
    }
  };


 return (
    <View style={styles.container}>
      {result ? (
        <View>
          <Text style={styles.title}>"{result}"</Text>
        </View>
      ) : null}      
      {!isSpeaking && (
        <View style={styles.statusContainer}>
          {isListening ? (
            <Text style={[styles.status, styles.listening]}>
              Listening... Speak now!
            </Text>
          ) : (
            <Text style={styles.status}>
              Say "Hey Game Box" to start playing...
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
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
  statusContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  listening: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonIdle: {
    backgroundColor: '#007AFF',
  },
  buttonListening: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VoiceRecog;