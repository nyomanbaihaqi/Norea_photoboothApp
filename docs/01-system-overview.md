# 01 · System Overview

## Apa ini?

**Norea Photobooth App** adalah aplikasi photobooth untuk dipakai di event (wedding, ulang tahun, corporate, sekolah). Operator menjalankannya di satu laptop Windows yang tersambung ke kamera dan satu atau lebih printer foto.

## Pengguna

| Peran | Kebutuhan |
|---|---|
| **Operator** (crew Norea) | Menyiapkan event, memilih kamera, printer, dan template, memantau antrian print & upload, mencetak ulang. Masuk dengan **PIN**. |
| **Tamu** | Menekan "Mulai", berpose, melihat hasil, mengambil cetakan, scan QR untuk softcopy. |

## Istilah Penting

| Istilah | Arti |
|---|---|
| **Event** | Satu acara, berisi nama, tanggal, info tambahan, template frame, folder Drive, dan pengaturan sesi. |
| **Sesi** | Satu giliran tamu foto (1–6 jepretan) yang menghasilkan satu hasil jadi. |
| **Layout / Bingkai** | Susunan & ukuran kertas: posisi slot foto, misalnya strip 2x6 atau grid 2x2. |
| **Frame** | Desain di dalam gambar: background, overlay PNG, teks nama/tanggal/info, dekorasi, QR. |
| **Template** | Gabungan layout + frame yang tersimpan dan bisa dipakai ulang di event. |
| **Program** | Tampilan utama di Studio (live kamera, countdown, hasil). Preview dan Program digabung jadi satu layar. |
| **Mode Tamu** | Layar penuh khusus tamu. Menu operator disembunyikan. |
| **Web Pendamping** | Situs statis di Vercel: halaman kamera HP + halaman download softcopy. |

## Fitur

### 1. Studio (fitur utama foto)
- Sumber kamera: webcam laptop, kamera USB, capture card, DSLR/mirrorless mode webcam, dan **HP nirkabel**.
- Pilihan resolusi 720p / 1080p / 4K (sesuai kemampuan kamera).
- Opsi sesi per event:
  - countdown (3/5/10 detik atau custom)
  - jumlah jepretan (ikut layout)
  - jeda antar jepretan
  - retake per foto / semua / tidak ada
  - mirror
  - filter (normal, hitam putih, sepia, hangat, dingin, vivid, soft)
  - efek flash
  - suara
  - auto-print atau konfirmasi dulu
  - jumlah copy
  - tampilkan QR
  - durasi layar hasil
- Tombol **MULAI SESI** besar, thumbnail jepretan, dan riwayat hasil terakhir.

### 2. Upload Google Drive
- Login akun Google **sekali** di Pengaturan.
- Per event cukup **copas link folder Drive**.
- Upload otomatis di background. Kalau offline, masuk antrian dan dikirim ulang saat online.
- File dibuat "siapa saja yang punya link bisa melihat" supaya QR bisa dipakai tamu (bisa dimatikan).

### 3. QR Softcopy
- Setelah upload, layar hasil menampilkan QR menuju halaman download (web pendamping di Vercel) yang bertema event.
- Opsional: QR ikut dicetak di foto (kalau template mengaktifkannya dan upload selesai tepat waktu).

### 4. Frame Generator
- Template bawaan siap pakai (Minimalis Putih, Hitam Elegan, Pastel, Emas Wedding, Ceria Ulang Tahun, Film Strip).
- **Upload desain PNG sendiri** (dari Canva/Photoshop) sebagai overlay di atas foto dan/atau background di bawah foto.
- Teks otomatis: **nama**, **tanggal** (format bisa dipilih), **info tambahan**, dan teks custom. Font, warna, ukuran, dan posisi (drag) bisa diatur.
- Font dibundel di aplikasi supaya jalan offline.

### 5. Preview
- Visual hasil jadi: foto contoh/foto sesi + frame + bingkai mockup (cetak polos, bingkai putih, bingkai kayu, strip dipegang).
- Galeri per event: lihat, cetak ulang, upload ulang, buka folder.

### 6. Printer (multi-printer)
- Daftar semua printer yang ter-install di Windows. Operator mencentang printer mana yang aktif.
- Mode pembagian: **paling kosong** (default) atau **bergantian (round-robin)**.
- Status tiap printer (antrian Windows, offline/error) diperbarui berkala. Printer bermasalah dilewati otomatis.
- Print senyap (tanpa dialog) dengan ukuran kertas sesuai layout.

### 7. Multi-event
- Buat, edit, duplikat, dan hapus event. Satu event aktif dalam satu waktu.
- Data tersimpan lokal di satu laptop.

### 8. PIN Operator
- Aplikasi terbuka ke layar kunci PIN. PIN default `1234` dan wajib diganti saat pertama kali pakai.
- Keluar dari Mode Tamu wajib PIN.

### 9. AI Photobooth. **Ditunda.**
Menu tampil dengan label "Segera hadir".

## Ukuran Cetak yang Didukung

Semua gambar dirender di **300 DPI**.

| ID | Nama | Kertas | Piksel | Foto |
|---|---|---|---|---|
| `4r-1` | 4R Portrait, 1 foto | 4x6 in (102x152 mm) | 1200x1800 | 1 |
| `4r-2x2` | 4R Portrait, grid 2x2 | 4x6 in | 1200x1800 | 4 |
| `4r-3v` | 4R Portrait, 3 foto | 4x6 in | 1200x1800 | 3 |
| `4r-l1` | 4R Landscape, 1 foto | 6x4 in | 1800x1200 | 1 |
| `4r-l3` | 4R Landscape, 1 besar + 2 kecil | 6x4 in | 1800x1200 | 3 |
| `strip-3` | Strip 2x6, 3 foto | 2 strip di 1 lembar 4R | 600x1800 (x2) | 3 |
| `strip-4` | Strip 2x6, 4 foto | 2 strip di 1 lembar 4R | 600x1800 (x2) | 4 |
| `5r-1` | 5R Portrait, 1 foto | 5x7 in (127x178 mm) | 1500x2100 | 1 |
| `5r-2x2` | 5R Portrait, grid 2x2 | 5x7 in | 1500x2100 | 4 |

Catatan: printer foto dye-sub (DNP, HiTi, Citizen) biasanya punya opsi **"2 inch cut"** di driver untuk strip. Printer inkjet mencetak 4R lalu strip dipotong manual.

## Keputusan Utama (ringkas)

Detail lengkap ada di [14-project-memory.md](14-project-memory.md).

- Desktop **Electron** (bukan web murni), karena web tidak bisa memilih printer atau print senyap.
- **Hybrid**: halaman kamera HP & download tamu ada di **Vercel** (butuh HTTPS publik).
- Drive pakai **OAuth login sekali**, bukan service account (service account tidak punya kuota di Drive Gmail biasa).
- Internet: dua kondisi (online/offline), acuan utama **online stabil**.

## Di Luar Scope (saat ini)

- AI Photobooth (ditunda)
- Tethering DSLR resolusi penuh (gphoto2/digiCamControl), karena saat ini DSLR dipakai lewat mode webcam
- Sinkronisasi multi-laptop / multi-booth
- macOS & Linux
- Pembayaran / sistem tiket
