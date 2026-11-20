# ♟️ GS-ChessX

**Holy vs Anarchy: The Voxel Chess Revolution**

GS-ChessX adalah platform catur online modern dengan tema epik "Holy Kingdom vs Anarchy Rebellion". Saat ini tersedia papan 2D yang bisa dimainkan penuh (hot-seat lokal); multiplayer realtime, mode 3D, voice call, dan AI ada di roadmap.

## 🎮 Status Fitur

| Fitur | Status |
|---|---|
| Landing page, Lobby, Game Room | ✅ Selesai |
| Auth email/password + Google OAuth (Supabase) | ✅ Selesai |
| Papan 2D dengan validasi langkah (chess.js) | ✅ Selesai |
| Jam catur + increment, flag fall | ✅ Selesai |
| Deteksi skakmat, stalemate, remis | ✅ Selesai |
| Highlight langkah terakhir, skak, bidak tertangkap | ✅ Selesai |
| Mode tamu (tanpa Supabase) | ✅ Selesai |
| Multiplayer realtime | 🔜 Skema DB siap |
| 3D Voxel board (Three.js) | 🔜 |
| AI opponent (Stockfish.js) | 🔜 |
| Voice call WebRTC, chat | 🔜 |
| Turnamen, ELO Glicko-2 | 🔜 |

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS 3
- **Chess Engine**: chess.js
- **3D Rendering**: Three.js (untuk mode 3D)
- **Backend**: Supabase (Auth, Database, Realtime)
- **Hosting**: Cloudflare Pages
- **Assets**: Cloudflare R2

## 🚀 Quick Start

```bash
git clone https://github.com/Blesiongne5758/gs-chessx.git
cd gs-chessx
npm install
cp .env.example .env   # isi dengan kredensial Supabase
npm run dev
```

Tanpa `.env`, aplikasi tetap jalan dalam **mode tamu** — klik Play Now untuk langsung bermain.

### Setup Supabase

1. Buat proyek di [supabase.com](https://supabase.com).
2. Buka **SQL Editor**, jalankan isi `supabase/schema.sql` (tabel, RLS, trigger profil otomatis, realtime).
3. Salin **Project URL** dan **anon key** dari *Settings → API* ke `.env`.
4. (Opsional) Aktifkan Google di *Authentication → Providers*.

### Build

```bash
npm run build
npm run preview
```

## 📁 Struktur Proyek

```
gs-chessx/
├── src/
│   ├── components/
│   │   ├── LandingPage.jsx
│   │   ├── Lobby.jsx
│   │   ├── GameRoom.jsx
│   │   └── AuthModal.jsx
│   ├── lib/supabaseClient.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/schema.sql
├── .env.example
├── tailwind.config.js
└── package.json
```

## 🎨 Design System

| Token | Hex | Fungsi |
|---|---|---|
| Obsidian | `#0D0F14` | Background |
| Graphite | `#1A1D26` | Surface |
| Gold | `#D4AF37` | Accent / CTA |
| Emerald | `#10B981` | Success |
| Crimson | `#EF4444` | Danger |

Font: **Cinzel** (heading), **Inter** (body), **JetBrains Mono** (notasi).

## 🗄️ Database Schema

Lihat `supabase/schema.sql`: `profiles`, `friendships`, `games`, `moves` (realtime), `tournaments` — semuanya dengan Row Level Security.

## 💰 Monetization

- **Free (2D Classic)**: papan 2D, matchmaking global, chat dasar
- **Pro ($4.99/bulan)**: 3D Voxel board, cinematic lighting, voice call, skin eksklusif, tanpa iklan

## 📊 Roadmap

- **Phase 1 – Foundation**: ✅ setup, ✅ auth, ✅ papan 2D, ⬜ edit profil
- **Phase 2 – Core Chess**: ⬜ papan 3D, ⬜ Stockfish AI, ✅ timer, ✅ validasi langkah
- **Phase 3 – Multiplayer**: ⬜ sinkronisasi realtime, ⬜ matchmaking, ⬜ spectator, ⬜ PGN replay
- **Phase 4 – Social**: ⬜ friend system, ⬜ chat, ⬜ voice call WebRTC, ⬜ notifikasi
- **Phase 5 – Competitive**: ⬜ ELO Glicko-2, ⬜ leaderboard live, ⬜ turnamen, ⬜ riwayat match

## 📝 License

MIT
