import React, { useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import {
  Volume2,
  VolumeX,
  Copy,
  Check,
  Sparkles,
  Bot,
  User,
  ShieldCheck,
  ThumbsUp,
  Clock,
} from 'lucide-react';
import { ChatMessage, AvatarState } from '../types.js';

interface ChatBoxProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSpeakMessage: (text: string, msgId: string) => void;
  speakingMessageId: string | null;
  onQuickQuestion: (question: string) => void;
  avatarState: AvatarState;
}

const QUICK_PPDB_QUESTIONS = [
  'Apa saja 4 jurusan di SMK Telkom 2 Medan?',
  'Berapa rincian biaya pendaftaran & SPP?',
  'Apa saja syarat berkas pendaftaran PPDB?',
  'Bagaimana syarat beasiswa prestasi?',
  'Kapan jadwal gelombang pendaftaran dibuka?',
  'Alamat dan kontak WhatsApp panitia PPDB?',
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  isLoading,
  onSpeakMessage,
  speakingMessageId,
  onQuickQuestion,
  avatarState,
}) => {
  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [likedIds, setLikedIds] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLike = (id: string) => {
    setLikedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div id="chat-box-container" className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 space-y-4">
      {/* Welcome Card if message count is low */}
      {messages.length <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs max-w-3xl mx-auto"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E50914] text-white flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Layanan Q&A PPDB SMK Telkom 2 Medan
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-50 text-[#E50914] border border-red-200 rounded-full">
                  TA 2026/2027
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                Asisten AI resmi siap membantu menjawab informasi seputar 4 Jurusan unggulan (RPL, TKJ, DKV, TJAT), rincian biaya, beasiswa YPT/Prestasi, dan tata cara pendaftaran.
              </p>
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          <div className="mt-4 pt-3.5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
              Pertanyaan Populer Calon Siswa:
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_PPDB_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onQuickQuestion(q)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-red-50 hover:border-red-200 border border-slate-200 text-slate-700 hover:text-[#E50914] text-xs rounded-xl font-medium transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Message Bubbles */}
      <div className="space-y-4 max-w-3xl mx-auto">
        {messages.map((msg) => {
          const isAssistant = msg.role === 'assistant';
          const isSpeakingThis = speakingMessageId === msg.id;

          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
            >
              {/* Assistant Avatar Icon */}
              {isAssistant && (
                <div className="w-8 h-8 rounded-lg bg-[#E50914] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-md font-bold text-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble Card */}
              <div
                className={`max-w-[85%] sm:max-w-[80%] p-4 text-sm shadow-xs ${
                  isAssistant
                    ? 'bg-white border border-slate-200 rounded-2xl rounded-tl-none text-slate-800'
                    : 'bg-slate-800 text-white rounded-2xl rounded-tr-none'
                }`}
              >
                {/* Header for Assistant Message with Source Tag */}
                {isAssistant && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="font-bold text-slate-800">Telko-Bot</span>
                      {msg.matchedCategory && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium text-[10px]">
                          {msg.matchedCategory}
                        </span>
                      )}
                    </div>

                    {msg.source && (
                      <div
                        className="flex items-center gap-1 text-emerald-700 text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-medium"
                        title={msg.source}
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[140px]">{msg.source}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Body Content */}
                <div className={isAssistant ? 'prose-sm text-slate-700 leading-relaxed' : 'text-white'}>
                  {isAssistant ? (
                    <div className="markdown-body">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  )}
                </div>

                {/* Footer Controls for Assistant (TTS Read, Copy, Like) */}
                {isAssistant && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      {/* Audio Narration Button (TTS) */}
                      <button
                        type="button"
                        onClick={() => onSpeakMessage(msg.text, msg.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs ${
                          isSpeakingThis
                            ? 'bg-red-50 text-[#E50914] border border-red-200 animate-pulse'
                            : 'hover:bg-slate-100 text-slate-600 border border-transparent'
                        }`}
                        title={isSpeakingThis ? 'Sedang Membaca...' : 'Dengarkan Jawaban (TTS)'}
                      >
                        {isSpeakingThis ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 text-[#E50914]" />
                            <span>Stop Suara</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Dengarkan</span>
                          </>
                        )}
                      </button>

                      {/* Copy Text Button */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="p-1 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"
                        title="Salin Teks"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Helpful Feedback */}
                      <button
                        type="button"
                        onClick={() => handleLike(msg.id)}
                        className={`p-1 rounded-md transition-colors ${
                          likedIds[msg.id]
                            ? 'text-[#E50914] bg-red-50'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }`}
                        title="Tandai Jawaban Membantu"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(msg.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* User Avatar Icon */}
              {!isAssistant && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Thinking / Searching Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-8 h-8 rounded-lg bg-[#E50914] text-white flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm text-slate-600 shadow-xs flex items-center gap-2.5">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-[#E50914] rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-[#E50914] rounded-full animate-bounce"
                  style={{ animationDelay: '0.15s' }}
                />
                <span
                  className="w-2 h-2 bg-[#E50914] rounded-full animate-bounce"
                  style={{ animationDelay: '0.3s' }}
                />
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Mencari jawaban resmi di Basis Data PPDB...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={scrollEndRef} />
      </div>
    </div>
  );
};

