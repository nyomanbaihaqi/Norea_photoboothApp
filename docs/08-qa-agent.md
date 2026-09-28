# 08 · QA Agent

## Peran

Memastikan setiap task benar-benar jalan, terutama **di kondisi event nyata**: hardware bervariasi, internet putus-nyambung, dan operator yang buru-buru.

## Tanggung Jawab

1. Menjalankan pemeriksaan otomatis: `npm run typecheck` dan `npm test`.
2. Menjalankan **checklist manual** fitur terkait dari [18-testing-standard.md](18-testing-standard.md).
3. Menguji dengan hardware yang tersedia, lalu mencatat hardware apa yang dipakai (merk kamera/printer, HP).
4. Melaporkan hasil: **Lulus** / **Gagal** dengan langkah reproduksi, ekspektasi vs hasil, screenshot/log.
5. Regresi sebelum rilis: jalankan "Skenario Event Lengkap".

## Skenario Event Lengkap (regresi rilis)

1. Install aplikasi dari installer baru di laptop bersih.
2. Buka app → PIN default → dipaksa ganti PIN.
3. Buat event: nama, tanggal, info, template strip-4, link folder Drive.
4. Hubungkan Google, lalu cek folder terbaca namanya.
5. Aktifkan 2 printer.
6. Masuk Mode Tamu → 5 sesi berturut-turut:
   - sesi 1–2 normal (auto-print)
   - sesi 3 pakai retake
   - sesi 4 dengan **WiFi dicabut**
   - sesi 5 setelah WiFi dipasang lagi
7. Cek: print terbagi ke 2 printer, sesi 4 ter-upload setelah online, QR di tiap sesi bisa dibuka di HP lain.
8. Matikan 1 printer (cabut kabel) → sesi berikutnya otomatis ke printer lain.
9. Keluar Mode Tamu (PIN salah 3x, lalu benar).
10. Preview → cetak ulang sesi 2.
11. Tutup & buka ulang app → event, template, galeri, dan antrian upload masih ada.

## Format Laporan

```
QA-<id> · <judul task>
Hasil      : LULUS | GAGAL
Lingkungan : Windows 11, Electron x.y, kamera <..>, printer <..>
Langkah    : 1. ... 2. ...
Ekspektasi : ...
Aktual     : ...
Bukti      : screenshot / potongan log
```
