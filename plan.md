# Rencana GS-ChessX — Perspektif Papan 3D & Pembelajaran Catur

## Tujuan
Memperbarui ruang permainan agar papan 3D dapat diputar ke kiri/kanan dan atas/bawah, memiliki zoom 40%–120% termasuk pinch gesture, serta memastikan seluruh konfigurasi berada di luar area papan. Setiap masuk ruang permainan akan menampilkan storytelling sejarah catur, puzzle strategi, dan quiz interaktif.

## Pendekatan implementasi
- **ChessBoard3D.jsx** tetap menjadi pemilik state kamera/perspektif: azimuth horizontal, kemiringan vertikal, zoom ter-clamp pada 0.4–1.2, reset, fullscreen, wheel zoom, drag orbit, dan pinch zoom.
- Interaksi petak memakai **Three.js raycaster** pada canvas, sehingga pemilihan petak tetap akurat walaupun kamera miring atau diputar. Highlight petak legal, langkah terakhir, dan skak dirender di scene 3D; overlay HTML hanya menyisakan informasi pemain yang pointer-transparent.
- Kontrol perspektif ditampilkan sebagai panel flow di bawah papan, bukan floating overlay, sehingga tidak menutupi papan. Panel berisi tombol kiri/kanan/atas/bawah, slider zoom 40%–120%, reset, fullscreen, dan petunjuk gesture.
- **HistoricalSplash.jsx** tampil satu kali setiap Game Room mount dengan satu dari delapan momen sejarah lintas era dan ilustrasi epik khusus per momen dari aset PNG/SVG lokal; pemain dapat masuk ke papan atau melewati splash.
- **ChessLearningPanel.jsx** menjadi mode lengkap di halaman Chess Academy di luar permainan. Story, Puzzle Strategi, dan Quiz tersedia di sana; setiap puzzle menampilkan diagram posisi catur visual, feedback jawaban, dan penjelasan.
- **Lobby.jsx** menjadi dashboard mobile-first bergaya premium sesuai referensi: hero catur sinematik, kartu profil, grid fitur berwarna, kartu turnamen, statistik, leaderboard, serta bottom navigation mobile yang tetap terhubung ke semua fitur aplikasi.
- Gaya visual memakai token GS-ChessX yang sudah ada (obsidian, graphite, gold, emerald) dengan panel padat dan responsif agar tidak menggeser/menutupi papan.

## Struktur proyek
- `src/components/ChessBoard3D.jsx`: kamera, gesture, raycasting, dan kontrol perspektif.
- `src/components/ChessLearningPanel.jsx`: storytelling, puzzle, dan quiz interaktif.
- `src/components/GameRoom.jsx`: integrasi panel pembelajaran dan panel kontrol papan.
- `src/index.css`: gesture/touch affordance kecil bila diperlukan.
- `public/manus-routes.json`: deklarasi rute SPA.

## Design
- **Design Movement:** *Tactical Observatory* — interface gelap seperti ruang observasi, dengan gold sebagai aksen artefak sejarah dan emerald sebagai sinyal langkah benar.
- **Core Principles:** papan selalu menjadi fokus utama; konfigurasi berada dalam alur dokumen; edukasi singkat dan dapat dipindai; feedback interaksi jelas tanpa modal yang menghalangi permainan.
- **Color Philosophy:** obsidian/graphite menciptakan ruang tenang untuk fokus, gold menandai perspektif dan sejarah, emerald menegaskan langkah/insight yang benar, crimson hanya untuk bahaya/skak.
- **Layout Paradigm:** tiga kolom tetap dipertahankan; kolom tengah berisi papan dan kontrolnya secara vertikal, kolom kanan fokus pada history pertandingan. Puzzle/Quiz memiliki menu Chess Academy sendiri di luar permainan; splash menjadi satu-satunya visual pembuka yang sementara menutup layar.
- **Dashboard adaptation:** home memakai komposisi mobile-first seperti referensi unggahan—header ringkas, hero CTA, profile summary, feature tiles dua kolom, tournament/stat cards, lalu bottom navigation pada viewport kecil.
- **Signature Elements:** label bab sejarah bergaya arsip, tombol kamera sebagai kompas empat arah, dan feedback jawaban berupa garis gold/emerald.
- **Interaction Philosophy:** tap tombol untuk perubahan presisi, drag untuk orbit cepat, pinch/wheel untuk zoom; tidak ada kontrol kamera yang menutupi petak.
- **Animation:** transisi perspektif instan dan ringan; panel jawaban memakai fade/slide kecil; hormati reduced motion yang sudah didukung scene.
- **Typography System:** Cinzel untuk judul/artefak sejarah, Inter untuk UI dan penjelasan, JetBrains Mono untuk persentase zoom dan notasi.
- **Brand Essence:** ruang catur historis yang menjadikan setiap pertandingan sebagai sesi belajar — fokus, taktis, berkarakter.
- **Brand Voice:** singkat, instruktif, dan sedikit epik. Contoh: “Baca papan sebelum memburu materi.” / “Satu langkah, satu warisan.”
- **Wordmark & Logo:** pertahankan wordmark GS-ChessX dan simbol bidak yang sudah ada.
- **Signature Brand Color:** `#D4AF37` gold artefak.
