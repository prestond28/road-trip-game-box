type Unsubscribe = () => void;

type VoiceBus = {
  onWake: (cb: () => void) => Unsubscribe;
  onListening: (cb: (listening: boolean) => void) => Unsubscribe;
  onResult: (cb: (text: string) => void) => Unsubscribe;
  emitWake: () => void;
  emitListening: (listening: boolean) => void;
  emitResult: (text: string) => void;
};

const wakeListeners = new Set<() => void>();
const listeningListeners = new Set<(b: boolean) => void>();
const resultListeners = new Set<(t: string) => void>();

export const voiceBus: VoiceBus = {
  onWake(cb) {
    wakeListeners.add(cb);
    return () => wakeListeners.delete(cb);
  },
  onListening(cb) {
    listeningListeners.add(cb);
    return () => listeningListeners.delete(cb);
  },
  onResult(cb) {
    resultListeners.add(cb);
    return () => resultListeners.delete(cb);
  },
  emitWake() {
    wakeListeners.forEach((cb) => {
      try { cb(); } catch {}
    });
  },
  emitListening(listening) {
    listeningListeners.forEach((cb) => {
      try { cb(listening); } catch {}
    });
  },
  emitResult(text) {
    resultListeners.forEach((cb) => {
      try { cb(text); } catch {}
    });
  },
};
