import React from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Phone,
  MapPin,
  Sparkles,
  BookOpen,
  DollarSign,
  GraduationCap,
  FileText,
  Bot,
} from 'lucide-react';
import { ChatSession } from '../types.js';

interface SidebarHistoryProps {
  sessions: ChatSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onClearAllSessions: () => void;
  onQuickCategoryClick: (category: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarHistory: React.FC<SidebarHistoryProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onClearAllSessions,
  onQuickCategoryClick,
  isOpen,
  onClose,
}) => {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        id="sidebar-history"
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Sidebar Header with Professional Polish Badge */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E50914] rounded-lg flex items-center justify-center shadow-md shrink-0">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                AI ASSISTANT
              </h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                SMK Telkom 2 Medan
              </p>
            </div>
          </div>

          <button
            type="button"
            id="new-chat-button"
            onClick={() => {
              onNewSession();
              if (window.innerWidth < 1024) onClose();
            }}
            className="p-2 text-slate-400 hover:text-[#E50914] hover:bg-red-50 rounded-lg transition-colors"
            title="Percakapan Baru"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Topic Shortcuts */}
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Topik Utama PPDB
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onQuickCategoryClick('Jurusan')}
              className="flex items-center gap-1.5 p-1.5 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-left"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#E50914] shrink-0" />
              <span className="truncate">4 Jurusan</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickCategoryClick('Biaya')}
              className="flex items-center gap-1.5 p-1.5 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-left"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">Biaya & SPP</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickCategoryClick('Syarat')}
              className="flex items-center gap-1.5 p-1.5 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-left"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Syarat Berkas</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickCategoryClick('Beasiswa')}
              className="flex items-center gap-1.5 p-1.5 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors text-left"
            >
              <GraduationCap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">Beasiswa</span>
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex justify-between items-center mb-3 px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              History Percakapan
            </span>
            {sessions.length > 0 && (
              <button
                type="button"
                id="clear-all-history-button"
                onClick={onClearAllSessions}
                className="text-[10px] text-red-600 font-semibold hover:underline"
              >
                Clear All
              </button>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 px-4 text-slate-400">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada riwayat percakapan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      if (window.innerWidth < 1024) onClose();
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? 'bg-slate-50 border border-slate-300 shadow-xs'
                        : 'hover:bg-slate-50 border border-transparent text-slate-700'
                    }`}
                  >
                    <p className={`text-xs truncate ${isActive ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {session.title}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(session.updatedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      • {session.messages.length} pesan
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Footer: Server & Model Status */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Server: Standalone Online
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Model: RAG-Local v1.2
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#E50914]" />
              <a
                href="https://wa.me/6281260008802"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#E50914] font-semibold"
              >
                0812-6000-8802
              </a>
            </div>
            <span>Jl. Halat No. 8</span>
          </div>
        </div>
      </aside>
    </>
  );
};

