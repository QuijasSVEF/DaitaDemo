import { useState, useCallback } from 'react';

interface UseSpeechReturn {
  speak: (text: string) => void;
  stop: () => void;
  speaking: boolean;
}

export function useSpeech(): UseSpeechReturn {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create and configure utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    // Set up event handlers
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Start speaking
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    speaking
  };
}