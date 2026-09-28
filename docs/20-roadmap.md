# 20 · Roadmap

Urutan fase disusun supaya **setiap fase menghasilkan sesuatu yang bisa dicoba**. Fase 1–4 sudah cukup untuk event pertama (offline, tanpa Drive).

| Fase | Nama | Hasil yang bisa dicoba | Status |
|---|---|---|---|
| 0 | Dokumentasi & fondasi | Dokumen ini, scaffold proyek | ✅ Selesai |
| 1 | Kerangka aplikasi | App terbuka, kunci PIN, navigasi menu, CRUD event, pengaturan tersimpan | ✅ Selesai, diuji |
| 2 | Kamera & sesi foto | Studio + Mode Tamu: pilih kamera, countdown, jepret, retake, filter, hasil tersimpan | ✅ Selesai, diuji (webcam) |
| 3 | Layout, Frame Generator & Preview | Template bawaan + upload PNG, teks nama/tanggal/info, preview mockup, galeri | ✅ Selesai, diuji |
| 4 | Multi-printer | Pilih printer, print senyap, pembagian otomatis, status, cetak ulang | 🧪 Kode selesai, belum uji cetak nyata |
| 5 | Google Drive + QR + halaman download | Login Google, link folder per event, upload + antrian offline, QR, web `/d` di Vercel | 🧪 Kode selesai, butuh OAuth client & deploy Vercel |
| 6 | Kamera HP | Web `/camera` di Vercel, sambung via QR, foto resolusi penuh | ✅ Diuji via Vercel (HP simulasi). Tinggal uji HP asli |
| 7 | Packaging & uji lapangan | Installer, CI/CD GitHub, auto-update, uji event nyata, perbaikan | 🚧 Installer, CI & auto-update siap. Uji lapangan belum |
| 8 | AI Photobooth | Tema (bola, sekolah, pekerjaan, game, dll) | ⏸️ Ditunda |

## Detail Fase

### Fase 1 · Kerangka aplikasi
- Main: window, store `data.json`, protocol `norea://`, PIN (scrypt), IPC dasar, logger
- Renderer: layout gelap ala OBS, sidebar menu, halaman Kunci PIN, Event (CRUD + pengaturan sesi), Pengaturan
- `src/shared/layouts.ts` + `defaults.ts`
- Setup Vitest + CI dasar

### Fase 2 · Kamera & sesi foto
- `camera.ts`: daftar perangkat, pilih resolusi, tampil resolusi aktual
- Mesin sesi (state machine) + semua opsi sesi
- Studio (Program + panel kontrol) & Mode Tamu (layar penuh, keluar pakai PIN)
- Simpan raw + final per event

### Fase 3 · Layout, Frame Generator & Preview
- `compose.ts` (satu mesin render untuk semua)
- 9 layout, 6 gaya template bawaan, upload overlay/background PNG
- Editor teks drag & drop, font bundel, format tanggal Indonesia
- Preview mockup + galeri sesi

### Fase 4 · Multi-printer
- Polling `Get-Printer`, scheduler + unit test, print senyap dengan ukuran kertas layout
- Halaman Printer: aktif/nonaktif, status, antrian, test print, mode pembagian
- Auto-print / konfirmasi, jumlah copy, cetak ulang dari galeri

### Fase 5 · Google Drive + QR
- OAuth loopback + PKCE, `safeStorage`, cek folder, upload, permission, antrian & retry
- QR di layar hasil (+ opsional di cetakan)
- Web pendamping `/d` + deploy Vercel

### Fase 6 · Kamera HP
- Web `/camera` (PeerJS, wake lock, depan/belakang)
- `phoneCamera.ts` sebagai `CameraSource`, capture resolusi penuh via data channel
- Konfirmasi operator untuk koneksi baru

### Fase 7 · Packaging & uji lapangan
- Ikon, installer NSIS, workflow release, auto-update
- Skenario Event Lengkap di hardware nyata, perbaikan bug

## Nanti (belum dijadwalkan)
- AI Photobooth (Fase 8), perlu memilih penyedia AI & biaya per foto
- Tethering DSLR resolusi penuh (digiCamControl / gphoto2)
- GIF / boomerang
- Sinkron multi-booth (database cloud)
- Code signing installer
- Dukungan macOS
