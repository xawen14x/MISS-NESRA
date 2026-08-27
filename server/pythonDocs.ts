/**
 * Standalone Python Architecture & Deployment Specifications
 * For on-premise / private server offline deployment (FastAPI, Faster-Whisper, Piper TTS, SQLite/ChromaDB)
 */

export const STANDALONE_PYTHON_DOCS = {
  overview: "Arsitektur Sistem AI Q&A Standalone PPDB SMK Telkom 2 Medan (FastAPI + React + Offline Voice Engine)",
  folderStructure: `
smk-telkom2-ai-ppdb/
├── backend/                  # Backend Standalone Python (FastAPI)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # Entry point API FastAPI & routing
│   │   ├── config.py         # Pengaturan env & path model
│   │   ├── database.py       # SQLite / SQLAlchemy ORM handler
│   │   ├── models.py         # Skema tabel database Q&A
│   │   ├── rag_engine.py     # Intent matcher & Vector search (ChromaDB / TF-IDF)
│   │   ├── stt_engine.py     # Transkripsi suara offline (faster-whisper)
│   │   └── tts_engine.py     # Sintesis suara offline (Piper-TTS / gTTS)
│   ├── data/
│   │   ├── ppdb_data.json    # Basis data awal Q&A PPDB
│   │   └── ppdb_local.db     # SQLite Database
│   ├── models/               # Model weights lokal (Whisper & Piper ONNX)
│   │   ├── whisper-small/
│   │   └── id_ID-indotts.onnx
│   ├── requirements.txt      # Dependensi Python
│   └── Dockerfile            # Container build for GPU/CPU server
├── frontend/                 # Client UI (React + Tailwind CSS + Vite)
│   ├── src/
│   │   ├── components/       # Avatar, ChatBox, VoiceController, Admin
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tailwind.config.js
├── docker-compose.yml        # Orchestration 1-Click Launch
├── README.md                 # Petunjuk Operasional & Admin Guide
└── start_server.sh           # Script peluncur otomatis
  `.trim(),

  fastApiMainPy: `
# backend/app/main.py
"""
AI Virtual Assistant PPDB SMK Telkom 2 Medan - Standalone FastAPI Server
Menyediakan REST API untuk Chat Q&A, Dynamic RAG, STT (Whisper), dan TTS (Piper).
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import uvicorn

from .rag_engine import RAGEngine
from .stt_engine import Transcriber
from .tts_engine import VoiceSynthesizer
from .database import get_db, init_db
from .models import QAItemModel

app = FastAPI(
    title="PPDB SMK Telkom 2 Medan - AI Assistant API",
    description="Sistem Tanya Jawab PPDB dengan STT Offline, RAG Dinamis, dan TTS Narasi",
    version="2.0.0"
)

# Setup CORS untuk koneksi dari Frontend React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inisialisasi engine
rag = RAGEngine(data_path="data/ppdb_data.json")
stt = Transcriber(model_size="small", device="cpu") # atau device="cuda" jika ada GPU
tts = VoiceSynthesizer()

@app.on_event("startup")
def on_startup():
    init_db()
    rag.load_knowledge_base()
    print("✅ Basis Data & Model AI PPDB SMK Telkom 2 Medan Siap Digunakan!")

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    history: Optional[List[dict]] = []

class QAItemCreate(BaseModel):
    category: str
    question: str
    alternate_questions: List[str]
    answer: str
    tags: List[str]
    priority: int = 1
    source: str = "Admin PPDB"

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Endpoint utama untuk menjawab pertanyaan user via RAG + Semantic Matching.
    """
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Pertanyaan tidak boleh kosong.")
    
    result = rag.find_best_response(req.query, history=req.history)
    return {
        "text": result["answer"],
        "source": result["source"],
        "category": result["category"],
        "score": result["score"]
    }

@app.post("/api/stt")
async def speech_to_text(audio_file: UploadFile = File(...)):
    """
    Menerima rekaman audio webm/wav/mp3 dari browser dan mentranskripsikannya ke teks.
    """
    temp_path = f"/tmp/{audio_file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(await audio_file.read())
    
    try:
        transcript = stt.transcribe(temp_path)
        os.remove(temp_path)
        return {"transcript": transcript}
    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Gagal memproses STT: {str(e)}")

@app.post("/api/tts")
async def text_to_speech(text: str = Form(...), voice: str = Form("id_ID-indotts")):
    """
    Mengonversi teks jawaban menjadi file audio WAV narasi suara karakter.
    """
    audio_path = tts.synthesize_speech(text, voice=voice)
    return FileResponse(audio_path, media_type="audio/wav", filename="speech.wav")

# CRUD Dynamic Knowledge Base untuk Admin
@app.get("/api/kb")
async def get_knowledge_base():
    return rag.get_all_items()

@app.post("/api/kb")
async def add_knowledge_item(item: QAItemCreate):
    new_item = rag.add_item(item.dict())
    return {"message": "Q&A Berhasil ditambahkan", "data": new_item}

@app.delete("/api/kb/{item_id}")
async def delete_knowledge_item(item_id: str):
    success = rag.delete_item(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    return {"message": "Item berhasil dihapus"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
  `.trim(),

  pythonRagEngine: `
# backend/app/rag_engine.py
"""
Engine RAG Dinamis & Intent Matcher Lokal untuk PPDB SMK Telkom 2 Medan
"""
import json
import uuid
from typing import List, Dict, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class RAGEngine:
    def __init__(self, data_path: str = "data/ppdb_data.json"):
        self.data_path = data_path
        self.items: List[Dict[str, Any]] = []
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2))
        self.corpus_vectors = None
        self.corpus_texts = []

    def load_knowledge_base(self):
        try:
            with open(self.data_path, "r", encoding="utf-8") as f:
                self.items = json.load(f)
            self._rebuild_index()
        except Exception as e:
            print(f"Gagal memuat basis data: {e}")
            self.items = []

    def save_knowledge_base(self):
        with open(self.data_path, "w", encoding="utf-8") as f:
            json.dump(self.items, f, indent=2, ensure_ascii=False)
        self._rebuild_index()

    def _rebuild_index(self):
        self.corpus_texts = []
        for item in self.items:
            combined = f"{item['question']} {' '.join(item.get('alternateQuestions', []))} {' '.join(item.get('tags', []))}"
            self.corpus_texts.append(combined)
        
        if self.corpus_texts:
            self.corpus_vectors = self.vectorizer.fit_transform(self.corpus_texts)

    def find_best_response(self, query: str, history: List[dict] = None) -> Dict[str, Any]:
        if not self.items or not self.corpus_texts:
            return {
                "answer": "Basis data pengetahuan belum terisi. Hubungi admin.",
                "source": "Sistem",
                "category": "Umum",
                "score": 0.0
            }

        query_vec = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vec, self.corpus_vectors)[0]
        best_idx = similarities.argmax()
        best_score = float(similarities[best_idx])

        if best_score > 0.25:
            matched_item = self.items[best_idx]
            return {
                "answer": matched_item["answer"],
                "source": matched_item.get("source", "Basis Data Resmi PPDB"),
                "category": matched_item.get("category", "Umum"),
                "score": round(best_score, 3)
            }
        else:
            return {
                "answer": "Terima kasih atas pertanyaannya. Untuk informasi lebih spesifik mengenai PPDB SMK Telkom 2 Medan, Anda dapat langsung menghubungi Sekretariat di Jl. Halat No. 8 Medan atau via WhatsApp Panitia di 0812-6000-8802.",
                "source": "Layanan Informasi PPDB",
                "category": "Umum",
                "score": round(best_score, 3)
            }

    def get_all_items(self):
        return self.items

    def add_item(self, data: dict):
        data["id"] = f"kb-{uuid.uuid4().hex[:6]}"
        self.items.append(data)
        self.save_knowledge_base()
        return data

    def delete_item(self, item_id: str):
        initial_len = len(self.items)
        self.items = [i for i in self.items if i.get("id") != item_id]
        if len(self.items) != initial_len:
            self.save_knowledge_base()
            return True
        return False
  `.trim(),

  pythonSttTtsEngine: `
# backend/app/stt_engine.py & tts_engine.py
"""
1. STT Engine menggunakan faster-whisper (Offline, Cepat, Akurasi Tinggi Bahasa Indonesia)
"""
from faster_whisper import WhisperModel

class Transcriber:
    def __init__(self, model_size="small", device="cpu"):
        # Model berjalan 100% lokal di server pribadi tanpa internet
        self.model = WhisperModel(model_size, device=device, compute_type="int8")

    def transcribe(self, audio_path: str) -> str:
        segments, info = self.model.transcribe(audio_path, language="id", beam_size=5)
        text = " ".join([segment.text for segment in segments])
        return text.strip()


"""
2. TTS Engine menggunakan Piper-TTS (Offline Fast Neural TTS)
"""
import subprocess
import os

class VoiceSynthesizer:
    def __init__(self, piper_binary="piper", model_path="models/id_ID-indotts.onnx"):
        self.piper_binary = piper_binary
        self.model_path = model_path
        self.output_dir = "/tmp/tts_cache"
        os.makedirs(self.output_dir, exist_ok=True)

    def synthesize_speech(self, text: str, voice: str = "default") -> str:
        output_file = os.path.join(self.output_dir, "response.wav")
        clean_text = text.replace("*", "").replace("#", "")
        
        # Eksekusi Piper TTS binary
        cmd = f'echo "{clean_text}" | {self.piper_binary} --model {self.model_path} --output_file {output_file}'
        subprocess.run(cmd, shell=True, check=True)
        return output_file
  `.trim(),

  requirementsTxt: `
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
faster-whisper>=1.0.1
scikit-learn>=1.4.1
numpy>=1.26.4
sqlalchemy>=2.0.28
requests>=2.31.0
  `.trim(),

  dockerCompose: `
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: smk_telkom_ai_backend
    restart: always
    ports:
      - "8000:8000"
    volumes:
      - ./backend/data:/app/data
      - ./backend/models:/app/models
    environment:
      - PORT=8000
      - DEVICE=cpu # ubah ke cuda jika ada kartu grafis Nvidia

  frontend:
    build: ./frontend
    container_name: smk_telkom_ai_frontend
    restart: always
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
  `.trim()
};
