# GS-ChessX online chess kit

Folder ini berisi contoh implementasi end-to-end untuk langkah catur online, validasi `chess.js` di Supabase Edge Function, RPC transaksional, jam catur berbasis waktu server, RLS, dan sinkronisasi melalui Supabase Realtime.

## Isi folder

- `supabase/migrations/20261120230000_online_chess.sql` — tabel pertandingan/langkah, indeks, RLS, fungsi `commit_chess_move` dan `claim_chess_timeout`, serta publikasi Realtime.
- `supabase/functions/make-move/index.ts` — verifikasi sesi dan peserta, validasi langkah legal, promosi default queen, commit atomik, dan klaim timeout.
- `frontend/OnlineChessGame.tsx` — komponen React/TypeScript yang memuat state dan riwayat, mengirim langkah dengan SDK, mendengarkan perubahan Realtime, serta menampilkan timer.
- `frontend/online-chess.css` — gaya papan contoh.

## 1. Terapkan skema

Salin migration ke direktori `supabase/migrations` proyek Supabase Anda. Periksa dahulu bahwa nama tabel/kolom tidak bentrok dengan skema yang sudah ada. Terapkan migration memakai workflow Supabase CLI proyek Anda atau SQL Editor. Migration ini membuat tabel baru `public.chess_games` dan `public.chess_moves`.

RLS mengizinkan pengguna terautentikasi membaca hanya pertandingan dan langkah yang melibatkan dirinya. Klien tidak memperoleh izin insert/update. Edge Function menggunakan `service_role` hanya di server; RPC hanya dapat dipanggil role tersebut. Jangan masukkan service-role key ke variabel `VITE_*`, bundle React, atau kode browser.

## 2. Siapkan Edge Function

Folder function harus berada di lokasi standar `supabase/functions/make-move/index.ts`. Atur project secrets berikut:

```sh
supabase secrets set SUPABASE_URL="https://PROJECT_REF.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="PUBLIC_ANON_OR_PUBLISHABLE_KEY"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="SERVER_ONLY_SERVICE_ROLE_KEY"
supabase functions deploy make-move
```

Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` di frontend. `verify_jwt` sebaiknya tetap aktif (default Supabase). Function juga memverifikasi JWT dengan Auth dan mendapatkan `playerId` dari sesi, bukan dari request body. Di produksi, ganti `Access-Control-Allow-Origin: *` pada function dengan origin aplikasi Anda.

Request langkah:

```json
{
  "gameId": "UUID-PERTANDINGAN",
  "from": "e2",
  "to": "e4",
  "expectedPly": 0
}
```

Promosi bidak dapat menyertakan `"promotion":"q"` (atau `r`, `b`, `n`). Komponen contoh otomatis memilih queen; tambahkan pemilih promosi untuk UI final. Untuk klaim timeout, function memakai request `{ "action":"claim_timeout", "gameId":"..." }`. Semua hasil sah tetap diputuskan server, bukan animasi atau state lokal.

## 3. Mulai pertandingan dan clock

Game baru harus dibuat melalui alur tepercaya yang memastikan pemain dan timer yang benar. Contoh SQL berikut hanya untuk smoke test di SQL Editor/local development; jangan biarkan pengguna biasa membuat pertandingan aktif dengan menulis langsung ke tabel karena client write memang dicabut:

```sql
insert into public.chess_games (
  white_player_id, black_player_id, status,
  base_seconds, increment_seconds,
  white_seconds, black_seconds,
  turn_started_at
) values (
  'UUID_USER_PUTIH', 'UUID_USER_HITAM', 'active',
  600, 0, 600, 600, clock_timestamp()
) returning id;
```

Gunakan UUID akun dari `auth.users`. `turn_started_at` adalah waktu mulai giliran yang dipercaya server. Dalam produk, buat game melalui backend/RPC khusus setelah kedua pemain setuju/join; saat pertandingan dimulai, set `status='active'`, `turn='white'`, dan `turn_started_at=clock_timestamp()`.

Saat langkah diterima, RPC mengunci baris pertandingan, mengecek pemain/giliran/`expectedPly`, mengurangi waktu berjalan dari sisi yang bergerak, menambahkan increment, mencatat langkah dan memperbarui FEN/PGN/timer dalam transaksi yang sama. Jika waktunya habis, langkah ditolak dan status menjadi `timeout`. Komponen memanggil klaim timeout saat timer lokal mencapai nol; RPC menghitung ulang waktu memakai jam database sebelum mengakhiri game. Tampilan jam browser bersifat perkiraan; state database adalah otoritatif.

## 4. Pakai komponen React

Contoh ini memakai `@supabase/supabase-js` dan `chess.js`, yang sudah menjadi dependency GS-ChessX. Salin file frontend ke sumber aplikasi, lalu gunakan client Supabase yang sudah login:

```tsx
import OnlineChessGame from "./OnlineChessGame";
import "./online-chess.css";
import { supabase } from "../lib/supabaseClient";

// Pastikan user.id adalah UUID sesi Supabase aktif, bukan guest.
<OnlineChessGame supabase={supabase} gameId={gameId} userId={user.id} />
```

Komponen berlangganan ke `UPDATE` pada `chess_games` dan `INSERT` pada `chess_moves`. Event Realtime hanya menjadi sinyal untuk memuat ulang snapshot; data resmi dibaca kembali dari Postgres. Jika permintaan gagal karena ply sudah usang, komponen refresh state. Pastikan Realtime diaktifkan untuk kedua tabel (migration menambahkannya ke publication secara idempotent).

Komponen demo memakai papan 2D sederhana. Untuk GS-ChessX, pertahankan alur `sendMove` dan ganti render papan dengan renderer 2D/3D yang sudah ada. Saat online, jangan langsung `setGame()` ke posisi lokal sebagai hasil final; tunggu respons server atau update Realtime. Jangan izinkan pemain menggerakkan bidak lawan, dan cegah operasi jika pertandingan bukan status `active`.

## 5. Perilaku dan batasan contoh

- Deteksi skakmat, stalemate, draw, pengulangan dan aturan permainan dihitung oleh `chess.js`; hasil selesai disimpan sebagai `completed`. `winner_id` hanya diisi untuk skakmat.
- Permainan non-standar yang dimulai dari FEN khusus perlu menyimpan PGN dengan tag FEN/SetUp atau menyimpan riwayat langkah yang cukup agar deteksi pengulangan konsisten. Contoh ini mengasumsikan awal standar dan PGN menjadi riwayat otoritatif.
- Tidak ada matchmaking, undangan, reconnect flow lanjutan, menyerah/offer draw RPC, atau pemilih promosi dalam paket ini. Tambahkan endpoint server-side dengan pola otorisasi serupa untuk fitur-fitur tersebut.
- Pastikan kedua pemain sudah terautentikasi Supabase. Guest lokal tidak dapat bergabung ke pertandingan online.

## Uji manual dua klien

1. Terapkan migration dan deploy function.
2. Buat satu game `active` dengan dua UUID akun dan timer dimulai.
3. Login sebagai kedua akun di dua browser, lalu buka komponen dengan `gameId` sama.
4. Mainkan satu langkah Putih. Pastikan Hitam melihat papan dan riwayat berubah tanpa reload.
5. Coba langkah ilegal, langkah dari akun bukan pemain, dan langkah dari giliran yang salah; semuanya harus ditolak.
6. Kirim dua request bersamaan dengan `expectedPly` sama; maksimal satu boleh commit.
7. Uji clock hingga habis. Pastikan RPC mengubah status menjadi `timeout` berdasarkan timestamp database.
