import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import {
  getKnowledgeBase,
  saveKnowledgeBase,
  loadKnowledgeBase,
  queryRAGWithGemini,
  findBestMatchLocal,
} from './server/ragEngine.js';
import { STANDALONE_PYTHON_DOCS } from './server/pythonDocs.js';
import { QAItem } from './src/types.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Initialize Knowledge Base
  loadKnowledgeBase();

  // 1. Health check & Server Status
  app.get('/api/health', (req, res) => {
    const kb = getKnowledgeBase();
    res.json({
      status: 'online',
      school: 'SMK Telkom 2 Medan',
      service: 'AI Virtual Assistant PPDB',
      kbCount: kb.length,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Chat Endpoint (Q&A via RAG Engine)
  app.post('/api/chat', async (req, res) => {
    try {
      const { query, history } = req.body;
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({ error: 'Query tidak boleh kosong' });
      }

      const result = await queryRAGWithGemini(query.trim(), history || []);
      return res.json(result);
    } catch (err: any) {
      console.error('Error in /api/chat:', err);
      return res.status(500).json({
        error: 'Terjadi kesalahan saat memproses pertanyaan',
        details: err?.message,
      });
    }
  });

  // 3. Match Test Endpoint (Test local Intent Matcher)
  app.post('/api/kb/test-match', (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query diperlukan' });
    }
    const result = findBestMatchLocal(query);
    res.json(result);
  });

  // 4. Knowledge Base CRUD Endpoints for Server Admin
  app.get('/api/kb', (req, res) => {
    const kb = getKnowledgeBase();
    res.json(kb);
  });

  app.post('/api/kb', (req, res) => {
    try {
      const { question, alternateQuestions, answer, category, tags, priority, source } = req.body;
      if (!question || !answer) {
        return res.status(400).json({ error: 'Pertanyaan dan jawaban wajib diisi' });
      }

      const items = getKnowledgeBase();
      const newItem: QAItem = {
        id: `kb-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
        category: category || 'Umum',
        question: question.trim(),
        alternateQuestions: Array.isArray(alternateQuestions)
          ? alternateQuestions.map((s: string) => s.trim()).filter(Boolean)
          : [],
        answer: answer.trim(),
        tags: Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : [],
        priority: Number(priority) || 2,
        updatedAt: new Date().toISOString(),
        source: source?.trim() || 'Admin PPDB',
      };

      const updated = [newItem, ...items];
      const saved = saveKnowledgeBase(updated);
      if (!saved) {
        return res.status(500).json({ error: 'Gagal menyimpan ke basis data' });
      }

      res.status(201).json({ message: 'Q&A berhasil ditambahkan', item: newItem });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menambah item', details: err?.message });
    }
  });

  app.put('/api/kb/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { question, alternateQuestions, answer, category, tags, priority, source } = req.body;
      const items = getKnowledgeBase();
      const index = items.findIndex((i) => i.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Item Q&A tidak ditemukan' });
      }

      const updatedItem: QAItem = {
        ...items[index],
        question: question !== undefined ? question.trim() : items[index].question,
        alternateQuestions: Array.isArray(alternateQuestions)
          ? alternateQuestions.map((s: string) => s.trim()).filter(Boolean)
          : items[index].alternateQuestions,
        answer: answer !== undefined ? answer.trim() : items[index].answer,
        category: category !== undefined ? category : items[index].category,
        tags: Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : items[index].tags,
        priority: priority !== undefined ? Number(priority) : items[index].priority,
        source: source !== undefined ? source.trim() : items[index].source,
        updatedAt: new Date().toISOString(),
      };

      items[index] = updatedItem;
      saveKnowledgeBase(items);

      res.json({ message: 'Item Q&A berhasil diperbarui', item: updatedItem });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal memperbarui item', details: err?.message });
    }
  });

  app.delete('/api/kb/:id', (req, res) => {
    try {
      const { id } = req.params;
      const items = getKnowledgeBase();
      const filtered = items.filter((i) => i.id !== id);

      if (filtered.length === items.length) {
        return res.status(404).json({ error: 'Item tidak ditemukan' });
      }

      saveKnowledgeBase(filtered);
      res.json({ message: 'Item Q&A berhasil dihapus' });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal menghapus item', details: err?.message });
    }
  });

  // 5. Reset Knowledge Base to default
  app.post('/api/kb/reset', (req, res) => {
    try {
      const raw = loadKnowledgeBase();
      res.json({ message: 'Basis data berhasil di-refresh', count: raw.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal me-reset basis data' });
    }
  });

  // 6. Bulk Import Knowledge Base
  app.post('/api/kb/bulk-import', (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Format data harus berupa array JSON' });
      }

      const validItems: QAItem[] = items.map((item: any, idx: number) => ({
        id: item.id || `kb-imp-${Date.now()}-${idx}`,
        category: item.category || 'Umum',
        question: String(item.question || '').trim(),
        alternateQuestions: Array.isArray(item.alternateQuestions) ? item.alternateQuestions : [],
        answer: String(item.answer || '').trim(),
        tags: Array.isArray(item.tags) ? item.tags : [],
        priority: Number(item.priority) || 2,
        updatedAt: new Date().toISOString(),
        source: item.source || 'Import Admin',
      })).filter((i) => i.question && i.answer);

      saveKnowledgeBase(validItems);
      res.json({ message: 'Impor basis data berhasil', count: validItems.length });
    } catch (err: any) {
      res.status(500).json({ error: 'Gagal mengimpor data', details: err?.message });
    }
  });

  // 7. Standalone Python Architecture & Deployment Specification Documentation
  app.get('/api/architecture', (req, res) => {
    res.json(STANDALONE_PYTHON_DOCS);
  });

  // 8. Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server AI PPDB SMK Telkom 2 Medan berjalan di http://localhost:${PORT}`);
  });
}

startServer();
