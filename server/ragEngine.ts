import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { QAItem } from '../src/types.js';

const DATA_FILE_PATH = path.join(process.cwd(), 'server', 'data', 'ppdb_data.json');

// In-memory cache of the knowledge base
let knowledgeBase: QAItem[] = [];

// Initialize or load dataset
export function loadKnowledgeBase(): QAItem[] {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      knowledgeBase = JSON.parse(raw);
    } else {
      knowledgeBase = [];
    }
  } catch (err) {
    console.error('Error reading knowledge base file:', err);
    knowledgeBase = [];
  }
  return knowledgeBase;
}

export function saveKnowledgeBase(items: QAItem[]): boolean {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(items, null, 2), 'utf-8');
    knowledgeBase = items;
    return true;
  } catch (err) {
    console.error('Error saving knowledge base file:', err);
    return false;
  }
}

export function getKnowledgeBase(): QAItem[] {
  if (!knowledgeBase || knowledgeBase.length === 0) {
    return loadKnowledgeBase();
  }
  return knowledgeBase;
}

// Tokenize & normalize text for local scoring
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

// Compute Jaccard / token overlap similarity score between query and item
export function findBestMatchLocal(query: string): { match: QAItem | null; score: number } {
  const items = getKnowledgeBase();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return { match: null, score: 0 };
  }

  let bestMatch: QAItem | null = null;
  let bestScore = 0;

  for (const item of items) {
    // Check main question
    const questionTokens = tokenize(item.question);
    const tagTokens = item.tags.map((t) => t.toLowerCase());

    // Check alternate questions
    const allCandidateTexts = [
      item.question,
      ...item.alternateQuestions,
      ...item.tags,
    ];

    for (const text of allCandidateTexts) {
      const candidateTokens = tokenize(text);
      const intersection = queryTokens.filter((token) =>
        candidateTokens.some(
          (ct) => ct === token || ct.includes(token) || token.includes(ct)
        )
      );

      const score = (intersection.length * 2) / (queryTokens.length + candidateTokens.length);

      // Exact substring boost
      const cleanText = text.toLowerCase();
      const cleanQuery = query.toLowerCase();
      let boost = 0;
      if (cleanText.includes(cleanQuery) || cleanQuery.includes(cleanText)) {
        boost += 0.35;
      }

      const totalScore = Math.min(1.0, score + boost);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestMatch = item;
      }
    }
  }

  return { match: bestMatch, score: bestScore };
}

// Helper to initialize Gemini API client securely
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const CLOSING_PHRASE = 'Jika ada yang ingin ditanyakan, saya senang hati akan menjawabnya.';

function appendClosingPhrase(text: string): string {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().includes('jika ada yang ingin ditanyakan') || 
      trimmed.toLowerCase().includes('senang hati akan menjawabnya')) {
    return trimmed;
  }
  return `${trimmed}\n\n${CLOSING_PHRASE}`;
}

// Smart RAG generation via Gemini 3.7 Flash
export async function queryRAGWithGemini(
  userQuery: string,
  history: Array<{ role: string; text: string }> = []
): Promise<{ text: string; source: string; category?: string; score: number }> {
  // First check local match with high confidence (e.g. score >= 0.85)
  const local = findBestMatchLocal(userQuery);
  if (local.match && local.score >= 0.85) {
    return {
      text: appendClosingPhrase(local.match.answer),
      source: `Basis Data Resmi PPDB (${local.match.source})`,
      category: local.match.category,
      score: local.score,
    };
  }

  // If local match is good but not exact, or query is complex, use Gemini with context
  const ai = getGeminiClient();
  const items = getKnowledgeBase();

  // Create compact context from knowledge base
  const contextList = items
    .map(
      (item, idx) =>
        `[Dokumen ${idx + 1} - Kategori: ${item.category} | Sumber: ${item.source}]\nPertanyaan: ${item.question}\nKata Kunci/Variasi: ${item.alternateQuestions.join(', ')}\nJawaban Resmi:\n${item.answer}`
    )
    .join('\n\n---\n\n');

  if (!ai) {
    // Fallback when no GEMINI_API_KEY: return best local match or default help
    if (local.match && local.score > 0.3) {
      return {
        text: appendClosingPhrase(local.match.answer),
        source: `Basis Data Offline (${local.match.source})`,
        category: local.match.category,
        score: local.score,
      };
    }
    return {
      text: appendClosingPhrase(
        'Halo! Saya Asisten Virtual PPDB SMK Telkom 2 Medan. Saya dapat memberikan informasi seputar pendaftaran siswa baru, jurusan RPL, TKJ, DKV, TJAT, rincian biaya, jadwal seleksi, dan beasiswa. Silakan ajukan pertanyaan Anda secara lebih spesifik atau pilih topik di bawah.'
      ),
      source: 'Basis Data Lokal SMK Telkom 2 Medan',
      category: 'Umum',
      score: 0.5,
    };
  }

  try {
    const systemPrompt = `Anda adalah "TelkoBot", Asisten Virtual Cerdas & Ramah Layanan Informasi PPDB (Pendaftaran Peserta Didik Baru) SMK Telkom 2 Medan (Jl. Halat No. 8 Medan).

Pedoman Perilaku:
1. Bersikaplah ramah, profesional, solutif, dan antusias menyambut calon siswa/wali murid dalam Bahasa Indonesia yang baik dan terstruktur.
2. Gunakan HANYA informasi yang relevan dari DOKUMEN BASIS DATA RESMI berikut untuk menjawab pertanyaan pengguna.
3. Berikan informasi yang akurat seputar:
   - 4 Jurusan: RPL (Rekayasa Perangkat Lunak), TKJ (Teknik Komputer & Jaringan), DKV (Desain Komunikasi Visual), dan TJAT (Teknik Jaringan Akses Telekomunikasi).
   - Biaya, DPP, SPP, Seragam, Beasiswa, Jadwal Gelombang, Syarat Berkas, Fasilitas Lab & Kontak Resmi (0812-6000-8802).
4. Gunakan format markdown yang rapi (poin-poin, bold untuk hal penting).
5. Jangan mengarang informasi yang bertentangan dengan basis data resmi. Jika pertanyaan tidak terdapat dalam data, sarankan dengan sopan untuk menghubungi Sekretariat PPDB di Jl. Halat No. 8 Medan atau via WhatsApp Panitia 0812-6000-8802.
6. Jawaban harus padat, jelas, dan enak dibacakan oleh narator suara (TTS).
7. Di bagian paling akhir jawaban, selalu pastikan ada kalimat: "Jika ada yang ingin ditanyakan, saya senang hati akan menjawabnya."

=== DOKUMEN BASIS DATA RESMI PPDB SMK TELKOM 2 MEDAN ===
${contextList}
=========================================================`;

    const recentHistory = history.slice(-4).map((h) => `${h.role === 'user' ? 'Calon Siswa' : 'Asisten'}: ${h.text}`).join('\n');
    const promptText = `${recentHistory ? `Riwayat Percakapan Sebelumnya:\n${recentHistory}\n\n` : ''}Pertanyaan Calon Siswa / Wali Murid: ${userQuery}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.4,
      },
    });

    const generatedText = response.text || '';

    return {
      text: appendClosingPhrase(generatedText),
      source: local.match ? `RAG AI + Basis Data PPDB (${local.match.category})` : 'AI Virtual Assistant PPDB Telkom 2',
      category: local.match?.category || 'Umum',
      score: local.score > 0 ? local.score : 0.9,
    };
  } catch (error) {
    console.error('Error invoking Gemini RAG:', error);
    // Fallback to best local match if Gemini fails
    if (local.match) {
      return {
        text: appendClosingPhrase(local.match.answer),
        source: `Basis Data Cadangan (${local.match.source})`,
        category: local.match.category,
        score: local.score,
      };
    }
    return {
      text: appendClosingPhrase(
        'Mohon maaf, terjadi kendala saat memproses jawaban. Anda dapat langsung menanyakan seputar Jurusan (RPL, TKJ, DKV, TJAT), Biaya Pendidikan, Syarat Berkas, atau menghubungi Panitia PPDB di WhatsApp 0812-6000-8802.'
      ),
      source: 'Sistem Failover PPDB',
      category: 'Umum',
      score: 0.1,
    };
  }
}
