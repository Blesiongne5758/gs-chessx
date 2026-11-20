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
| Edit profil: username + avatar (Supabase Storage) | ✅ Selesai |
| Halaman Tournaments: daftar, detail, klasemen, daftar/batal ikut | ✅ Selesai |
| Multiplayer realtime | 🔜 Skema DB siap |
| 3D Voxel board (Three.js) | 🔜 |
| AI opponent (Stockfish.js) | 🔜 |
| Voice call WebRTC, chat | 🔜 |
| Pairing & skor turnamen otomatis, ELO Glicko-2 | 🔜 |

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
2. Buka **SQL Editor**, jalankan `supabase/schema.sql` (tabel, RLS, realtime), lalu berurutan `supabase/migrations/002_edit_profile.sql` (trigger profil otomatis, bucket `avatars`, aturan username, proteksi kolom rating/Pro) dan `003_tournaments.sql` (detail turnamen, tabel peserta, aturan pendaftaran, 5 turnamen contoh).
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
│   │   ├── AuthModal.jsx
│   │   ├── EditProfile.jsx
│   │   ├── Tournaments.jsx
│   │   ├── TopNav.jsx
│   │   └── Avatar.jsx
│   ├── lib/
│   │   ├── supabaseClient.js
│   │   ├── profile.js
│   │   └── tournaments.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── schema.sql
│   └── migrations/
│       ├── 002_edit_profile.sql
│       └── 003_tournaments.sql
├── .env.example
├── tailwind.config.js
└── package.json
```

## 👤 Edit Profil

- **Username**: 3–20 karakter (huruf, angka, `_`), unik — divalidasi di client dan di database.
- **Avatar**: PNG/JPG/WEBP/GIF maks. 2 MB, otomatis dipotong persegi dan diperkecil ke 256×256 WebP sebelum diunggah ke bucket `avatars/<user_id>/`. File lama dihapus otomatis.
- **Keamanan**: pengguna hanya bisa mengubah `username`, `avatar_url`, `country` miliknya sendiri; `rating`, `wins`, `is_pro` tidak bisa diubah dari browser.
- **Mode tamu**: profil disimpan di `localStorage` browser.

## 🏆 Tournaments

- Tab **Akan Datang / Berlangsung / Selesai** dengan filter format **Arena, Swiss, Knockout**.
- Kartu turnamen: kontrol waktu, jumlah ronde, hadiah, jumlah pemain (progress bar), hitung mundur live.
- Banner "Turnamen Berikutnya" dengan hitung mundur dan tombol daftar.
- Detail turnamen: info lengkap, daftar peserta (sebelum mulai) atau klasemen M/S/K + poin (berlangsung/selesai), juara.
- **Daftar / Batal Ikut** — aturan ditegakkan di database: hanya sebelum mulai, tidak melebihi kuota (aman dari race condition), turnamen Pro khusus pemain Pro, skor tidak bisa diisi dari browser.
- Jumlah peserta diperbarui realtime via Supabase Realtime.
- Mode tamu memakai 5 turnamen contoh; pendaftaran disimpan di `localStorage`.

Membuat turnamen baru dan mengisi skor dilakukan oleh admin (SQL Editor / service role).

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

- **Phase 1 – Foundation**: ✅ setup, ✅ auth, ✅ papan 2D, ✅ edit profil
- **Phase 2 – Core Chess**: ⬜ papan 3D, ⬜ Stockfish AI, ✅ timer, ✅ validasi langkah
- **Phase 3 – Multiplayer**: ⬜ sinkronisasi realtime, ⬜ matchmaking, ⬜ spectator, ⬜ PGN replay
- **Phase 4 – Social**: ⬜ friend system, ⬜ chat, ⬜ voice call WebRTC, ⬜ notifikasi
- **Phase 5 – Competitive**: ⬜ ELO Glicko-2, ⬜ leaderboard live, ✅ halaman turnamen, ⬜ pairing otomatis, ⬜ riwayat match

## 📝 License

MIT
