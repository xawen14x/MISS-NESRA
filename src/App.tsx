import React, { useState, useEffect, useRef } from 'react';
import { SidebarHistory } from './components/SidebarHistory.js';
import { HeaderNav } from './components/HeaderNav.js';
import { AvatarCharacter } from './components/AvatarCharacter.js';
import { ChatBox } from './components/ChatBox.js';
import { VoiceController } from './components/VoiceController.js';
import { AdminKnowledgeModal } from './components/AdminKnowledgeModal.js';
import { StandaloneArchModal } from './components/StandaloneArchModal.js';
import {
  ChatMessage,
  ChatSession,
  AvatarState,
  VoiceSettings,
} from './types.js';

const CLOSING_PHRASE = 'Jika ada yang ingin ditanyakan, saya senang hati akan menjawabnya.';

function ensureClosingPhrase(text: string): string {
  const trimmed = text.trim();
  if (
    trimmed.toLowerCase().includes('jika ada yang ingin ditanyakan') ||
    trimmed.toLowerCase().includes('senang hati akan menjawabnya')
  ) {
    return trimmed;
  }
  return `${trimmed}\n\n${CLOSING_PHRASE}`;
}

const FAREWELL_MESSAGE_TEXT =
  'Senang bisa menjawab semua pertanyaan anda, semoga jawaban yang saya berikan bisa membantu.';

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome',
  role: 'assistant',
  text: 'Halo! Selamat datang di Layanan Informasi PPDB (Penerimaan Peserta Didik Baru) **SMK Telkom 2 Medan** Tahun Ajaran 2026/2027.\n\nSaya adalah **Telko-Bot**, asisten virtual cerdas Anda. Anda dapat bertanya langsung melalui teks atau menekan **tombol mikrofon** untuk berbicara.\n\nApa yang ingin Anda tanyakan seputar jurusan, syarat, beasiswa, atau rincian biaya pendaftaran?\n\nJika ada yang ingin ditanyakan, saya senang hati akan menjawabnya.',
  timestamp: new Date().toISOString(),
  matchedCategory: 'Umum',
  source: 'Sekretariat PPDB SMK Telkom 2 Medan',
};

const DEFAULT_SESSION: ChatSession = {
  id: 'session-default',
  title: 'Informasi PPDB 2026/2027',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [INITIAL_WELCOME_MESSAGE],
};

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('smk_telkom_sessions');
      return saved ? JSON.parse(saved) : [DEFAULT_SESSION];
    } catch {
      return [DEFAULT_SESSION];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(sessions[0]?.id || 'session-default');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [avatarSubtitle, setAvatarSubtitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [autoResetNotification, setAutoResetNotification] = useState<string | null>(null);

  // Inactivity tracking (5 minutes = 300,000 ms)
  const lastUserActivityRef = useRef<number>(Date.now());
  const inactivityTimerRef = useRef<any>(null);

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem('smk_telkom_voice_settings');
      return saved
        ? JSON.parse(saved)
        : {
            autoPlayTTS: true,
            speechRate: 1.0,
            pitch: 1.0,
            selectedVoiceName: '',
            voiceLanguage: 'id-ID',
          };
    } catch {
      return {
        autoPlayTTS: true,
        speechRate: 1.0,
        pitch: 1.0,
        selectedVoiceName: '',
        voiceLanguage: 'id-ID',
      };
    }
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [kbItemCount, setKbItemCount] = useState(13);

  const currentSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || DEFAULT_SESSION;

  // Persist sessions to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('smk_telkom_sessions', JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  }, [sessions]);

  // Persist Voice Settings
  useEffect(() => {
    try {
      localStorage.setItem('smk_telkom_voice_settings', JSON.stringify(voiceSettings));
    } catch (e) {}
  }, [voiceSettings]);

  // Fetch initial stats
  useEffect(() => {
    fetch('/api/kb')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setKbItemCount(data.length);
      })
      .catch((err) => console.error(err));
  }, []);

  // 5-Minute Inactivity Session Reset Monitor
  useEffect(() => {
    const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

    const checkInactivity = () => {
      const now = Date.now();
      const elapsed = now - lastUserActivityRef.current;

      // Check if session has active user messages
      const hasUserActivity = currentSession.messages.some((m) => m.role === 'user');

      if (elapsed >= INACTIVITY_LIMIT_MS && hasUserActivity) {
        // Reset current session and output AI farewell message
        stopSpeaking();

        const farewellMsgId = `msg-${Date.now()}-farewell`;
        const farewellMessage: ChatMessage = {
          id: farewellMsgId,
          role: 'assistant',
          text: FAREWELL_MESSAGE_TEXT,
          timestamp: new Date().toISOString(),
          matchedCategory: 'Penutup',
          source: 'Otomatisasi Sesi PPDB',
        };

        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSession.id
              ? {
                  ...s,
                  title: 'Informasi PPDB 2026/2027',
                  updatedAt: new Date().toISOString(),
                  messages: [farewellMessage],
                }
              : s
          )
        );

        // Reset activity timer
        lastUserActivityRef.current = Date.now();
        setAutoResetNotification('Sesi di-reset otomatis karena tidak ada aktivitas selama 5 menit.');

        setTimeout(() => {
          setAutoResetNotification(null);
        }, 8000);

        // Voice speak the farewell message
        if (voiceSettings.autoPlayTTS) {
          speakText(FAREWELL_MESSAGE_TEXT, farewellMsgId);
        }
      }
    };

    inactivityTimerRef.current = setInterval(checkInactivity, 15000);

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current);
      }
    };
  }, [currentSession, voiceSettings]);

  // Text-to-Speech (TTS) Handler
  const speakText = (text: string, msgId: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // If currently speaking this message, toggle stop
    if (speakingMessageId === msgId) {
      stopSpeaking();
      return;
    }

    // Stop previous utterance
    window.speechSynthesis.cancel();

    // Clean markdown characters for pleasant TTS narration
    const cleanText = text
      .replace(/[*_#>`~\[\]]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/https?:\/\/\S+/g, 'link website')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceSettings.voiceLanguage || 'id-ID';
    utterance.rate = voiceSettings.speechRate || 1.0;
    utterance.pitch = voiceSettings.pitch || 1.0;

    // Apply selected voice
    if (voiceSettings.selectedVoiceName) {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) => v.name === voiceSettings.selectedVoiceName);
      if (matched) utterance.voice = matched;
    }

    utterance.onstart = () => {
      setSpeakingMessageId(msgId);
      setAvatarState('speaking');
      setAvatarSubtitle(cleanText.slice(0, 60) + '...');
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
      setAvatarState('idle');
      setAvatarSubtitle('');
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      setSpeakingMessageId(null);
      setAvatarState('idle');
      setAvatarSubtitle('');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(null);
    if (avatarState === 'speaking') {
      setAvatarState('idle');
      setAvatarSubtitle('');
    }
  };

  // Send message to backend RAG engine
  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    // Reset inactivity timer on new question
    lastUserActivityRef.current = Date.now();
    stopSpeaking();

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      text: queryText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Update active session messages
    const updatedMessages = [...currentSession.messages, userMessage];

    // Auto-update session title if it's the default title
    let newTitle = currentSession.title;
    if (currentSession.title === 'Informasi PPDB 2026/2027' || currentSession.title === 'Percakapan Baru') {
      newTitle = queryText.slice(0, 32) + (queryText.length > 32 ? '...' : '');
    }

    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              title: newTitle,
              updatedAt: new Date().toISOString(),
              messages: updatedMessages,
            }
          : s
      )
    );

    setIsLoading(true);
    setAvatarState('thinking');
    setAvatarSubtitle(`Mencari data untuk: "${queryText.slice(0, 30)}..."`);

    try {
      // Build history payload
      const historyPayload = currentSession.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryText.trim(),
          history: historyPayload,
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi server PPDB');
      }

      const data = await response.json();
      const rawText = data.text || 'Maaf, saya belum menemukan jawaban untuk pertanyaan tersebut.';
      const finalText = ensureClosingPhrase(rawText);

      const assistantMsgId = `msg-${Date.now()}-ai`;
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        text: finalText,
        timestamp: new Date().toISOString(),
        matchedCategory: data.category || 'Umum',
        matchedScore: data.score,
        source: data.source || 'Basis Data Resmi PPDB',
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, assistantMessage],
              }
            : s
        )
      );

      setAvatarState('idle');
      setAvatarSubtitle('');

      // If auto-play TTS is enabled, speak the answer
      if (voiceSettings.autoPlayTTS && finalText) {
        speakText(finalText, assistantMsgId);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorText = ensureClosingPhrase(
        'Mohon maaf, terjadi kendala saat memproses jawaban. Silakan hubungi Sekretariat PPDB SMK Telkom 2 Medan di WhatsApp **0812-6000-8802** atau coba lagi sesaat lagi.'
      );
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        text: errorText,
        timestamp: new Date().toISOString(),
        source: 'Sistem Failover',
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                updatedAt: new Date().toISOString(),
                messages: [...s.messages, errorMsg],
              }
            : s
        )
      );
      setAvatarState('idle');
      setAvatarSubtitle('');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new session
  const handleNewSession = () => {
    stopSpeaking();
    const newSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Percakapan Baru',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [INITIAL_WELCOME_MESSAGE],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  // Clear all sessions
  const handleClearAllSessions = () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua riwayat percakapan?')) return;
    stopSpeaking();
    const freshSession: ChatSession = {
      id: `session-${Date.now()}`,
      title: 'Informasi PPDB 2026/2027',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [INITIAL_WELCOME_MESSAGE],
    };
    setSessions([freshSession]);
    setActiveSessionId(freshSession.id);
  };

  // Reset current session
  const handleResetCurrentSession = () => {
    stopSpeaking();
    setSessions((prev) =>
      prev.map((s) =>
        s.id === currentSession.id
          ? {
              ...s,
              title: 'Informasi PPDB 2026/2027',
              updatedAt: new Date().toISOString(),
              messages: [INITIAL_WELCOME_MESSAGE],
            }
          : s
      )
    );
  };

  // Quick Category Jump
  const handleQuickCategory = (cat: string) => {
    const promptMap: Record<string, string> = {
      Jurusan: 'Apa saja 4 jurusan unggulan di SMK Telkom 2 Medan dan apa prospek kerjanya?',
      Biaya: 'Berapa rincian biaya pendaftaran, uang gedung (DPP), dan SPP bulanan?',
      Syarat: 'Apa saja syarat berkas dan dokumen yang harus disiapkan untuk mendaftar?',
      Beasiswa: 'Apa saja program beasiswa prestasi dan potongan biaya yang tersedia?',
    };
    const prompt = promptMap[cat] || `Informasi seputar ${cat}`;
    handleSendMessage(prompt);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* 1. Left Sidebar: Session History */}
      <SidebarHistory
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={(id) => {
          stopSpeaking();
          setActiveSessionId(id);
        }}
        onNewSession={handleNewSession}
        onClearAllSessions={handleClearAllSessions}
        onQuickCategoryClick={handleQuickCategory}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#F9FAFB]">
        {/* Top Header */}
        <HeaderNav
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenArch={() => setIsArchOpen(true)}
          onResetSession={handleResetCurrentSession}
          kbItemCount={kbItemCount}
        />

        {/* 5-Min Inactivity Auto-Reset Banner */}
        {autoResetNotification && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between transition-all">
            <span className="font-medium">⏱️ {autoResetNotification}</span>
            <button
              type="button"
              onClick={() => setAutoResetNotification(null)}
              className="text-amber-600 hover:text-amber-900 font-bold ml-2"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Central Q&A Playground: Split Avatar (Top) + Chat Feed (Middle) + Voice Bar (Bottom) */}
        <main className="flex-1 flex flex-col min-h-0 relative max-w-5xl w-full mx-auto">
          {/* Avatar Hero Character Section */}
          <div className="bg-gradient-to-b from-white to-slate-50/70 border-b border-slate-200/80 pt-2 pb-1 shrink-0">
            <AvatarCharacter
              state={avatarState}
              subtitle={avatarSubtitle}
              onStateClick={() => {
                if (avatarState === 'idle') {
                  speakText(
                    'Halo! Saya Telko-Bot. Silakan tekan tombol mikrofon di bawah untuk berbicara dengan saya.',
                    'avatar-hello'
                  );
                } else if (avatarState === 'speaking') {
                  stopSpeaking();
                }
              }}
            />
          </div>

          {/* Conversation Chat Bubbles */}
          <ChatBox
            messages={currentSession.messages}
            isLoading={isLoading}
            onSpeakMessage={speakText}
            speakingMessageId={speakingMessageId}
            onQuickQuestion={handleSendMessage}
            avatarState={avatarState}
          />

          {/* Bottom Voice & Text Controller Bar */}
          <VoiceController
            onSendMessage={handleSendMessage}
            onResetSession={handleResetCurrentSession}
            avatarState={avatarState}
            setAvatarState={setAvatarState}
            voiceSettings={voiceSettings}
            setVoiceSettings={setVoiceSettings}
            isLoading={isLoading}
            onStopSpeaking={stopSpeaking}
          />
        </main>
      </div>

      {/* 3. Admin Dynamic Knowledge Base Modal */}
      <AdminKnowledgeModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onKnowledgeUpdated={() => {
          fetch('/api/kb')
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data)) setKbItemCount(data.length);
            });
        }}
      />

      {/* 4. Standalone Architecture & Python FastAPI Deployment Blueprint Modal */}
      <StandaloneArchModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
      />
    </div>
  );
}
