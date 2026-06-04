import { useState, useCallback } from 'react';
import { useConversation } from '@elevenlabs/react';

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AISON_AGENT_ID;

export function useAisonInterviewer() {
  const [turns, setTurns]   = useState([]);
  const [error, setError]   = useState(null);
  const [mode, setMode]     = useState('disconnected'); // 'disconnected' | 'listening' | 'speaking'

  const conversation = useConversation({
    onConnect: () => {
      setMode('listening');
      setError(null);
    },
    onDisconnect: () => {
      setMode('disconnected');
    },
    onMessage: ({ message, source }) => {
      setTurns(prev => [...prev, {
        type: source === 'ai' ? 'aison' : 'user',
        text: message,
      }]);
    },
    onModeChange: ({ mode: m }) => {
      setMode(m === 'speaking' ? 'speaking' : 'listening');
    },
    onError: (msg) => {
      setError(typeof msg === 'string' ? msg : (msg?.message || 'Forbindelsesfejl'));
    },
  });

  const enabled  = conversation.status === 'connected' || conversation.status === 'connecting';
  const speaking = conversation.isSpeaking;
  const thinking = conversation.status === 'connecting';

  async function toggle() {
    if (enabled) {
      await conversation.endSession().catch(() => {});
      setError(null);
    } else {
      if (!AGENT_ID) {
        setError('VITE_ELEVENLABS_AISON_AGENT_ID er ikke sat');
        return;
      }
      setError(null);
      try {
        await conversation.startSession({
          agentId: AGENT_ID,
          connectionType: 'webrtc',
        });
      } catch (err) {
        setError(err?.message || 'Kunne ikke starte session');
      }
    }
  }

  function reset() {
    conversation.endSession().catch(() => {});
    setTurns([]);
    setError(null);
    setMode('disconnected');
  }

  const stopSpeaking = useCallback(() => {}, []);

  return {
    enabled,
    toggle,
    speaking,
    thinking,
    isSpeaking: conversation.isSpeaking,
    mode,
    turns,
    error,
    reset,
    stopSpeaking,
    status: conversation.status,
    // Kept for backward compat
    prevTranscriptLength: 0,
    askFollowUp: () => {},
  };
}
