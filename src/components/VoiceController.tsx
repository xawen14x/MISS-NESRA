import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Send,
  Sliders,
  RotateCcw,
  Sparkles,
  CornerDownLeft,
} from 'lucide-react';
import { VoiceSettings, AvatarState, QAItem } from '../types.js';

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

const DEFAULT_SUGGESTIONS = [
  'Apa saja 4 jurusan unggulan di SMK Telkom 2 Medan?',
  'Berapa rincian biaya pendaftaran, uang gedung (DPP), dan SPP bulanan?',
  'Apa saja syarat berkas pendaftaran PPDB 2026/2027?',
  'Bagaimana syarat mendapatkan beasiswa prestasi atau YPT?',
  'Kapan jadwal gelombang pendaftaran PPDB dibuka?',
  'Apa keunggulan dan prospek kerja jurusan RPL?',
  'Apa keunggulan dan prospek kerja jurusan TKJ?',
  'Apa keunggulan dan prospek kerja jurusan DKV?',
  'Apa keunggulan dan prospek kerja jurusan TJAT?',
  'Di mana alamat sekolah dan kontak WhatsApp resmi panitia PPDB?',
  'Apakah ada fasilitas asrama atau beasiswa bagi siswa berprestasi?',
  'Bagaimana alur pendaftaran offline di kampus Jl. Halat No. 8 Medan?',
];

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

  // Autocomplete state (triggered when user pauses for > 2 seconds)
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [kbList, setKbList] = useState<QAItem[]>([]);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const inputDebounceTimerRef = useRef<any>(null);

  // Fetch Knowledge Base for Autocomplete Pool
  useEffect(() => {
    fetch('/api/kb')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setKbList(data);
      })
      .catch((err) => console.warn('Could not fetch KB for autocomplete:', err));
  }, []);

  // Compute question pool for autocomplete
  const questionPool = useMemo(() => {
    const pool = new Set<string>(DEFAULT_SUGGESTIONS);
    kbList.forEach((item) => {
      if (item.question) pool.add(item.question);
      if (Array.isArray(item.alternateQuestions)) {
        item.alternateQuestions.forEach((q) => {
          if (q && q.length > 5) pool.add(q);
        });
      }
    });
    return Array.from(pool);
  }, [kbList]);

  // Autocomplete Search Engine triggered after 2 seconds of inactivity
  useEffect(() => {
    const query = inputText.trim();

    // Clear previous timer
    if (inputDebounceTimerRef.current) {
      clearTimeout(inputDebounceTimerRef.current);
    }

    if (query.length < 2) {
      setShowAutocomplete(false);
      setAutocompleteItems([]);
      setSelectedIndex(-1);
      return;
    }

    // Set 2000ms (2 seconds) debounce timer
    inputDebounceTimerRef.current = setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      const tokens = lowerQuery.split(/\s+/).filter((t) => t.length > 1);

      // Score candidates based on query overlap and prefix match
      const matched = questionPool
        .map((candidate) => {
          const lowerCandidate = candidate.toLowerCase();
          let score = 0;

          if (lowerCandidate.startsWith(lowerQuery)) {
            score += 10;
          } else if (lowerCandidate.includes(lowerQuery)) {
            score += 6;
          }

          tokens.forEach((token) => {
            if (lowerCandidate.includes(token)) {
              score += 2;
            }
          });

          return { candidate, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((item) => item.candidate);

      if (matched.length > 0) {
        setAutocompleteItems(matched);
        setShowAutocomplete(true);
        setSelectedIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    }, 2000);

    return () => {
      if (inputDebounceTimerRef.current) {
        clearTimeout(inputDebounceTimerRef.current);
      }
    };
  }, [inputText, questionPool]);

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
    if (isRecording) {
      stopRecording();
    }
    const textToSend = (textOverride || inputText).trim();
    if (!textToSend || isLoading) return;

    setShowAutocomplete(false);
    onSendMessage(textToSend);
    setInputText('');
  };

  const handleSelectAutocomplete = (suggestion: string, sendImmediately = false) => {
    setShowAutocomplete(false);
    if (sendImmediately) {
      handleSend(suggestion);
    } else {
      setInputText(suggestion);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete && autocompleteItems.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % autocompleteItems.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + autocompleteItems.length) % autocompleteItems.length);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < autocompleteItems.length) {
          setInputText(autocompleteItems[selectedIndex]);
          setShowAutocomplete(false);
        }
        return;
      }
      if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < autocompleteItems.length && !e.shiftKey) {
        e.preventDefault();
        handleSend(autocompleteItems[selectedIndex]);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div id="voice-controller" className="w-full px-4 sm:px-8 pb-4 pt-1 shrink-0 relative">
      <div className="max-w-2xl mx-auto flex flex-col gap-2 relative">
        {/* 1. Autocomplete Floating Suggestions (Triggered after 2 seconds pause) */}
        <AnimatePresence>
          {showAutocomplete && autocompleteItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-0 right-0 mb-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3.5 shadow-2xl z-30 space-y-2"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-3.5 h-3.5 text-[#E50914] animate-pulse" />
                  <span>Saran Pertanyaan Lengkap (Autocomplete)</span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Diam 2 dtk • Tekan Tab atau Klik
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {autocompleteItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectAutocomplete(item, true)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-red-50 text-[#E50914] border border-red-200 shadow-xs'
                          : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E50914] shrink-0" />
                        <span className="text-xs font-medium truncate">{item}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAutocomplete(item, false);
                          }}
                          className="px-2 py-0.5 text-[10px] bg-white border border-slate-200 rounded text-slate-600 hover:text-slate-900 font-semibold"
                          title="Isi teks tanpa kirim"
                        >
                          Isi Teks
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectAutocomplete(item, true);
                          }}
                          className="px-2 py-0.5 text-[10px] bg-[#E50914] text-white rounded font-bold hover:bg-red-700 flex items-center gap-0.5"
                          title="Tanyakan langsung"
                        >
                          <span>Tanya</span>
                          <CornerDownLeft className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Realtime Waveform Bar & Voice Active Feedback */}
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
                  Mendengarkan... Silakan berbicara
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

        {/* 3. Floating Pill Input Bar */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-2 shadow-xl flex items-center gap-2">
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
                : 'Tanya jurusan RPL, TKJ, biaya, syarat PPDB (Autocomplete aktif)...'
            }
            className="flex-1 bg-transparent px-2 sm:px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />

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
              title="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 4. Expandable Voice & TTS Settings */}
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
