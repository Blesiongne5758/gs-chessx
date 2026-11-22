# ♟️ GS-ChessX

**Holy vs Anarchy: The Voxel Chess Revolution**

GS-ChessX adalah platform catur online modern dengan tema epik "Holy Kingdom vs Anarchy Rebellion". Papan 3D Voxel kini menjadi skin awal, dengan 2D Classic sebagai alternatif. Quick Match menyiarkan status pemain melalui Supabase Realtime Presence, mendukung tantangan publik maupun undangan teman, menyinkronkan langkah pertandingan, serta menyediakan voice talk peer-to-peer.

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
| Edit profil: username + avatar + ganti password + rank | ✅ Selesai |
| Teman: cari pemain, permintaan, kontak | ✅ Selesai |
| Chat privat teman (Supabase Realtime + RLS) | ✅ Selesai |
| Panggilan voice/video peer-to-peer WebRTC | ✅ Selesai (HTTPS + izin media diperlukan) |
| Halaman Tournaments: daftar, detail, klasemen, daftar/batal ikut | ✅ Selesai |
| Quick Match, presence pemain online, dan undangan teman | ✅ Supabase Realtime |
| Sinkronisasi langkah catur realtime | ✅ Supabase Realtime Broadcast |
| Voice talk peer-to-peer dalam pertandingan | ✅ WebRTC (HTTPS + izin mikrofon diperlukan) |
| Papan 3D Voxel default + 2D Classic alternatif | ✅ Selesai |
| AI opponent (Stockfish.js) | 🔜 |
| Chat dan voice/video call antar teman | ✅ Selesai |
| Pairing Swiss otomatis + Buchholz | ✅ Selesai |
| Halaman Admin: buat / ubah / hapus turnamen Swiss | ✅ Selesai |
| ELO Glicko-2, pairing Arena/Knockout | 🔜 |

## 🛠️ Tech Stack

- **Frontend**: React 19 + Vite + TailwindCSS 3
- **Chess Engine**: chess.js
- **3D Rendering**: Three.js (untuk mode 3D)
- **Backend**: Supabase (Auth, Database, Realtime)
- **Hosting**: InfinityFree melalui GitHub Actions FTP
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
2. Buka **SQL Editor**, jalankan `supabase/schema.sql`, lalu migrasi berurutan: `002_edit_profile.sql`, `003_tournaments.sql`, `004_swiss_pairing.sql`, `005_admin_tournaments.sql`, `20261120145726_social_chat_realtime.sql`, `20261122004636_quick_match_realtime_turn.sql`, dan `20261123020000_fix_profile_update_permissions.sql`. Migrasi terakhir memperbaiki izin edit profil tanpa membuka kolom rating, statistik, atau admin.
3. Salin **Project URL** dan **anon/publishable key** dari *Settings → API* ke `.env` atau GitHub Actions secrets `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`. Jangan gunakan `service_role` key.
4. Untuk menonaktifkan verifikasi email, buka *Authentication → Providers → Email*, matikan **Confirm email**, lalu simpan. Ini adalah pengaturan proyek Supabase dan tidak dapat diubah dari frontend.
5. Di *Authentication → URL Configuration → Redirect URLs*, izinkan origin development yang digunakan (misalnya `http://localhost:5173/**`) dan origin HTTPS produksi.
6. (Opsional) Aktifkan Google di *Authentication → Providers*.

### Realtime, HTTPS, dan TURN

Quick Match dan voice talk memakai private Realtime channels; terapkan migration di atas sebelum pengujian. Kamera/mikrofon diminta setelah pengguna menekan tombol dan menyetujui izin. Situs produksi harus benar-benar disajikan melalui HTTPS (`localhost` dapat dipakai saat development). `public/_headers` menetapkan Permissions-Policy untuk Cloudflare Pages, tetapi tidak membuat domain atau sertifikat TLS.

TURN credentials sementara diambil dari Edge Function `turn-credentials`. Setelah menghubungkan Supabase CLI ke proyek, deploy dengan `supabase functions deploy turn-credentials`. Atur secret function `TURN_URLS` sebagai daftar URL TURN dipisahkan koma, misalnya `turn:turn.example.com:3478?transport=udp,turns:turn.example.com:5349?transport=tcp`, dan `TURN_SHARED_SECRET` dengan secret acak yang sama seperti `static-auth-secret` Coturn. Jangan menyimpan shared secret, private key TLS, service-role key, atau kredensial server di frontend maupun Git.

`turn/coturn.conf.example` adalah template untuk host TURN yang harus disediakan dan dijalankan terpisah. Siapkan DNS, TLS, IP publik yang benar, buka listener 3478 UDP/TCP dan 5349 TCP, serta rentang relay UDP `49160–49200` (atau rentang lain yang dipilih pada konfigurasi) di firewall dan provider. Tanpa server TURN aktif dan secret yang cocok, aplikasi hanya mencoba STUN; media dapat gagal pada NAT/firewall ketat. Deploy Supabase memerlukan akses proyek yang sah, sedangkan TURN memerlukan host dan kredensial operator server.

### Build

```bash
npm run build
npm run preview
```

### Deploy ke InfinityFree via GitHub Actions

Workflow `.github/workflows/deploy-infinityfree.yml` akan menjalankan build Vite pada setiap push ke `main` dan menyediakan `workflow_dispatch` untuk deployment manual. Setelah build berhasil, folder `dist/` dikirim ke `/chessx.my-board.org/htdocs/` melalui FTP. Jika secret FTP belum tersedia, build tetap dijalankan tetapi upload dilewati tanpa error.

Di GitHub buka **Settings → Secrets and variables → Actions → New repository secret**, lalu tambahkan:

- `FTP_SERVER`: hostname FTP dari panel InfinityFree, biasanya `ftpupload.net`.
- `FTP_USERNAME`: username FTP akun hosting.
- `FTP_PASSWORD`: password FTP akun hosting, bukan password akun Client Area.
- `FTP_PORT` (opsional): `21` jika tidak diberikan oleh panel.
- `FTP_PROTOCOL` (opsional): `ftp` untuk koneksi standar InfinityFree.

Untuk build dengan fitur Supabase, tambahkan juga `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sebagai repository secrets. Tanpa keduanya aplikasi tetap dapat dibuka dalam mode tamu. Setelah secret disimpan, lakukan push ke `main` atau jalankan workflow dari tab **Actions → Deploy GS-ChessX to InfinityFree → Run workflow**.

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
- **Rank** dihitung dari rating untuk ditampilkan di Lobby dan Profil; rating tetap tidak dapat diubah dari form profil.
- **Ubah password** memakai Supabase Auth pada sesi aktif, dengan validasi minimum 8 karakter dan konfirmasi.

## 👥 Friends, Chat & Calls

- Cari pemain berdasarkan username; kirim, terima, dan tolak permintaan pertemanan.
- Chat langsung tersimpan dan diperbarui melalui Supabase Realtime. Row Level Security membatasi akses ke dua akun teman yang sudah menerima pertemanan.
- Voice/video menggunakan WebRTC peer-to-peer. Database hanya meneruskan sinyal SDP/ICE, bukan audio/video. Browser meminta izin kamera dan mikrofon; jalankan situs lewat HTTPS (atau localhost). STUN publik digunakan; jaringan ketat memerlukan server TURN yang terpasang dan aktif.
- Jalankan migrasi `20261120145726_social_chat_realtime.sql` sebelum memakai fitur sosial.
- Untuk voice/video melalui TURN, ikuti langkah di bagian **Realtime, HTTPS, dan TURN** di atas.

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

- **Free**: 3D Voxel dan 2D Classic, kontak teman, chat, serta panggilan voice/video.
- **Pro ($4.99/bulan)**: ide skin eksklusif dan tanpa iklan belum diimplementasikan.

## 📊 Roadmap

- **Phase 1 – Foundation**: ✅ setup, ✅ auth, ✅ papan 2D, ✅ edit profil
- **Phase 2 – Core Chess**: ✅ papan 3D + 2D Classic, ⬜ Stockfish AI, ✅ timer, ✅ validasi langkah
- **Phase 3 – Multiplayer**: ✅ sinkronisasi realtime, ✅ matchmaking, ✅ voice talk game, ⬜ spectator, ⬜ PGN replay
- **Phase 4 – Social**: ✅ friend system, ✅ chat, ✅ voice/video WebRTC, ⬜ notifikasi
- **Phase 5 – Competitive**: ⬜ ELO Glicko-2, ⬜ leaderboard live, ✅ halaman turnamen, ⬜ pairing otomatis, ⬜ riwayat match

## 📝 License

MIT
