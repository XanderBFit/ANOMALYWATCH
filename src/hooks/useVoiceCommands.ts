import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useVoiceCommands = (actions: { onNavigate: (view: string) => void; onSearch: (query: string) => void }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript.toLowerCase();
      setTranscript(command);
      
      if (command.includes('go to')) {
        const target = command.split('go to ')[1];
        actions.onNavigate(target);
      } else if (command.includes('search')) {
        const query = command.split('search ')[1];
        actions.onSearch(query);
      }
    };

    recognition.start();
  }, [actions]);

  return { isListening, transcript, startListening };
};
