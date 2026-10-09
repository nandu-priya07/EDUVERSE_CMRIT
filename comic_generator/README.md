# SmartCampus Notes-to-Educational-Comics AI Generator

An independent, local GPU-optimized AI microservice built with **Python**, **FastAPI**, **PyMuPDF**, **Qwen2.5-1.5B-Instruct**, **SDXL Turbo**, and **Pillow**.

Converts lecture notes, text prompts, and uploaded educational PDFs into multi-panel educational comic strips with clear speech bubbles, captions, and PDF exports.

---

## 🌟 Key Features

1. **Independent API Backend**: Exposed via FastAPI on `http://127.0.0.1:8000` with interactive Swagger docs at `/docs`.
2. **6 GB VRAM Local GPU Optimization**:
   - Sequential VRAM loading and offloading between LLM (Qwen2.5) and Image Generator (SDXL Turbo).
   - FP16 precision, attention slicing, CPU offloading, and aggressive Garbage Collection + CUDA cache cleanup.
   - Robust educational vector-art fallback when running without GPU/PyTorch.
3. **Pillow Bubble & Overlay Engine**:
   - Clean dialogue speech bubbles with directional tail points.
   - Semi-transparent narrator/educational takeaway caption banners.
   - Modern panel numbering badges and header titles.
   - Zero corrupted/distorted text on generated character faces.
4. **PDF & Image Export**:
   - Assembles composite comic page PNGs and single/multi-page PDFs.

---

## 🚀 Quick Start & Installation

### 1. Requirements
- Python 3.10+
- (Optional) NVIDIA GPU with 6GB VRAM (RTX 3050 Laptop GPU or higher) + CUDA Toolkit.

### 2. Environment Setup
```bash
cd "D:\New folder\smartcampus\comic_generator"
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Running the Service
```bash
python run.py
```
The server will start at: `http://127.0.0.1:8000`  
Swagger UI Documentation: `http://127.0.0.1:8000/docs`

---

## 📡 REST API Documentation

### 1. Check Health & VRAM Status
- **Endpoint**: `GET /api/comic/health`
- **Response**:
```json
{
  "status": "healthy",
  "gpu": {
    "cuda_available": true,
    "device_name": "NVIDIA GeForce RTX 3050 Laptop GPU",
    "total_vram_gb": 6.0,
    "allocated_vram_gb": 0.45,
    "reserved_vram_gb": 1.2,
    "free_vram_gb": 4.8
  }
}
```

### 2. Generate Educational Comic
- **Endpoint**: `POST /api/comic/generate` (Accepts `multipart/form-data`)
- **Form Fields**:
  - `topic` (string, required): e.g. `"Apache Spark Architecture"`
  - `num_panels` (int, default 4): Number of panels (2 to 9)
  - `style` (string, default `"modern_comic"`): `"modern_comic"`, `"manga"`, `"vector"`, `"cartoon"`
  - `target_audience` (string, default `"college"`): `"college"`, `"high_school"`, `"elementary"`
  - `text_notes` (string, optional): Raw study notes or context text
  - `file` (file, optional): PDF notes upload (`.pdf`)
- **Response**:
```json
{
  "job_id": "4524ec76-f4a4-4bb1-9c02-d672f2bb3cd2",
  "status": "queued",
  "progress": 0.0,
  "step": "Initialized",
  "topic": "Apache Spark Architecture",
  "num_panels": 4
}
```

### 3. Poll Job Progress & Results
- **Endpoint**: `GET /api/comic/status/{job_id}`
- **Response** (Completed):
```json
{
  "job_id": "4524ec76-f4a4-4bb1-9c02-d672f2bb3cd2",
  "status": "completed",
  "progress": 1.0,
  "step": "Comic generation complete!",
  "title": "Apache Spark Architecture",
  "comic_png_url": "/api/comic/result/4524ec76-f4a4-4bb1-9c02-d672f2bb3cd2/image",
  "comic_pdf_url": "/api/comic/result/4524ec76-f4a4-4bb1-9c02-d672f2bb3cd2/pdf",
  "panels": [ ... ]
}
```

### 4. Fetch Output Assets
- **Full Comic Image**: `GET /api/comic/result/{job_id}/image`
- **Full Comic PDF**: `GET /api/comic/result/{job_id}/pdf`
- **Single Panel PNG**: `GET /api/comic/panel/{job_id}/{panel_number}`

---

## 🔌 Integration Guide for SmartCampus Teacher AI Tools Page

You can easily integrate this comic generator into your existing SmartCampus React frontend (`TeacherAITools.jsx` or similar component) using standard `fetch` or `axios`.

### Example React Component Integration Code Snippet:

```jsx
import React, { useState } from 'react';
import axios from 'axios';

const COMIC_API_BASE = 'http://127.0.0.1:8000';

export function TeacherComicGenerator() {
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [numPanels, setNumPanels] = useState(4);
  const [pdfFile, setPdfFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState('');
  const [comicResult, setComicResult] = useState(null);

  const handleGenerateComic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setProgress(0);
    setStepMessage('Submitting request...');
    setComicResult(null);

    try {
      const formData = new FormData();
      formData.append('topic', topic);
      formData.append('num_panels', numPanels);
      formData.append('style', 'modern_comic');
      formData.append('target_audience', 'college');
      if (notes) formData.append('text_notes', notes);
      if (pdfFile) formData.append('file', pdfFile);

      // 1. Initiate Generation Job
      const res = await axios.post(`${COMIC_API_BASE}/api/comic/generate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const jobId = res.data.job_id;

      // 2. Poll Status until complete
      const pollInterval = setInterval(async () => {
        const statusRes = await axios.get(`${COMIC_API_BASE}/api/comic/status/${jobId}`);
        const data = statusRes.data;

        setProgress(Math.round(data.progress * 100));
        setStepMessage(data.step);

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          setLoading(false);
          setComicResult(data);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setLoading(false);
          alert(`Comic Generation Failed: ${data.error}`);
        }
      }, 1500);

    } catch (err) {
      setLoading(false);
      alert(`Error starting comic generator: ${err.message}`);
    }
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-purple-800/40">
      <h2 className="text-2xl font-bold text-purple-400 mb-2">🎨 Notes-to-Educational-Comic AI</h2>
      <p className="text-slate-400 mb-6">Convert lecture notes or topic outlines into visual educational comic strips.</p>

      <form onSubmit={handleGenerateComic} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300">Topic Title</label>
          <input
            type="text"
            required
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Apache Spark Architecture"
            className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Study Notes / Content (Optional)</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste raw notes or topic summaries here..."
            className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300">Upload PDF Notes (Optional)</label>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setPdfFile(e.target.files[0])}
              className="mt-1 text-sm text-slate-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300">Number of Panels</label>
            <select
              value={numPanels}
              onChange={(e) => setNumPanels(Number(e.target.value))}
              className="w-full mt-1 p-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
            >
              <option value={2}>2 Panels</option>
              <option value={4}>4 Panels (2x2 Grid)</option>
              <option value={6}>6 Panels (2x3 Grid)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-white transition-all disabled:opacity-50"
        >
          {loading ? 'Generating Comic...' : '🚀 Generate Educational Comic'}
        </button>
      </form>

      {loading && (
        <div className="mt-6 p-4 bg-purple-950/40 border border-purple-800/50 rounded-lg">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span>{stepMessage}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      )}

      {comicResult && (
        <div className="mt-8 p-4 bg-slate-800 rounded-xl border border-purple-500/30">
          <h3 className="text-xl font-bold text-purple-300 mb-4">{comicResult.title}</h3>
          
          {/* Display Full Composite Image */}
          <img
            src={`${COMIC_API_BASE}${comicResult.comic_png_url}`}
            alt="Educational Comic Page"
            className="w-full rounded-lg shadow-xl mb-4 border border-slate-700"
          />

          <div className="flex gap-4">
            <a
              href={`${COMIC_API_BASE}${comicResult.comic_png_url}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-semibold"
            >
              📥 Download PNG
            </a>
            <a
              href={`${COMIC_API_BASE}${comicResult.comic_pdf_url}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold"
            >
              📄 Download PDF
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```
