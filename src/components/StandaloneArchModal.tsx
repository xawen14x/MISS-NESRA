import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Server,
  FolderTree,
  Code2,
  Terminal,
  Cpu,
  Layers,
  ShieldCheck,
  FileCode,
  FileJson,
  BookOpen,
} from 'lucide-react';

interface StandaloneArchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandaloneArchModal: React.FC<StandaloneArchModalProps> = ({ isOpen, onClose }) => {
  const [archDocs, setArchDocs] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'fastapi' | 'rag' | 'voice' | 'deploy'>(
    'overview'
  );
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/architecture')
        .then((res) => res.json())
        .then((data) => setArchDocs(data))
        .catch((err) => console.error(err));
    }
  }, [isOpen]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Server className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">
                  Arsitektur & Panduan Standalone Server (Private/Local)
                </h3>
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 font-semibold rounded-md">
                  FastAPI + Offline AI/STT/TTS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Spesifikasi teknis, struktur folder, kode backend Python, dan konfigurasi deploy
                offline.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-2 bg-white overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Struktur Folder & Skema</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fastapi')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'fastapi'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Backend: main.py (FastAPI)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rag')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rag'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>RAG & Intent Matcher</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'voice'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>STT (Whisper) & TTS (Piper)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deploy')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'deploy'
                ? 'border-red-600 text-red-600 bg-red-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Panduan Deploy & Docker</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700 space-y-4">
          {/* Tab 1: Overview & Folder Structure */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="font-bold text-slate-800 text-sm mb-1">
                  Arsitektur Sistem AI Q&A Standalone (On-Premise)
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Sistem dirancang untuk berjalan di server lokal (tanpa koneksi internet keluar
                  wajib jika menggunakan model Whisper & Piper lokal) atau hybrid dengan cloud
                  fallback.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-800">1. Frontend Layer</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      React + Tailwind CSS, Avatar State Controller, Web Speech API & Web Audio
                      Visualizer.
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-800">2. RAG & KB Layer</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Dynamic JSON / SQLite Store, N-Gram TF-IDF Similarity + Cosine Matcher, Admin
                      REST API.
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-800">3. Offline Voice Layer</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Faster-Whisper (STT Bahasa Indonesia) + Piper-TTS ONNX Neural Engine.
                    </p>
                  </div>
                </div>
              </div>

              {/* Folder Tree Code Block */}
              <div className="relative">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-slate-300 rounded-t-xl">
                  <span className="font-mono text-[11px]">Struktur Folder Proyek Keseluruhan</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(archDocs?.folderStructure || '', 'folderStructure')
                    }
                    className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
                  >
                    {copiedSection === 'folderStructure' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Salin</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-b-xl overflow-x-auto">
                  {archDocs?.folderStructure || 'Memuat...'}
                </pre>
              </div>

              {/* Data Schema Specification */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <h5 className="font-bold text-slate-800">Skema Format Data Q&A (JSON / SQLite Schema)</h5>
                <p className="text-[11px] text-slate-600">
                  Format standar ini dapat diedit langsung oleh Admin Server melalui UI maupun file
                  JSON lokal:
                </p>
                <pre className="p-3 bg-white border border-slate-200 rounded-lg font-mono text-[11px] overflow-x-auto text-slate-800">
{`{
  "id": "kb-001",
  "category": "Jurusan | Syarat | Biaya | Jadwal | Beasiswa | Fasilitas | Kontak | Umum",
  "question": "Pertanyaan utama calon siswa",
  "alternateQuestions": ["variasi pertanyaan 1", "kata kunci sinonim 2"],
  "answer": "Jawaban lengkap dan resmi yang akan dibacakan TTS",
  "tags": ["tag1", "tag2"],
  "priority": 1,
  "updatedAt": "2026-02-26T10:00:00.000Z",
  "source": "Brosur Resmi PPDB TA 2026/2027"
}`}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 2: FastAPI main.py */}
          {activeTab === 'fastapi' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Implementasi server backend menggunakan <strong>Python (FastAPI)</strong> dengan
                  endpoint <code>/api/chat</code>, <code>/api/stt</code>, <code>/api/tts</code>, dan CRUD
                  Knowledge Base.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(archDocs?.fastApiMainPy || '', 'fastapi')}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  {copiedSection === 'fastapi' ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin Kode main.py</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto">
                {archDocs?.fastApiMainPy || 'Memuat...'}
              </pre>
            </div>
          )}

          {/* Tab 3: Python RAG Engine */}
          {activeTab === 'rag' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Algoritma pencocokan pertanyaan dinamis (N-Gram TF-IDF Vectorizer + Cosine
                  Similarity) yang memperbarui indeks otomatis saat Admin mengubah data.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(archDocs?.pythonRagEngine || '', 'rag')}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  {copiedSection === 'rag' ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin Kode rag_engine.py</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto">
                {archDocs?.pythonRagEngine || 'Memuat...'}
              </pre>
            </div>
          )}

          {/* Tab 4: STT (Whisper) & TTS (Piper) */}
          {activeTab === 'voice' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Modul <strong>Faster-Whisper</strong> untuk Speech-to-Text bahasa Indonesia dan{' '}
                  <strong>Piper-TTS ONNX</strong> untuk narasi suara natural berlatensi rendah.
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(archDocs?.pythonSttTtsEngine || '', 'voice')}
                  className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  {copiedSection === 'voice' ? (
                    <Check className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Salin Kode Voice Engine</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto">
                {archDocs?.pythonSttTtsEngine || 'Memuat...'}
              </pre>
            </div>
          )}

          {/* Tab 5: Deployment & Docker Guide */}
          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">
                  Langkah-Langkah Menjalankan di Server Lokal (Ubuntu / Windows / MacOS)
                </h4>

                <div className="space-y-2">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-800">Langkah 1: Setup Backend Python</p>
                    <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[11px]">
{`cd backend
python -m venv venv
source venv/bin/activate  # (atau venv\\Scripts\\activate di Windows)
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`}
                    </pre>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-800">Langkah 2: Setup Frontend React</p>
                    <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[11px]">
{`cd frontend
npm install
npm run dev`}
                    </pre>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-800">
                      Langkah 3: Deploy 1-Click Menggunakan Docker Compose
                    </p>
                    <pre className="mt-1.5 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[11px]">
{`docker-compose up -d --build`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Docker Compose File */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-700">docker-compose.yml</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(archDocs?.dockerCompose || '', 'docker')}
                    className="flex items-center gap-1 text-[11px] text-red-600 hover:text-red-800 font-medium"
                  >
                    {copiedSection === 'docker' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>Salin docker-compose.yml</span>
                  </button>
                </div>
                <pre className="p-4 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-xl overflow-x-auto">
                  {archDocs?.dockerCompose || 'Memuat...'}
                </pre>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
