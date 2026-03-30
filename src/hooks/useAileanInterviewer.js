import { useState, useRef, useCallback } from 'react';
import { getCraftFollowUp } from '../services/craftService.js';
import { speakText } from '../services/elevenLabsService.js';

function speakBrowser(text) {
  return new Promise(resolve => {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.pitch = 1.05;
    utt.lang = 'da-DK';
    utt.onend = resolve;
    utt.onerror = resolve;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith('da')) || voices.find(v => v.lang.startsWith('en'));
    if (voice) utt.voice = voice;
    window.speechSynthesis.speak(utt);
  });
}

export function useAileanInterviewer({ proxyAuth = null }) {
  const [enabled, setEnabled]     = useState(false);
  const [thinking, setThinking]   = useState(false);
  const [speaking, setSpeaking]   = useState(false);
  const [turns, setTurns]         = useState([]);
  const [error, setError]         = useState(null);
  const [prevTranscriptLength, setPrevTranscriptLength] = useState(0);

  const historyRef           = useRef([]);
  const audioRef             = useRef(null);
  const lastTranscriptRef    = useRef('');
  const prevTranscriptLenRef = useRef(0);

  const INTRO = 'Hej, jeg er Ailean. Fortæl mig om det job du skal prissætte — hvad skal laves, og hvad er omfanget?';

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const ttsSpeak = useCallback(async (text) => {
    if (proxyAuth?.token) {
      try {
        const url = await speakText(text, proxyAuth.token);
        const audio = new Audio(url);
        audioRef.current = audio;
        await new Promise(resolve => { audio.onended = resolve; audio.onerror = resolve; audio.play().catch(resolve); });
        URL.revokeObjectURL(url);
        audioRef.current = null;
        return;
      } catch { /* fall back to browser TTS */ }
    }
    await speakBrowser(text);
  }, [proxyAuth]);

  const askFollowUp = useCallback(async (transcript) => {
    if (!enabled || !proxyAuth) return;
    if (thinking || speaking) return;
    if (!transcript || transcript.trim().length < 30) return;
    if (transcript === lastTranscriptRef.current) return;
    lastTranscriptRef.current = transcript;

    setThinking(true);
    setError(null);

    const userText = transcript.slice(prevTranscriptLenRef.current).trim();

    try {
      const question = await getCraftFollowUp(transcript, historyRef.current, proxyAuth);

      setTurns(prev => [
        ...prev,
        ...(userText ? [{ type: 'user', text: userText }] : []),
        { type: 'ailean', text: question },
      ]);

      prevTranscriptLenRef.current = transcript.length;
      setPrevTranscriptLength(transcript.length);

      historyRef.current = [
        ...historyRef.current.slice(-12),
        { role: 'user',      content: `Beskrivelse hidtil:\n${transcript}` },
        { role: 'assistant', content: question },
      ];

      setThinking(false);
      setSpeaking(true);
      await ttsSpeak(question);
    } catch (err) {
      setError(err.message);
      setThinking(false);
    } finally {
      setSpeaking(false);
    }
  }, [enabled, thinking, speaking, proxyAuth, ttsSpeak]);

  const introduceHerself = useCallback(async () => {
    setTurns([{ type: 'ailean', text: INTRO }]);
    historyRef.current = [{ role: 'assistant', content: INTRO }];
    setSpeaking(true);
    try { await ttsSpeak(INTRO); } catch (err) { setError(err.message); } finally { setSpeaking(false); }
  }, [ttsSpeak]);

  async function toggle() {
    if (enabled) {
      stopSpeaking();
      setEnabled(false);
    } else {
      setEnabled(true);
      await introduceHerself();
    }
    setError(null);
  }

  function reset() {
    stopSpeaking();
    historyRef.current = [];
    lastTranscriptRef.current = '';
    prevTranscriptLenRef.current = 0;
    setTurns([]);
    setPrevTranscriptLength(0);
    setThinking(false);
    setError(null);
  }

  return { enabled, toggle, thinking, speaking, turns, prevTranscriptLength, error, askFollowUp, stopSpeaking, reset };
}
