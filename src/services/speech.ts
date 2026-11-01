// Web Speech API & Audio interface for French speech recognition & synthesis

export interface SpeechRecognitionResultItem {
  transcript: string;
  isFinal: boolean;
}

export function isSpeechRecognitionSupported(): boolean {
  return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let activeRecognition: any = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];

// Initialize voice cache
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  try {
    cachedVoices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      cachedVoices = window.speechSynthesis.getVoices();
    };
  } catch {}
}

export function startSpeechRecognition(
  onResult: (result: SpeechRecognitionResultItem) => void,
  onError: (err: string) => void,
  onEnd: () => void
): () => void {
  if (!isSpeechRecognitionSupported()) {
    onError('La reconnaissance vocale n\'est pas supportée sur ce navigateur. Utilisez le champ texte ci-dessous.');
    onEnd();
    return () => {};
  }

  try {
    stopSpeechRecognition();

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    activeRecognition = recognition;

    let hasReceivedResult = false;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      const current = final || interim;
      if (current.trim().length > 0) {
        hasReceivedResult = true;
      }

      onResult({
        transcript: current,
        isFinal: !!final,
      });
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        onError('Accès au micro non autorisé par le navigateur. Vous pouvez taper votre question ci-dessous.');
      } else if (event.error === 'no-speech') {
        if (!hasReceivedResult) {
          onError('Aucune voix détectée. Vous pouvez réessayer ou taper votre message ci-dessous.');
        }
      } else if (event.error === 'audio-capture') {
        onError('Aucun microphone détecté sur cet appareil.');
      } else if (event.error === 'network') {
        onError('Erreur de connexion vocale. Vous pouvez utiliser le champ texte.');
      } else if (event.error !== 'aborted') {
        onError(`Reconnaissance vocale : ${event.error}`);
      }
    };

    recognition.onend = () => {
      activeRecognition = null;
      onEnd();
    };

    recognition.start();

    return () => {
      try {
        recognition.stop();
      } catch {}
      activeRecognition = null;
    };
  } catch (err: any) {
    onError(err.message || 'Impossible de démarrer le micro');
    onEnd();
    return () => {};
  }
}

export function stopSpeechRecognition() {
  if (activeRecognition) {
    try {
      activeRecognition.stop();
    } catch {}
    activeRecognition = null;
  }
}

export function getFrenchVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSynthesisSupported()) return [];
  if (cachedVoices.length === 0) {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {}
  }
  const fr = cachedVoices.filter((v) => v.lang.startsWith('fr') || v.lang.startsWith('FR'));
  return fr.length > 0 ? fr : cachedVoices;
}

export function speakText(
  text: string,
  options?: {
    rate?: number;
    pitch?: number;
    voiceURI?: string;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): () => void {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Synthèse vocale indisponible');
    options?.onError?.(new Error('Synthèse vocale indisponible'));
    return () => {};
  }

  try {
    stopSpeechSynthesis();
    try {
      window.speechSynthesis.resume();
    } catch {}

    const cleanText = text.replace(/[*_#`[\]()]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return () => {};

    const utterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance = utterance; // Prevent garbage collection bug in Chrome
    utterance.lang = 'fr-FR';
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;

    const frenchVoices = getFrenchVoices();
    if (options?.voiceURI) {
      const selected = frenchVoices.find((v) => v.voiceURI === options.voiceURI);
      if (selected) utterance.voice = selected;
    } else if (frenchVoices.length > 0) {
      // Prefer Google or natural voices if available
      const bestVoice = frenchVoices.find((v) => v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Thomas') || v.name.includes('Amelie')) || frenchVoices[0];
      utterance.voice = bestVoice;
    }

    utterance.onstart = () => {
      options?.onStart?.();
    };

    utterance.onend = () => {
      activeUtterance = null;
      options?.onEnd?.();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      console.warn('Speech synthesis error:', e);
      options?.onError?.(e);
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      stopSpeechSynthesis();
    };
  } catch (err) {
    console.warn('Speak error:', err);
    options?.onError?.(err);
    return () => {};
  }
}

export function playBase64Audio(
  base64Wav: string,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): () => void {
  stopAudioPlayback();

  try {
    const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
    currentAudio = audio;

    audio.onplay = () => {
      options?.onStart?.();
    };

    audio.onended = () => {
      currentAudio = null;
      options?.onEnd?.();
    };

    audio.onerror = (e) => {
      currentAudio = null;
      options?.onError?.(e);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play rejected:', err);
        options?.onError?.(err);
      });
    }

    return () => {
      stopAudioPlayback();
    };
  } catch (err) {
    options?.onError?.(err);
    return () => {};
  }
}

export function stopAudioPlayback() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch {}
    currentAudio = null;
  }
}

export function stopSpeechSynthesis() {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  activeUtterance = null;
}

export function stopAllAudio() {
  stopSpeechRecognition();
  stopAudioPlayback();
  stopSpeechSynthesis();
}

export function playChime(type: 'start' | 'success' = 'start') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'start') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {}
}
