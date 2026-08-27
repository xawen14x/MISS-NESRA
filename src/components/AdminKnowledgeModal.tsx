import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Search,
  Save,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Database,
  Filter,
  Layers,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { QAItem } from '../types.js';

interface AdminKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKnowledgeUpdated: () => void;
}

const CATEGORIES: QAItem['category'][] = [
  'Jurusan',
  'Syarat',
  'Biaya',
  'Jadwal',
  'Beasiswa',
  'Fasilitas',
  'Kontak',
  'Umum',
];

export const AdminKnowledgeModal: React.FC<AdminKnowledgeModalProps> = ({
  isOpen,
  onClose,
  onKnowledgeUpdated,
}) => {
  const [items, setItems] = useState<QAItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'test'>('list');

  // Form State for Add / Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<QAItem['category']>('Umum');
  const [formQuestion, setFormQuestion] = useState('');
  const [formAlternates, setFormAlternates] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formPriority, setFormPriority] = useState(2);
  const [formSource, setFormSource] = useState('Admin Server PPDB');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Intent Matcher Test State
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<{ match: QAItem | null; score: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchKnowledgeBase();
    }
  }, [isOpen]);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/kb');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch KB:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) {
      showNotification('Pertanyaan dan jawaban wajib diisi!', 'error');
      return;
    }

    const payload = {
      category: formCategory,
      question: formQuestion.trim(),
      alternateQuestions: formAlternates
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      answer: formAnswer.trim(),
      tags: formTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      priority: Number(formPriority),
      source: formSource.trim() || 'Admin PPDB',
    };

    try {
      if (editingId) {
        // Update existing
        const res = await fetch(`/api/kb/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showNotification('Item Q&A berhasil diperbarui!');
          resetForm();
          fetchKnowledgeBase();
          onKnowledgeUpdated();
          setActiveTab('list');
        }
      } else {
        // Create new
        const res = await fetch('/api/kb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showNotification('Item Q&A baru berhasil disimpan!');
          resetForm();
          fetchKnowledgeBase();
          onKnowledgeUpdated();
          setActiveTab('list');
        }
      }
    } catch (err) {
      showNotification('Gagal menyimpan ke server', 'error');
    }
  };

  const handleEdit = (item: QAItem) => {
    setEditingId(item.id);
    setFormCategory(item.category);
    setFormQuestion(item.question);
    setFormAlternates(item.alternateQuestions.join('\n'));
    setFormAnswer(item.answer);
    setFormTags(item.tags.join(', '));
    setFormPriority(item.priority);
    setFormSource(item.source);
    setActiveTab('create');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data Q&A ini?')) return;

    try {
      const res = await fetch(`/api/kb/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showNotification('Item berhasil dihapus');
        fetchKnowledgeBase();
        onKnowledgeUpdated();
      }
    } catch (err) {
      showNotification('Gagal menghapus item', 'error');
    }
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset basis data ke data resmi bawaan SMK Telkom 2 Medan?')) return;
    try {
      const res = await fetch('/api/kb/reset', { method: 'POST' });
      if (res.ok) {
        showNotification('Basis data berhasil di-reset ke standar');
        fetchKnowledgeBase();
        onKnowledgeUpdated();
      }
    } catch (err) {
      showNotification('Gagal me-reset basis data', 'error');
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ppdb_kb_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const res = await fetch('/api/kb/bulk-import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: parsed }),
            });
            if (res.ok) {
              showNotification(`Berhasil mengimpor ${parsed.length} data Q&A!`);
              fetchKnowledgeBase();
              onKnowledgeUpdated();
            }
          }
        } catch (error) {
          showNotification('File JSON tidak valid', 'error');
        }
      };
    }
  };

  const handleRunMatchTest = async () => {
    if (!testQuery.trim()) return;
    setIsTesting(true);
    try {
      const res = await fetch('/api/kb/test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormCategory('Umum');
    setFormQuestion('');
    setFormAlternates('');
    setFormAnswer('');
    setFormTags('');
    setFormPriority(2);
    setFormSource('Admin PPDB');
  };

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

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
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">
                  Kelola Basis Data Q&A PPDB (Admin)
                </h3>
                <span className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 font-semibold rounded-md">
                  {items.length} Data Tersimpan
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Ubah atau tambahkan data Q&A secara dinamis tanpa perlu me-restart server.
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

        {/* Status Notification Toast */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`px-5 py-2 text-xs font-semibold flex items-center gap-2 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                  : 'bg-red-50 text-red-800 border-b border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span>{statusMessage.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                resetForm();
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === 'list'
                  ? 'border-red-600 text-red-600 bg-red-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Q&A ({items.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('create');
                if (!editingId) resetForm();
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'border-red-600 text-red-600 bg-red-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? 'Edit Q&A' : 'Tambah Q&A Baru'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'test'
                  ? 'border-red-600 text-red-600 bg-red-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Uji Pencocokan (Intent Tester)</span>
            </button>
          </div>

          {/* Export / Import Actions */}
          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>
            <label className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-medium transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Impor JSON</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Reset ke data bawaan"
              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab 1: List Q&A */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden p-5">
            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari pertanyaan, jawaban, atau kata kunci..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === 'All'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua ({items.length})
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === cat
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Q&A Cards List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada data Q&A yang cocok</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-red-300 transition-all shadow-xs flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400">Prioritas {item.priority}</span>
                        {item.source && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {item.source}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-semibold text-slate-800 text-sm">{item.question}</h4>

                    {item.alternateQuestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] text-slate-400 font-medium">Variasi:</span>
                        {item.alternateQuestions.map((alt, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md"
                          >
                            "{alt}"
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-sans">
                      {item.answer}
                    </p>

                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Create / Edit Form */}
        {activeTab === 'create' && (
          <form onSubmit={handleSaveForm} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kategori Dokumen *
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prioritas (1 = Tertinggi)
                </label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white"
                >
                  <option value={1}>1 - Sangat Utama (FAQ Prioritas)</option>
                  <option value={2}>2 - Standar / Reguler</option>
                  <option value={3}>3 - Tambahan / Opsional</option>
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber / Dokumen Acuan
                </label>
                <input
                  type="text"
                  value={formSource}
                  onChange={(e) => setFormSource(e.target.value)}
                  placeholder="Contoh: Brosur Resmi PPDB / SK Kepala Sekolah"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Main Question */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pertanyaan Utama Calon Siswa *
              </label>
              <input
                type="text"
                value={formQuestion}
                onChange={(e) => setFormQuestion(e.target.value)}
                placeholder="Contoh: Apa saja syarat pendaftaran PPDB SMK Telkom 2 Medan?"
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white font-medium"
                required
              />
            </div>

            {/* Alternate Variations */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Variasi Kalimat / Kata Kunci Pertanyaan (1 Baris per Variasi)
              </label>
              <textarea
                value={formAlternates}
                onChange={(e) => setFormAlternates(e.target.value)}
                rows={3}
                placeholder="syarat daftar&#10;berkas yang harus dibawa&#10;dokumen pendaftaran"
                className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            {/* Answer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jawaban Resmi & Terverifikasi * (Mendukung Markdown)
              </label>
              <textarea
                value={formAnswer}
                onChange={(e) => setFormAnswer(e.target.value)}
                rows={6}
                placeholder="Tuliskan jawaban resmi secara detail, jelas, dan ramah..."
                className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white font-mono"
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tag / Label (Pisahkan dengan koma)
              </label>
              <input
                type="text"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="syarat, berkas, dokumen, rapor"
                className="w-full px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-red-500 focus:bg-white"
              />
            </div>

            {/* Submit & Cancel Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setActiveTab('list');
                }}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-xs transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{editingId ? 'Simpan Perubahan' : 'Tambah ke Basis Data'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Intent Matcher Test */}
        {activeTab === 'test' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-red-600" />
                Uji Algoritma Pencocokan N-Gram & Semantic Match
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Ketik kalimat pertanyaan bebas calon siswa untuk melihat dokumen mana yang akan
                terpilih oleh RAG engine secara offline beserta nilai skor kemiripannya.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRunMatchTest()}
                  placeholder="Contoh: berapa bayar spp per bulan di rpl?"
                  className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-red-500"
                />
                <button
                  type="button"
                  onClick={handleRunMatchTest}
                  disabled={isTesting || !testQuery.trim()}
                  className="px-5 py-2.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  {isTesting ? 'Menguji...' : 'Uji Kecocokan'}
                </button>
              </div>
            </div>

            {/* Test Result View */}
            {testResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Hasil Pencocokan:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Skor Kesamaan:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        testResult.score >= 0.7
                          ? 'bg-emerald-100 text-emerald-800'
                          : testResult.score >= 0.4
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {(testResult.score * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                {testResult.match ? (
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-md">
                        {testResult.match.category}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {testResult.match.question}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-700 whitespace-pre-wrap">
                      {testResult.match.answer}
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Sumber: {testResult.match.source}</span>
                      <span>Tags: {testResult.match.tags.join(', ')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-amber-500" />
                    <p className="text-xs">
                      Tidak ada dokumen lokal yang cocok secara langsung. Pertanyaan ini akan
                      dialirkan ke AI Fallback RAG.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
