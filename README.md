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
| Pairing Swiss otomatis + Buchholz | ✅ Selesai |
| Halaman Admin: buat / ubah / hapus turnamen Swiss | ✅ Selesai |
| ELO Glicko-2, pairing Arena/Knockout | 🔜 |

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
│   │   ├── SwissPanel.jsx
│   │   ├── AdminTournaments.jsx
│   │   ├── TopNav.jsx
│   │   └── Avatar.jsx
│   ├── lib/
│   │   ├── supabaseClient.js
│   │   ├── profile.js
│   │   ├── tournaments.js
│   │   └── tournamentForm.js   # validasi & estimasi form admin
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── schema.sql
│   ├── functions/
│   │   ├── _shared/swiss.js   # engine pairing (murni, dipakai server & client)
│   │   └── swiss/index.ts     # Edge Function: start / report / tick
│   └── migrations/
│       ├── 002_edit_profile.sql
│       ├── 003_tournaments.sql
│       ├── 004_swiss_pairing.sql
│       └── 005_admin_tournaments.sql
├── tests/
│   ├── swiss.test.js
│   └── tournamentForm.test.js
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

Membuat turnamen baru dilakukan oleh admin (SQL Editor / service role).

## ♟ Pairing Swiss Otomatis

Setelah ronde 1 dimulai, setiap kali semua hasil ronde masuk, ronde berikutnya langsung dipasangkan otomatis sampai turnamen selesai dan juara ditetapkan.

**Aturan pairing** (gaya Dutch system FIDE):
- Pemain dikelompokkan per skor; separuh atas melawan separuh bawah (urut skor → rating).
- **Tidak ada rematch** — dua pemain tidak bertemu dua kali.
- **Warna**: tidak boleh 3× warna sama berturut-turut dan selisih putih/hitam maks. 2; warna diselang-seling bila memungkinkan.
- **Bye** (jumlah pemain ganjil) diberikan ke pemain skor terendah yang belum pernah bye, bernilai **1 poin**.
- **Lookahead**: untuk ≤24 pemain engine memastikan ronde-ronde sisa tetap bisa dipasangkan tanpa rematch.
- Bila tidak ada solusi sempurna, aturan dilonggarkan bertahap (warna → lookahead → rematch) agar pairing tidak pernah macet.
- **Batas ronde**: ≤7 pemain → n−1; 8–24 → n−3; >24 → ⌈log₂ n⌉+4. Jumlah ronde turnamen otomatis dipotong ke batas ini.
- Klasemen: poin → **Buchholz** (jumlah poin lawan) → rating.

**Alur admin**: buka detail turnamen Swiss → **▶ Mulai & Pairing R1** → isi hasil tiap papan (1-0, ½-½, 0-1). Pemain melihat papan dan lawannya sendiri secara realtime.

**Setup**:
1. Jalankan `supabase/migrations/004_swiss_pairing.sql` di SQL Editor.
2. Deploy Edge Function: `supabase functions deploy swiss`
3. Jadikan akun Anda admin: `update profiles set is_admin = true where username = 'nama_anda';`
4. (Opsional) Aktifkan blok pg_cron di akhir 004 agar turnamen yang sudah lewat jam mulai otomatis dimulai (`action: tick`).

Keamanan: tabel `tournament_pairings` hanya bisa dibaca dari browser; semua penulisan lewat Edge Function (cek `is_admin`), dengan proteksi double-pairing (unique `tournament_id, round, board`).

**Mode tamu**: Anda otomatis admin di turnamen contoh, ada tombol "isi hasil acak" dan "Reset demo".

**Test**: `npm test` — validasi form admin, dan mensimulasikan ribuan turnamen (3–256 pemain) dan memeriksa tidak ada rematch, aturan warna, bye, serta skor.

## 🛠 Admin Turnamen

Menu **🛠 Admin** (dan tombol **＋ Buat Turnamen Swiss** di halaman Tournaments) hanya muncul untuk akun dengan `profiles.is_admin = true`.

- **Form turnamen Swiss baru**: nama, deskripsi, kontrol waktu (preset atau kustom `menit+detik`), kuota pemain, jumlah ronde (**Otomatis** = ⌈log₂ pemain⌉ atau ditentukan), waktu mulai, perkiraan selesai (dihitung otomatis dari kontrol waktu × ronde), hadiah, khusus Pro.
- **Pratinjau kartu** live dan validasi per kolom (mis. ronde tidak boleh melebihi batas tanpa pertemuan ulang untuk kuota tersebut).
- **Kelola Turnamen Swiss**: semua turnamen Swiss dengan **status** (Akan Datang · hitung mundur / Berlangsung · ronde X dari N / Selesai) dan **jumlah pendaftar** (terisi/kuota, sisa slot, bar terisi, tanda **Penuh**, peringatan bila < 2 pemain). Jumlah diperbarui realtime; filter per status dan total pendaftar di turnamen aktif.
- Turnamen **Akan Datang** bisa **Ubah** / **Hapus** (dengan konfirmasi); yang sedang berlangsung bisa **♟ Pantau**, yang selesai **♟ Lihat hasil** — keduanya langsung membuka papan pairing (tab Pairing, ronde terbaru) di atas halaman admin, tanpa pindah halaman. Dari Pantau, admin bisa langsung mengisi hasil papan. Kuota tidak bisa diturunkan di bawah jumlah pemain yang sudah terdaftar.
- Setelah dibuat, tombol **Lihat Turnamen** langsung membuka detailnya untuk dimulai.

**Keamanan** (`005_admin_tournaments.sql`): RLS hanya mengizinkan admin insert/update/delete, dan update/delete hanya untuk status `upcoming`. Kolom `status`, `current_round`, `winner_id`, `created_by` tidak bisa diisi dari browser. Trigger memastikan waktu mulai di masa depan, dan check constraint menjaga format data.

**Setup**: jalankan `supabase/migrations/005_admin_tournaments.sql` setelah 004.

**Mode tamu**: Anda otomatis admin; turnamen buatan disimpan di browser dan bisa diisi pemain contoh (slider) agar langsung bisa dicoba sampai selesai.

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
