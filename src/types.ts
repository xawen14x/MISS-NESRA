export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface QAItem {
  id: string;
  category: 'Jurusan' | 'Syarat' | 'Biaya' | 'Jadwal' | 'Beasiswa' | 'Fasilitas' | 'Kontak' | 'Umum';
  question: string;
  alternateQuestions: string[];
  answer: string;
  tags: string[];
  priority: number; // 1 (highest) to 5
  updatedAt: string;
  source: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  audioUrl?: string;
  matchedCategory?: string;
  matchedScore?: number;
  source?: string;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface VoiceSettings {
  autoPlayTTS: boolean;
  speechRate: number; // 0.8 to 1.3
  pitch: number;
  selectedVoiceName: string;
  voiceLanguage: string;
}

export interface PPDBInfoSummary {
  schoolName: string;
  accreditation: string;
  currentYear: string;
  activeWave: string;
  hotline: string;
  address: string;
  website: string;
  registrationStatus: 'Buka' | 'Segera Dibuka' | 'Tutup';
}
