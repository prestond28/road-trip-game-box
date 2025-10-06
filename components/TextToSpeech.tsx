import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Tts from 'react-native-tts';

// Module-scoped one-time TTS init
let ttsInitialized = false;
async function ensureTtsInit() {
	if (ttsInitialized) return;
	try { await Tts.getInitStatus(); } catch {}
	try { await Tts.setDefaultLanguage('en-US'); } catch {}
	Tts.setDefaultRate(0.85, true);
	Tts.setDefaultPitch(1.0);
	ttsInitialized = true;
}

// Reusable function to speak any text
export async function speakText(text: string) {
	await ensureTtsInit();
	await Tts.stop();
	Tts.speak(text);
}

const TextToSpeech = () => {
	useEffect(() => {
		ensureTtsInit();
		return () => { Tts.stop(); };
	}, []);

	const onStartGame = async () => {
		await speakText('Hello there, Finn!');
	};

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Text to Speech Demo</Text>
			<TouchableOpacity style={styles.button} onPress={onStartGame}>
				<Text style={styles.buttonText}>Start Game</Text>
			</TouchableOpacity>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: '600',
		marginBottom: 24,
	},
	button: {
		backgroundColor: '#007AFF',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 8,
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700',
	},
});

export default TextToSpeech;

