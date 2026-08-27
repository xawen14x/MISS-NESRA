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

// Clean and normalize text
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Tokenize text into words
function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((w) => w.length > 0);
}

// Extract word N-Grams (N-Gen)
function getWordNGrams(words: string[], n: number): Set<string> {
  const nGrams = new Set<string>();
  if (words.length < n) {
    if (words.length > 0) {
      nGrams.add(words.join(' '));
    }
    return nGrams;
  }
  for (let i = 0; i <= words.length - n; i++) {
    nGrams.add(words.slice(i, i + n).join(' '));
  }
  return nGrams;
}

// Extract character N-Grams (N-Gen) to catch typos, prefixes, and suffixes
function getCharNGrams(text: string, n: number): Set<string> {
  const clean = text.replace(/\s+/g, '');
  const nGrams = new Set<string>();
  if (clean.length < n) {
    if (clean.length > 0) nGrams.add(clean);
    return nGrams;
  }
  for (let i = 0; i <= clean.length - n; i++) {
    nGrams.add(clean.substring(i, i + n));
  }
  return nGrams;
}

// Dice's similarity coefficient for N-Grams
function diceCoefficient(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }
  return (2 * intersection) / (setA.size + setB.size);
}

// Jaccard similarity for token overlap
function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Multi-layer N-Gen (N-Gram) Similarity Matching Algorithm:
 * - Word Unigram (1-gen) & Bigram (2-gen) & Trigram (3-gen)
 * - Character 3-gen & 4-gen
 * - Substring containment boost
 */
export function computeNGenSimilarity(text1: string, text2: string): number {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  const words1 = tokenize(norm1);
  const words2 = tokenize(norm2);

  // Exact substring match
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const ratio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
    if (ratio > 0.6) return Math.min(1.0, 0.85 + ratio * 0.15);
  }

  // 1. Word N-Grams (1-gen, 2-gen, 3-gen)
  const unigrams1 = getWordNGrams(words1, 1);
  const unigrams2 = getWordNGrams(words2, 1);
  const unigramDice = diceCoefficient(unigrams1, unigrams2);
  const unigramJaccard = jaccardSimilarity(unigrams1, unigrams2);

  const bigrams1 = getWordNGrams(words1, 2);
  const bigrams2 = getWordNGrams(words2, 2);
  const bigramDice = diceCoefficient(bigrams1, bigrams2);

  const trigrams1 = getWordNGrams(words1, 3);
  const trigrams2 = getWordNGrams(words2, 3);
  const trigramDice = diceCoefficient(trigrams1, trigrams2);

  // 2. Character N-Grams (3-gen, 4-gen) for morphological & typo resilience
  const char3Grams1 = getCharNGrams(norm1, 3);
  const char3Grams2 = getCharNGrams(norm2, 3);
  const char3Dice = diceCoefficient(char3Grams1, char3Grams2);

  const char4Grams1 = getCharNGrams(norm1, 4);
  const char4Grams2 = getCharNGrams(norm2, 4);
  const char4Dice = diceCoefficient(char4Grams1, char4Grams2);

  // Weighted Combination of N-Gen scores
  const score =
    unigramDice * 0.35 +
    unigramJaccard * 0.15 +
    bigramDice * 0.2 +
    trigramDice * 0.1 +
    char3Dice * 0.1 +
    char4Dice * 0.1;

  return Math.min(1.0, Math.max(0, score));
}

// Compute highest N-Gen similarity score against the entire SPMB knowledge base
export function findBestMatchLocal(query: string): { match: QAItem | null; score: number } {
  const items = getKnowledgeBase();
  const queryTokens = tokenize(query);

  if (queryTokens.length === 0) {
    return { match: null, score: 0 };
  }

  let bestMatch: QAItem | null = null;
  let bestScore = 0;

  for (const item of items) {
    // Check main question, all alternate questions, tags, and answer keywords
    const candidateTexts = [
      item.question,
      ...item.alternateQuestions,
      ...item.tags.map((t) => `jurusan ${t} smk telkom biaya syarat pendaftaran`),
    ];

    for (const cand of candidateTexts) {
      const score = computeNGenSimilarity(query, cand);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    // Also check partial keyword matches against the answer text
    const answerSnippet = item.answer.slice(0, 300);
    const answerScore = computeNGenSimilarity(query, answerSnippet) * 0.85;
    if (answerScore > bestScore) {
      bestScore = answerScore;
      bestMatch = item;
    }
  }

  return { match: bestMatch, score: Math.round(bestScore * 100) / 100 };
}

// Standard Responses & Closing Phrases
export const OUT_OF_SCOPE_RESPONSE =
  'Maaf untuk pertanyaan tersebut belum dapat saya jawab, silahkan ditanya dengan pertanyaan seputar SPMB.';

export const CLOSING_PHRASE = 'Jika ada yang ingin ditanyakan, saya senang hati akan menjawabnya.';

export function appendClosingPhrase(text: string): string {
  const trimmed = text.trim();
  if (
    trimmed.toLowerCase().includes('jika ada yang ingin ditanyakan') ||
    trimmed.toLowerCase().includes('senang hati akan menjawabnya')
  ) {
    return trimmed;
  }
  return `${trimmed}\n\n${CLOSING_PHRASE}`;
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

// Minimum N-Gen matching threshold (50%)
export const NGEN_MATCH_THRESHOLD = 0.50;

/**
 * Smart RAG generation via Gemini 3.7 Flash with Strict N-Gen Matching (< 50% cutoff)
 */
export async function queryRAGWithGemini(
  userQuery: string,
  history: Array<{ role: string; text: string }> = []
): Promise<{ text: string; source: string; category?: string; score: number }> {
  // 1. Calculate N-Gen similarity score against the Knowledge Base
  const ngenResult = findBestMatchLocal(userQuery);
  const score = ngenResult.score;

  // RULE: Jika kecocokan data N-gen dibawah 50% (< 0.50), alihkan langsung ke pesan penolakan SPMB
  if (score < NGEN_MATCH_THRESHOLD) {
    return {
      text: appendClosingPhrase(OUT_OF_SCOPE_RESPONSE),
      source: `Filter Kecocokan N-Gen (${Math.round(score * 100)}% < 50%)`,
      category: 'Umum',
      score: score,
    };
  }

  // If match score is very high (>= 0.85), return authoritative answer directly
  if (ngenResult.match && score >= 0.85) {
    return {
      text: appendClosingPhrase(ngenResult.match.answer),
      source: `Basis Data Resmi PPDB (${ngenResult.match.source})`,
      category: ngenResult.match.category,
      score: score,
    };
  }

  const ai = getGeminiClient();
  const items = getKnowledgeBase();

  // If Gemini client is not configured, use local offline match since score >= 50%
  if (!ai) {
    if (ngenResult.match) {
      return {
        text: appendClosingPhrase(ngenResult.match.answer),
        source: `Basis Data Offline N-Gen (${Math.round(score * 100)}%)`,
        category: ngenResult.match.category,
        score: score,
      };
    }
    return {
      text: appendClosingPhrase(OUT_OF_SCOPE_RESPONSE),
      source: 'Filter Validasi SPMB',
      category: 'Umum',
      score: score,
    };
  }

  // Create compact context from knowledge base
  const contextList = items
    .map(
      (item, idx) =>
        `[Dokumen ${idx + 1} - Kategori: ${item.category} | Sumber: ${item.source}]\nPertanyaan: ${item.question}\nKata Kunci/Variasi: ${item.alternateQuestions.join(', ')}\nJawaban Resmi:\n${item.answer}`
    )
    .join('\n\n---\n\n');

  try {
    const systemPrompt = `Anda adalah "TelkoBot", Asisten Virtual Cerdas & Ramah Layanan Informasi PPDB / SPMB SMK Telkom 2 Medan (Jl. Halat No. 8 Medan).

ATURAN WAJIB & MUTLAK - PEMBATASAN TOPIK SPMB:
1. Anda HANYA boleh menjawab pertanyaan yang berkaitan dengan pendaftaran siswa baru (SPMB / PPDB), 4 jurusan unggulan (RPL, TKJ, DKV, TJAT), biaya pendaftaran/DPP/SPP, syarat berkas, jadwal seleksi/gelombang, beasiswa, fasilitas lab/asrama, atau profil & kontak SMK Telkom 2 Medan.
2. JIKA pertanyaan tidak berkaitan dengan pendaftaran/sekolah SMK Telkom 2 Medan, JAWAB HANYA dengan:
"${OUT_OF_SCOPE_RESPONSE}"

Pedoman Jawaban:
1. Bersikaplah ramah, profesional, dan antusias menyambut calon siswa/wali murid dalam Bahasa Indonesia yang baik dan terstruktur.
2. Gunakan HANYA informasi yang relevan dari DOKUMEN BASIS DATA RESMI.
3. 4 Jurusan: RPL (Rekayasa Perangkat Lunak), TKJ (Teknik Komputer & Jaringan), DKV (Desain Komunikasi Visual), dan TJAT (Teknik Jaringan Akses Telekomunikasi).
4. Kontak Resmi WhatsApp Panitia: 0812-6000-8802 (Kampus Jl. Halat No. 8 Medan).
5. Di bagian paling akhir setiap jawaban, selalu pastikan ada kalimat: "${CLOSING_PHRASE}"

=== DOKUMEN BASIS DATA RESMI PPDB SMK TELKOM 2 MEDAN ===
${contextList}
=========================================================`;

    const recentHistory = history
      .slice(-4)
      .map((h) => `${h.role === 'user' ? 'Calon Siswa' : 'Asisten'}: ${h.text}`)
      .join('\n');
    const promptText = `${recentHistory ? `Riwayat Percakapan Sebelumnya:\n${recentHistory}\n\n` : ''}Pertanyaan Calon Siswa / Wali Murid: ${userQuery}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: promptText,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    const generatedText = response.text || '';

    return {
      text: appendClosingPhrase(generatedText),
      source: ngenResult.match
        ? `RAG AI + Basis Data PPDB (${ngenResult.match.category} - Skor N-Gen: ${Math.round(score * 100)}%)`
        : `AI Virtual Assistant PPDB (Skor N-Gen: ${Math.round(score * 100)}%)`,
      category: ngenResult.match?.category || 'Umum',
      score: score,
    };
  } catch (error) {
    console.error('Error invoking Gemini RAG:', error);
    if (ngenResult.match && score >= NGEN_MATCH_THRESHOLD) {
      return {
        text: appendClosingPhrase(ngenResult.match.answer),
        source: `Basis Data Cadangan (${ngenResult.match.source})`,
        category: ngenResult.match.category,
        score: score,
      };
    }
    return {
      text: appendClosingPhrase(OUT_OF_SCOPE_RESPONSE),
      source: 'Sistem Failover PPDB',
      category: 'Umum',
      score: score,
    };
  }
}
