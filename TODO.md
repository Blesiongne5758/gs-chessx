# TODO GS-ChessX

## Papan 3D dapat dikendalikan tanpa menutupi papan
- [x] Papan 3D dapat diputar kiri dan kanan dengan kontrol presisi; papan juga dapat diubah sudutnya atas dan bawah.
- [x] Zoom papan tersedia dari 40% hingga 120% melalui tombol dan slider, dengan label persentase yang terlihat.
- [x] Pinch in/out pada perangkat sentuh mengubah zoom papan dalam batas 40%–120%; drag pada papan mengubah perspektif.
- [x] Kontrol perspektif dan konfigurasi tidak menutupi papan; panel konfigurasi diletakkan di luar area render papan.
- [x] Pemilihan petak, highlight langkah legal, langkah terakhir, dan status skak tetap akurat saat perspektif berubah.

## Splash sejarah dan Chess Academy di luar permainan
- [x] Storytelling sejarah dihapus dari dalam permainan Quick Match dan VS AI karena tersedia pada menu Chess Academy.
- [x] Saat memasuki ruang permainan, satu splash sejarah epik dipilih secara random dan menampilkan visual momen sejarah, tahun, narasi singkat, pelajaran strategi, serta tombol masuk atau lewati.
- [x] Bank splash diperluas menjadi delapan momen ikonik lintas era, masing-masing dengan ilustrasi epik unik berbasis aset PNG/SVG.
- [x] Puzzle dan Quiz tersedia pada menu Chess Academy di luar permainan dengan pilihan jawaban, feedback, skor, dan penjelasan.
- [x] Setiap puzzle strategi menampilkan diagram posisi papan catur visual sebelum pertanyaan.

## Dashboard UI/UX sesuai desain terbaru
- [x] Home setelah login memakai header gelap premium, hero catur sinematik dengan CTA Quick Match dan VS AI, kartu profil/rating, grid fitur berwarna, kartu upcoming tournament, statistik, leaderboard, dan bottom navigation mobile.
- [x] Setiap tile dashboard tetap terhubung ke fitur yang tersedia: Quick Match, VS AI, Chess Academy, Tournaments, Friends & Chat, Profile/Settings, serta Shop placeholder.
- [x] Header atas fixed dan tidak bergerak, bottom navigation fixed tersedia pada seluruh halaman terautentikasi, dan safe-area memastikan konten tidak tertutup navigasi.
- [x] ELO rating, win rate, jumlah games, dan daftar top players diperbarui realtime melalui subscription perubahan tabel profiles; mode tamu memakai fallback localStorage.

## Validasi teknis
- [x] Build Vite, lint, dan test yang sudah ada lulus setelah perubahan.
- [x] Perubahan dikomit dan didorong ke `main` repository `Blesiongne5758/gs-chessx`.

## Crypto wallet non-custodial — placeholder architecture
- [ ] Wallet hanya menyimpan alamat publik, chain metadata, status koneksi, dan waktu koneksi; private key, seed phrase, dan secret token tidak pernah masuk ke aplikasi atau Supabase.
- [ ] Pengguna dapat membuka halaman Crypto Wallet, mendeteksi provider EVM/Solana, menghubungkan wallet, menandatangani pesan kepemilikan, menyalin alamat, dan melepas wallet.
- [ ] Panel token menampilkan contract placeholder dan tombol claim yang tetap nonaktif sampai jaringan, contract address, eligibility server-side, dan mekanisme anti-replay siap.
- [ ] Migration Supabase membatasi kolom wallet pada metadata publik; saldo, eligibility, dan distribusi token belum dianggap aktif.
