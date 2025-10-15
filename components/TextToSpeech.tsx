import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Tts from 'react-native-tts';

// Module-scoped one-time TTS init
let ttsInitialized = false;
async function ensureTtsInit() {
	if (ttsInitialized) return;
	try { await Tts.getInitStatus(); } catch {}
	try { await Tts.setDefaultLanguage('en-US'); } catch {}
	Tts.setDefaultRate(1, true);
	Tts.setDefaultPitch(1.0);
	ttsInitialized = true;
}

// Reusable function to speak any text
export async function speakText(text: string): Promise<void> {
	await ensureTtsInit();
	await Tts.stop();
	return new Promise((resolve) => {
		let done = false;
		const finish = () => {
			if (done) return; done = true;
			if (subStart?.remove) subStart.remove(); else Tts.removeEventListener?.('tts-start', onStart);
			if (subFinish?.remove) subFinish.remove(); else Tts.removeEventListener?.('tts-finish', onFinish);
			if (subCancel?.remove) subCancel.remove(); else Tts.removeEventListener?.('tts-cancel', onCancel);
			resolve();
		};
		const onStart = () => {};
		const onFinish = () => finish();
		const onCancel = () => finish();
		const subStart = Tts.addEventListener('tts-start', onStart) as { remove?: () => void } | void;
		const subFinish = Tts.addEventListener('tts-finish', onFinish) as { remove?: () => void } | void;
		const subCancel = Tts.addEventListener('tts-cancel', onCancel) as { remove?: () => void } | void;
		Tts.speak(text);
		setTimeout(() => finish(), 30000);
	});
}

type Props = { headless?: boolean };

const TextToSpeech: React.FC<Props> = ({ headless = false }) => {
	useEffect(() => {
		ensureTtsInit();
		return () => { Tts.stop(); };
	}, []);

	if (headless) return null;

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Text to Speech Demo</Text>
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

