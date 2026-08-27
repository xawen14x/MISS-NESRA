import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Send,
  Sliders,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { VoiceSettings, AvatarState } from '../types.js';

interface VoiceControllerProps {
  onSendMessage: (text: string) => void;
  onResetSession: () => void;
  avatarState: AvatarState;
  setAvatarState: (state: AvatarState) => void;
  voiceSettings: VoiceSettings;
  setVoiceSettings: React.Dispatch<React.SetStateAction<VoiceSettings>>;
  isLoading: boolean;
  onStopSpeaking: () => void;
  onQuickSelect?: (text: string) => void;
}

export const VoiceController: React.FC<VoiceControllerProps> = ({
  onSendMessage,
  onResetSession,
  avatarState,
  setAvatarState,
  voiceSettings,
  setVoiceSettings,
  isLoading,
  onStopSpeaking,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAutoSending, setIsAutoSending] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const autoSendTimerRef = useRef<any>(null);
  const latestInputRef = useRef(inputText);
  latestInputRef.current = inputText;

  // Auto-answer timer: Automatically triggers AI response if user stops typing / speaking for 2 seconds
  useEffect(() => {
    const trimmed = inputText.trim();

    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }

    if (!trimmed || trimmed.length < 3 || isLoading) {
      setIsAutoSending(false);
      return;
    }

    setIsAutoSending(true);

    // 2-second debounce timer to auto-send
    autoSendTimerRef.current = setTimeout(() => {
      const currentVal = latestInputRef.current.trim();
      if (currentVal.length >= 3 && !isLoading) {
        handleSend(currentVal);
      }
      setIsAutoSending(false);
    }, 2000);

    return () => {
      if (autoSendTimerRef.current) {
        clearTimeout(autoSendTimerRef.current);
        autoSendTimerRef.current = null;
      }
    };
  }, [inputText, isLoading]);

  // Initialize Speech Recognition & Synthesis Voices
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'id-ID';

      recognition.onstart = () => {
        setIsRecording(true);
        setAvatarState('listening');
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText) {
          setInputText(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (avatarState === 'listening') {
          setAvatarState('idle');
        }
      };

      recognitionRef.current = recognition;
    }

    // Load browser TTS voices
    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);

        // Auto select Indonesian voice if available
        if (!voiceSettings.selectedVoiceName) {
          const idVoice = voices.find(
            (v) =>
              v.lang.toLowerCase().includes('id') ||
              v.lang.toLowerCase().includes('indonesia') ||
              v.name.toLowerCase().includes('indonesia')
          );
          if (idVoice) {
            setVoiceSettings((prev) => ({
              ...prev,
              selectedVoiceName: idVoice.name,
              voiceLanguage: idVoice.lang,
            }));
          }
        }
      }
    };

    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }
      stopAudioVisualizer();
    };
  }, []);

  const startAudioVisualizer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round(avg * 1.5)));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Mic visualizer not available:', err);
    }
  };

  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (_) {}
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  const startRecording = () => {
    onStopSpeaking();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        setAvatarState('listening');
        startAudioVisualizer();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    } else {
      setIsRecording(true);
      setAvatarState('listening');
      startAudioVisualizer();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    setIsRecording(false);
    stopAudioVisualizer();
    if (avatarState === 'listening') {
      setAvatarState('idle');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSend = (textOverride?: string) => {
    if (autoSendTimerRef.current) {
      clearTimeout(autoSendTimerRef.current);
      autoSendTimerRef.current = null;
    }
    setIsAutoSending(false);

    if (isRecording) {
      stopRecording();
    }
    const textToSend = (textOverride !== undefined ? textOverride : inputText).trim();
    if (!textToSend || isLoading) return;

    onSendMessage(textToSend);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div id="voice-controller" className="w-full px-4 sm:px-8 pb-4 pt-1 shrink-0 relative">
      <div className="max-w-2xl mx-auto flex flex-col gap-2 relative">
        {/* Realtime Waveform Bar & Voice Active Feedback */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-4 py-2 bg-red-50 border border-red-200 rounded-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] animate-ping" />
                <span className="text-xs font-bold text-[#E50914]">
                  Mendengarkan suara Anda... (Diam 2 dtk untuk menjawab otomatis)
                </span>
              </div>

              {/* Audio meter bars */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      height: Math.max(4, Math.min(24, (audioLevel * ((i % 3) + 1)) / 10)),
                    }}
                    className="w-1 bg-[#E50914] rounded-full transition-all duration-75"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={stopRecording}
                className="text-xs text-[#E50914] underline font-bold hover:text-red-900"
              >
                Selesai Bicara
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Pill Input Bar */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-2 shadow-xl flex items-center gap-2 relative">
          {/* Reset Session Icon */}
          <button
            type="button"
            id="reset-chat-button"
            onClick={onResetSession}
            title="Ulang Percakapan (Reset)"
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              id="chat-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={
                isRecording
                  ? 'Sedang mendengarkan suara Anda...'
                  : 'Tanya seputar SPMB / PPDB SMK Telkom 2 Medan (Diam 2 detik untuk kirim otomatis)...'
              }
              className="w-full bg-transparent px-2 sm:px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />

            {/* 2-second Auto-Answer Badge */}
            {isAutoSending && !isLoading && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[10px] font-semibold animate-pulse shrink-0 mr-2">
                <Sparkles className="w-2.5 h-2.5 text-[#E50914]" />
                <span>Menjawab otomatis dlm 2 dtk...</span>
              </div>
            )}
          </div>

          {/* TTS Settings Toggle */}
          <button
            type="button"
            id="voice-settings-button"
            onClick={() => setShowSettings(!showSettings)}
            title="Pengaturan Suara & Narasi (TTS)"
            className={`p-2.5 rounded-2xl transition-colors shrink-0 ${
              showSettings || voiceSettings.autoPlayTTS
                ? 'bg-red-50 text-[#E50914]'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Prominent Red Microphone Button */}
          <button
            type="button"
            id="mic-toggle-button"
            onClick={toggleRecording}
            title={isRecording ? 'Berhenti Merekam' : 'Bicara Sekarang (Voice Mode)'}
            className={`w-14 sm:w-16 h-12 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
              isRecording
                ? 'bg-slate-900 text-white animate-pulse shadow-md'
                : 'bg-[#E50914] text-white shadow-[0_4px_15px_rgba(229,9,20,0.3)] hover:scale-105'
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Send Button (if text entered) */}
          {inputText.trim() && (
            <button
              type="button"
              id="send-message-button"
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-medium transition-all shrink-0 shadow-xs"
              title="Kirim Pesan Sekarang"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expandable Voice & TTS Settings */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs text-xs flex flex-wrap items-center gap-4 text-slate-700"
            >
              {/* Auto TTS Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={voiceSettings.autoPlayTTS}
                  onChange={(e) =>
                    setVoiceSettings((prev) => ({ ...prev, autoPlayTTS: e.target.checked }))
                  }
                  className="rounded text-[#E50914] focus:ring-red-500 w-4 h-4"
                />
                <span className="font-medium">Otomatis Baca Jawaban (Narasi Suara)</span>
              </label>

              {/* Speech Rate Control */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Kecepatan Suara:</span>
                {[0.9, 1.0, 1.15].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setVoiceSettings((prev) => ({ ...prev, speechRate: rate }))}
                    className={`px-2 py-0.5 rounded-md font-medium border ${
                      voiceSettings.speechRate === rate
                        ? 'bg-[#E50914] text-white border-[#E50914]'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Voice Picker */}
              {availableVoices.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Karakter Suara:</span>
                  <select
                    value={voiceSettings.selectedVoiceName}
                    onChange={(e) => {
                      const selected = availableVoices.find((v) => v.name === e.target.value);
                      setVoiceSettings((prev) => ({
                        ...prev,
                        selectedVoiceName: e.target.value,
                        voiceLanguage: selected?.lang || 'id-ID',
                      }));
                    }}
                    className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-red-500"
                  >
                    <option value="">Default Sistem (Indonesia)</option>
                    {availableVoices
                      .filter(
                        (v) =>
                          v.lang.toLowerCase().includes('id') ||
                          v.lang.toLowerCase().includes('in') ||
                          v.name.toLowerCase().includes('indonesia')
                      )
                      .map((v) => (
                        <option key={v.name} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
