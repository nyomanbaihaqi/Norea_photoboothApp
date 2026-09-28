# 18 · Testing Standard

Photobooth sangat tergantung hardware, jadi pengujian dibagi dua: **otomatis** untuk logika murni dan **manual** untuk hardware & alur tamu.

## 1. Otomatis

| Jenis | Alat | Kapan |
|---|---|---|
| Typecheck | `npm run typecheck` | Setiap commit (CI) |
| Unit test | Vitest (`npm test`) | Setiap commit (CI) |
| Build | `npm run build` | Setiap PR (CI) |

### Wajib punya unit test

- `scheduler.ts`: least-busy, round-robin, printer tidak tersedia, semua printer mati
- `layouts.ts`: jumlah slot = jumlah foto, slot di dalam kanvas, strip digandakan benar
- parser link folder Drive (berbagai format URL)
- pembuat nama file & folder event (karakter ilegal Windows dibuang)
- format tanggal Indonesia ("28 September 2026")
- migrasi `data.json` antar versi

## 2. Manual (checklist per fitur)

### Kamera
- [ ] Semua kamera terdeteksi & bisa diganti tanpa restart
- [ ] Resolusi aktual ditampilkan & sesuai pilihan (atau batas maksimal kamera)
- [ ] Cabut kamera saat live → pesan jelas, tidak crash
- [ ] Mirror hanya memengaruhi tampilan live sesuai setting, hasil foto sesuai setting

### Sesi foto
- [ ] Countdown, jeda, jumlah jepretan sesuai pengaturan event
- [ ] Retake per foto & semua berjalan
- [ ] Filter di preview = filter di hasil
- [ ] Hasil jadi = tampilan di Preview/Frame Generator (piksel-perfect)

### Printer
- [ ] Printer baru di-install → muncul setelah refresh
- [ ] 2+ printer aktif → job terbagi sesuai mode
- [ ] 1 printer offline/kertas habis → dilewati
- [ ] Semua printer mati → job antri, jalan otomatis saat printer kembali
- [ ] Ukuran cetak 4R, strip, dan 5R tidak terpotong & tanpa margin putih yang tidak diinginkan
- [ ] Jumlah copy benar

### Google Drive & QR
- [ ] Login Google → email tampil
- [ ] Paste link folder → nama folder tampil. Link salah → pesan jelas
- [ ] Upload online → QR muncul < 10 detik (internet stabil)
- [ ] Upload offline → antri → terkirim saat online, termasuk setelah app di-restart
- [ ] QR dibuka di HP lain → halaman download tampil & bisa download

### Kamera HP
- [ ] Scan QR → HP tersambung → live tampil di Studio
- [ ] Jepret memakai foto resolusi penuh dari HP
- [ ] HP terputus → Studio memberi tahu & bisa sambung ulang

### Mode Tamu & PIN
- [ ] Esc / Alt+F4 / Alt+Tab tidak keluar dari mode tamu tanpa PIN
- [ ] PIN salah 5x → jeda
- [ ] PIN default dipaksa diganti

## 3. Matriks Hardware

Catat setiap hardware yang pernah diuji di sini:

| Tanggal | Jenis | Merk / Model | Hasil | Catatan |
|---|---|---|---|---|
| | Printer | | | |
| | Kamera | | | |
| | HP | | | |

## 4. Kriteria Rilis

- Semua otomatis lulus
- Skenario Event Lengkap ([08-qa-agent.md](08-qa-agent.md)) lulus minimal di 1 set hardware nyata
- Tidak ada bug berstatus kritis (sesi gagal, crash, foto hilang)
