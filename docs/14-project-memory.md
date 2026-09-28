# 14 · Project Memory

Ingatan jangka panjang proyek: **status terkini**, **log keputusan**, dan **pertanyaan terbuka**. Wajib diperbarui setiap ada keputusan baru.

## Status Terkini

*Diperbarui: 2026-09-28*

- **Fase:** 1–3 selesai & diuji. Fase 4–6 kode selesai, menunggu uji hardware/akun. Fase 7 sebagian.
- **Sudah jalan & diuji di laptop dev (Windows 11, webcam bawaan):**
  - Kunci PIN + paksa ganti PIN default, Mode Tamu layar penuh (keluar: Esc / 5x tap pojok kiri atas + PIN)
  - Sesi foto penuh: countdown → jepret → komposisi strip → simpan final/print/raw
  - Semua halaman: Studio, Event, Frame Generator, Preview & Galeri, Printer (6 printer terdeteksi), Pengaturan, AI (placeholder)
  - Web pendamping `/d` (download) & `/camera` (kamera HP) tampil benar di viewport HP (server lokal)
  - `npm run typecheck` lulus, 34 unit test lulus, `npm run dist` → `dist/Norea-Photobooth-Setup-0.1.0.exe`
- **Belum diuji:** cetak ke printer nyata, upload Google Drive (butuh OAuth client), kamera HP end-to-end (butuh deploy Vercel), installer di laptop bersih
- **Auto-update:** sudah dibuat & dicek di versi terpaket (status error jelas: "Belum ada rilis di GitHub"). Alur update end-to-end belum diuji karena repo belum ada. `owner` di `electron-builder.yml` masih `GANTI-AKUN-NOREA`
- **Belum dibuat:** code signing, repo GitHub & project Vercel (menunggu akun Norea)
- **Catatan:** ikon `build/icon.png` masih sementara, ganti dengan logo Norea asli

## Log Keputusan

| # | Tanggal | Keputusan | Alasan |
|---|---|---|---|
| D-01 | 2026-09-28 | Nama aplikasi: **Norea Photobooth App** | Dari pemilik proyek |
| D-02 | 2026-09-28 | Aplikasi utama **Electron desktop**, bukan web murni | Web tidak bisa melihat printer ter-install, print senyap, atau memilih printer. Butuh juga offline & simpan lokal |
| D-03 | 2026-09-28 | **Hybrid**: web pendamping statis di **Vercel** untuk kamera HP & halaman download tamu | Kamera HP butuh HTTPS publik, dan QR softcopy butuh halaman yang bisa dibuka dari HP tamu |
| D-04 | 2026-09-28 | Target **Windows saja** untuk sekarang | Semua laptop booth Windows |
| D-05 | 2026-09-28 | Printer: pilih dari driver yang ter-install di Windows, bagi otomatis (least-busy default, round-robin opsional) | Printer bisa beda-beda tiap event |
| D-06 | 2026-09-28 | Kamera: semua perangkat video (webcam, USB, capture card, DSLR mode webcam) + HP via WebRTC/PeerJS | Kamera bervariasi. Tethering DSLR resolusi penuh ditunda |
| D-07 | 2026-09-28 | Internet: dua kondisi (online/offline). Acuan utama online stabil. Upload pakai antrian | Sesi tamu tidak boleh gagal karena internet |
| D-08 | 2026-09-28 | Satu layar: Preview + Program digabung (ala OBS) + Mode Tamu layar penuh | Operator cuma pakai 1 layar |
| D-09 | 2026-09-28 | Opsi sesi dibuat banyak & bisa diatur per event | Permintaan pemilik proyek |
| D-10 | 2026-09-28 | Google Drive: **login OAuth sekali**, per event copas link folder | Service account tidak punya kuota storage di Drive Gmail biasa |
| D-11 | 2026-09-28 | QR softcopy ke halaman download bertema di web pendamping | Supaya tamu bisa download sendiri & tampil menarik |
| D-12 | 2026-09-28 | **Frame** = desain di dalam gambar (nama/tanggal/info). **Bingkai/Layout** = susunan & ukuran cetak | Disepakati dengan pemilik proyek |
| D-13 | 2026-09-28 | Frame Generator: template siap pakai + upload PNG desain sendiri | Permintaan pemilik proyek |
| D-14 | 2026-09-28 | **AI Photobooth ditunda**. Cuma placeholder menu | Permintaan pemilik proyek |
| D-15 | 2026-09-28 | Multi-event, data lokal di 1 laptop | Belum butuh sinkron multi-booth |
| D-16 | 2026-09-28 | Proteksi operator: **PIN** saja | Cukup sederhana |
| D-17 | 2026-09-28 | UI **Bahasa Indonesia** | Permintaan pemilik proyek |
| D-18 | 2026-09-28 | Ukuran cetak default: 4R (1/grid 2x2/3 foto/landscape), strip 2x6 (2 per lembar 4R), 5R | Pemilik proyek belum tahu ukuran yang dipakai, jadi dipilih ukuran umum photobooth |
| D-19 | 2026-09-28 | Repo GitHub & Vercel memakai **akun Norea**, bukan akun pribadi | Permintaan pemilik proyek |
| D-20 | 2026-09-28 | Data lokal pakai file JSON (`data.json`), bukan SQLite | Hindari native module yang mempersulit build Electron. Volume data kecil |
| D-21 | 2026-09-28 | Signaling kamera HP pakai **PeerJS Cloud** | Tidak perlu server sendiri. Vercel tidak mendukung websocket |
| D-22 | 2026-09-28 | Mirror berlaku untuk live view **dan** hasil foto (WYSIWYG) | Tamu melihat hasil sama persis dengan yang dilihat di layar |
| D-23 | 2026-09-28 | ID file Drive dipesan di awal (`generateIds`) supaya QR bisa tampil/tercetak sebelum upload selesai | Halaman `/d` otomatis retry sampai foto tersedia |
| D-24 | 2026-09-28 | Ketinggalan status printer dari Windows ditutup dengan hitungan `inFlight` 12 detik per job | `JobCount` driver sering telat muncul |
| D-25 | 2026-09-28 | Build lokal `npm run dist` pakai `--publish never`, upload rilis hanya dari workflow release | Build lokal tidak butuh token GitHub |
| D-27 | 2026-09-28 | Workflow rilis: buat draft dulu → electron-builder upload → terbitkan | v0.1.0 sempat jadi 2 rilis dobel karena upload paralel |
| D-26 | 2026-09-28 | Auto-update via `electron-updater` + GitHub Releases: cek 30 dtk setelah buka & tiap 4 jam, download di background, **pasang saat app ditutup / tombol operator**, tidak pernah restart sendiri, diblok saat Mode Tamu | Update tidak boleh mengganggu sesi tamu di tengah event |

## Pertanyaan Terbuka

| # | Pertanyaan | Rekomendasi | Status |
|---|---|---|---|
| Q-01 | Konfirmasi: web pendamping di Vercel tetap dipakai (untuk kamera HP & halaman download QR)? | Ya, hanya halaman statis & gratis | Menunggu |
| Q-02 | Warna brand & logo Norea untuk tema aplikasi dan halaman download? | Kirim logo PNG + 1–2 warna utama | Menunggu |
| Q-03 | Nama akun GitHub & Vercel Norea yang akan dipakai? | – | ✅ GitHub: `nyomanbaihaqi/Norea_photoboothApp` (public). Vercel disetup sendiri oleh pemilik |
| Q-06 | Repo private atau public (untuk auto-update)? | – | ✅ Repo dijadikan public oleh pemilik |
| Q-04 | Printer & kamera apa yang tersedia untuk uji coba? | Minimal 2 printer + 1 webcam + 1 HP Android | Menunggu |
| Q-05 | Siapa yang membuat Google Cloud project (OAuth client)? | Akun Google Norea, ikuti [19-deployment.md](19-deployment.md) | Menunggu |
