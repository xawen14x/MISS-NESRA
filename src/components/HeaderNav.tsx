import React from 'react';
import {
  Menu,
  Database,
  Server,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface HeaderNavProps {
  onToggleSidebar: () => void;
  onOpenAdmin: () => void;
  onOpenArch: () => void;
  onResetSession: () => void;
  kbItemCount: number;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  onToggleSidebar,
  onOpenAdmin,
  onOpenArch,
  onResetSession,
  kbItemCount,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Mobile Toggle & Brand / Quote */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-xl lg:hidden transition-colors"
          title="Buka Menu Riwayat"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#E50914] text-white flex items-center justify-center font-bold text-sm shadow-md">
            T2
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight">
                SMK TELKOM 2 MEDAN
              </h1>
              <span className="hidden md:inline-flex px-2 py-0.5 text-[10px] font-bold bg-red-50 text-[#E50914] border border-red-200 rounded-full">
                PPDB 2026/2027
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest hidden sm:block">
              AI Virtual Assistant & Voice Q&A
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 pl-3">
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-xs text-slate-500 font-medium italic">
            "Pendidikan adalah senjata paling mematikan untuk mengubah dunia"
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Standalone Architecture Guide Button */}
        <button
          type="button"
          id="btn-open-architecture"
          onClick={onOpenArch}
          className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          title="Lihat Arsitektur Standalone Python / FastAPI"
        >
          <Server className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">Arsitektur</span>
        </button>

        {/* Admin Knowledge Base Manager Button */}
        <button
          type="button"
          id="btn-open-admin-kb"
          onClick={onOpenAdmin}
          className="px-3.5 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          title="Kelola Q&A Basis Data PPDB"
        >
          <Database className="w-3.5 h-3.5 text-[#E50914]" />
          <span className="hidden sm:inline">Admin Panel</span>
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">
            {kbItemCount}
          </span>
        </button>

        {/* Reset Session Button */}
        <button
          type="button"
          id="btn-reset-session-header"
          onClick={onResetSession}
          className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs"
          title="Mulai Percakapan Baru"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset Session</span>
        </button>
      </div>
    </header>
  );
};

