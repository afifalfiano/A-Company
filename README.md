# A-Company

Todo list yang diproses oleh 7 AI agents secara real-time via WebSocket.

## Agents

| Agent | Kategori | Tugas |
|---|---|---|
| CEO | semua | Analisa priority & delegasi ke agent yang tepat |
| Engineer | technical | Breakdown subtasks + estimasi waktu |
| Product | product | Acceptance criteria yang measurable |
| Designer | design | Design deliverables & timeline |
| Marketing | marketing | Marketing plan + KPI |
| Bisnis | business | Business action plan + stakeholders |
| Finalize | - | Wrap up semua output |

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env dan isi MINIMAX_API_KEY
npm install
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka http://localhost:5173

## Cara Pakai

1. Pastikan backend berjalan (WebSocket di port 3001)
2. Buka frontend di browser
3. Ketik todo atau klik salah satu contoh
4. Lihat agent bekerja real-time di panel kiri
5. Hasil lengkap muncul di panel kanan

## Contoh Todo per Kategori

- **Technical**: "Implement login dengan JWT dan refresh token"
- **Product**: "Design onboarding flow untuk new users"
- **Design**: "Redesign dashboard halaman utama"
- **Marketing**: "Buat kampanye Instagram untuk product launch"
- **Business**: "Negotiate partnership dengan payment gateway lokal"

## Tech Stack

- **Backend**: Node.js + Express + WebSocket (ws) + LangGraph.js
- **Frontend**: React + Vite + TypeScript
- **AI**: MiniMax via OpenAI-compatible endpoint
# A-Company
