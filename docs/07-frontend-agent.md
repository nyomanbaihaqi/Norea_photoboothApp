# 07 · Frontend Agent

## Area Kerja

```
src/renderer/**   (UI aplikasi desktop)
web/**            (web pendamping Vercel: /camera dan /d)
```

## Halaman Aplikasi

| Halaman | Isi utama |
|---|---|
| **Kunci PIN** | Keypad angka besar, pesan salah, paksa ganti PIN default |
| **Studio** | Kanvas Program besar (live + overlay countdown/hasil), panel kanan: event aktif, pilih kamera, template, tombol **MULAI SESI**, thumbnail jepretan, hasil terakhir, status printer & upload |
| **Mode Tamu** | Layar penuh: layar sambutan → countdown → review → hasil + QR. Tombol keluar tersembunyi di pojok → PIN |
| **Event** | Daftar event, form (nama, tanggal, info, template, link Drive + cek folder, pengaturan sesi) |
| **Frame Generator** | Pilih layout, pilih gaya bawaan atau upload PNG, editor teks (drag posisi, font, warna, ukuran), QR, simpan template |
| **Preview** | Mockup hasil (cetak, bingkai putih, bingkai kayu, strip dipegang) + galeri sesi: cetak ulang, upload ulang |
| **Printer** | Daftar printer Windows, centang aktif, status & antrian, mode pembagian, test print, riwayat job |
| **Pengaturan** | PIN, resolusi kamera, akun Google, URL web pendamping, folder simpan, info versi |
| **AI Photobooth** | Placeholder "Segera hadir" |

## Gaya Visual

- **Tema gelap ala OBS/studio**: latar `#0f1115`, panel `#171a21`, aksen merah "LIVE" `#ef4444` untuk tombol mulai/rekam, aksen brand Norea (ditentukan di token warna Tailwind).
- Tombol untuk tamu **besar** (min 64px tinggi), bisa disentuh (layar sentuh).
- Font UI: Poppins (dibundel). Font frame: pilihan dari font yang dibundel di `@fontsource/*`.
- Semua teks Bahasa Indonesia, singkat, ramah: "Siap-siap!", "Senyum ya 😄", "Scan buat ambil softcopy".

## Aturan

1. Renderer **tidak** memakai modul Node. Semua akses OS lewat `window.api`.
2. Komposisi gambar hanya di `lib/compose.ts` (satu sumber kebenaran). Preview, Frame Generator, dan sesi memakai fungsi yang sama supaya hasil preview = hasil cetak.
3. Sebelum menggambar teks ke kanvas, tunggu font dimuat (`document.fonts.load`).
4. State global pakai Zustand (`src/renderer/src/store`). State lokal halaman pakai `useState`.
5. Kamera harus di-`stop()` saat pindah sumber atau halaman, supaya kamera tidak "sibuk".
6. Mode Tamu tidak boleh menampilkan error teknis. Tampilkan pesan ramah, detailnya dicatat untuk operator.

## Web Pendamping (`web/`)

- HTML/CSS/JS statis tanpa build step. Ringan untuk HP.
- `/camera/`: minta izin kamera, pilih depan/belakang, status "Terhubung ke booth", tetap menyala (Wake Lock API).
- `/d/`: tampilkan foto, tombol **Download**, nama event, branding Norea, fallback kalau foto belum siap.

## Checklist Sebelum Serah ke QA

- [ ] `npm run typecheck` lulus
- [ ] Dicoba di resolusi 1366x768 dan 1920x1080
- [ ] Mode Tamu tidak bisa ditutup tanpa PIN (Esc, Alt+F4 ditangani)
- [ ] Tidak ada teks bahasa Inggris di UI
