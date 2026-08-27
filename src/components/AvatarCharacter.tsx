import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Volume2, Cpu, CheckCircle2 } from 'lucide-react';
import { AvatarState } from '../types.js';

interface AvatarCharacterProps {
  state: AvatarState;
  onStateClick?: () => void;
  subtitle?: string;
}

export const AvatarCharacter: React.FC<AvatarCharacterProps> = ({
  state,
  onStateClick,
  subtitle,
}) => {
  const [blink, setBlink] = useState(false);

  // Periodic blinking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  const stateLabels: Record<AvatarState, { title: string; color: string; bg: string; border: string }> = {
    idle: {
      title: 'Siap Membantu (Standby)',
      color: 'text-slate-700',
      bg: 'bg-slate-100',
      border: 'border-slate-300',
    },
    listening: {
      title: 'Mendengarkan Suara...',
      color: 'text-[#E50914] font-bold',
      bg: 'bg-red-50',
      border: 'border-red-500',
    },
    thinking: {
      title: 'Mencari Data PPDB...',
      color: 'text-amber-700 font-bold',
      bg: 'bg-amber-50',
      border: 'border-amber-400',
    },
    speaking: {
      title: 'Menjawab dengan Suara...',
      color: 'text-[#E50914] font-bold',
      bg: 'bg-red-100',
      border: 'border-red-600',
    },
  };

  return (
    <div
      id="avatar-character-container"
      className="flex flex-col items-center justify-center p-3 select-none relative"
      onClick={onStateClick}
    >
      {/* Outer Glow & Professional Polish Concentric Circles */}
      <div className="relative flex items-center justify-center cursor-pointer group">
        {/* Outermost Ring */}
        <motion.div
          animate={
            state === 'listening'
              ? { scale: [1, 1.08, 1], opacity: [0.3, 0.7, 0.3] }
              : state === 'speaking'
              ? { scale: [1, 1.04, 1] }
              : { scale: 1 }
          }
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className={`w-40 h-40 sm:w-44 sm:h-44 rounded-full border-4 ${
            state === 'listening' || state === 'speaking'
              ? 'border-red-600/30 bg-red-500/5'
              : 'border-slate-200 bg-slate-50/50'
          } flex items-center justify-center transition-all duration-300`}
        >
          {/* Middle Ring */}
          <motion.div
            animate={
              state === 'thinking'
                ? { rotate: 360 }
                : state === 'listening'
                ? { scale: [1, 1.05, 1] }
                : {}
            }
            transition={
              state === 'thinking'
                ? { repeat: Infinity, duration: 4, ease: 'linear' }
                : { repeat: Infinity, duration: 1.2 }
            }
            className={`w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 ${
              state === 'listening' || state === 'speaking'
                ? 'border-[#E50914] bg-red-50'
                : state === 'thinking'
                ? 'border-dashed border-amber-500 bg-amber-50/50'
                : 'border-slate-300 bg-white'
            } flex items-center justify-center transition-all duration-300`}
          >
            {/* Core Dark AI Iris / Face */}
            <motion.div
              animate={
                state === 'speaking'
                  ? { y: [0, -3, 0, -2, 0] }
                  : state === 'listening'
                  ? { scale: [1, 1.03, 1] }
                  : { y: [0, -2, 0] }
              }
              transition={{
                repeat: Infinity,
                duration: state === 'speaking' ? 0.6 : 3,
                ease: 'easeInOut',
              }}
              className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-900 rounded-full flex flex-col items-center justify-center overflow-hidden relative shadow-2xl border-2 border-slate-700"
            >
              {/* Laser / Scanner Line Effect for Thinking / Listening */}
              {(state === 'listening' || state === 'thinking' || state === 'speaking') && (
                <motion.div
                  animate={{ y: [-30, 30, -30] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  className="absolute h-1 w-full bg-[#E50914] shadow-[0_0_15px_#E50914] opacity-80 pointer-events-none"
                />
              )}

              {/* Top Badge */}
              <div className="absolute top-2.5 z-10">
                <span className="text-[8px] font-extrabold tracking-widest text-slate-400 uppercase">
                  TELKO-AI
                </span>
              </div>

              {/* Digital Eyes */}
              <div className="flex items-center justify-center gap-5 sm:gap-6 mt-2 z-10">
                {/* Left Eye */}
                <div
                  className={`transition-all duration-150 rounded-full ${
                    blink
                      ? 'h-0.5 w-3.5 bg-red-400'
                      : state === 'thinking'
                      ? 'h-3.5 w-3.5 bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse'
                      : state === 'listening' || state === 'speaking'
                      ? 'h-3.5 w-3.5 bg-[#E50914] shadow-[0_0_12px_#E50914]'
                      : 'h-3 w-3 bg-red-500 shadow-[0_0_8px_#ef4444]'
                  }`}
                >
                  {!blink && (
                    <div className="w-1 h-1 bg-white rounded-full translate-x-0.5 translate-y-0.5" />
                  )}
                </div>

                {/* Right Eye */}
                <div
                  className={`transition-all duration-150 rounded-full ${
                    blink
                      ? 'h-0.5 w-3.5 bg-red-400'
                      : state === 'thinking'
                      ? 'h-3.5 w-3.5 bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-pulse'
                      : state === 'listening' || state === 'speaking'
                      ? 'h-3.5 w-3.5 bg-[#E50914] shadow-[0_0_12px_#E50914]'
                      : 'h-3 w-3 bg-red-500 shadow-[0_0_8px_#ef4444]'
                  }`}
                >
                  {!blink && (
                    <div className="w-1 h-1 bg-white rounded-full translate-x-0.5 translate-y-0.5" />
                  )}
                </div>
              </div>

              {/* Digital Mouth / Visualizer */}
              <div className="h-4 flex items-center justify-center mt-2.5 z-10">
                {state === 'speaking' ? (
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 0.3 }}
                      className="w-1 bg-[#E50914] rounded-full shadow-[0_0_6px_#E50914]"
                    />
                    <motion.div
                      animate={{ height: [6, 16, 6] }}
                      transition={{ repeat: Infinity, duration: 0.25, delay: 0.1 }}
                      className="w-1.5 bg-[#E50914] rounded-full shadow-[0_0_8px_#E50914]"
                    />
                    <motion.div
                      animate={{ height: [4, 12, 4] }}
                      transition={{ repeat: Infinity, duration: 0.35, delay: 0.15 }}
                      className="w-1 bg-[#E50914] rounded-full shadow-[0_0_6px_#E50914]"
                    />
                  </div>
                ) : state === 'listening' ? (
                  <div className="w-4 h-1 bg-red-500 rounded-full animate-pulse shadow-[0_0_6px_#ef4444]" />
                ) : state === 'thinking' ? (
                  <div className="w-3 h-1 bg-amber-400 rounded-full animate-bounce" />
                ) : (
                  <div className="w-3.5 h-0.5 bg-slate-600 rounded-full" />
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Status Pill Badge directly below the ring */}
        <div
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-md flex items-center gap-1.5 whitespace-nowrap z-20 ${
            state === 'listening'
              ? 'bg-[#E50914] text-white animate-pulse'
              : state === 'speaking'
              ? 'bg-[#E50914] text-white animate-bounce'
              : state === 'thinking'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 text-white'
          }`}
        >
          {state === 'listening' && <Mic className="w-3 h-3" />}
          {state === 'speaking' && <Volume2 className="w-3 h-3" />}
          {state === 'thinking' && <Cpu className="w-3 h-3 animate-spin" />}
          {state === 'idle' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          <span>{state.toUpperCase()}</span>
        </div>
      </div>

      {/* Subtitle / User Voice Transcription Preview */}
      {subtitle && (
        <p className="text-xs text-slate-500 mt-4 max-w-sm text-center italic line-clamp-2 px-2">
          "{subtitle}"
        </p>
      )}
    </div>
  );
};

