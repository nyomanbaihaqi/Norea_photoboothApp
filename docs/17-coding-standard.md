# 17 · Coding Standard

## Umum

- **TypeScript strict** di semua kode `src/`. Hindari `any`. Kalau terpaksa, pakai `unknown` lalu dipersempit.
- Target: Electron 44 (Chromium & Node modern). Boleh pakai fitur ES2022+.
- Format: 2 spasi, tanpa titik koma, kutip tunggal, lebar baris ±100.
- File < ±300 baris. Kalau lebih, pecah per tanggung jawab.

## Bahasa

| Elemen | Bahasa | Contoh |
|---|---|---|
| Nama file, variabel, fungsi, tipe | Inggris | `pickPrinter()`, `SessionRecord` |
| Teks UI | Indonesia | "Mulai Sesi", "Printer offline" |
| Pesan error ke user | Indonesia | "Folder Drive tidak bisa diakses" |
| Komentar | Indonesia atau Inggris, singkat, jelaskan *kenapa* | `// status Windows sering telat, jadi hitung inFlight sendiri` |

## Penamaan

- Komponen React: `PascalCase.tsx` (`PrinterCard.tsx`)
- Modul lain: `camelCase.ts` (`phoneCamera.ts`)
- Konstanta global: `UPPER_SNAKE` (`DEFAULT_SESSION`)
- Channel IPC: `domain:aksi` (`printer:print`, `drive:checkFolder`)
- Boolean: awalan `is/has/can/should` (`isOnline`, `hasOverlay`)

## React

- Function component + hooks. Tidak ada class component.
- Satu komponen per file untuk komponen yang dipakai ulang.
- State global (event aktif, settings, status printer/drive) di Zustand. State form di komponen.
- Efek yang membuka kamera/timer/listener **wajib** punya cleanup.
- Styling pakai Tailwind utility. Token warna didefinisikan di `styles.css` (`@theme`).

## Main Process

- Setiap handler IPC: validasi input → kerjakan → kembalikan `Result<T>`:
  ```ts
  type Result<T> = { ok: true; data: T } | { ok: false; error: string }
  ```
- Jangan `throw` sampai ke renderer.
- Semua akses file pakai `fs/promises`. Penulisan data penting harus atomik.
- Proses eksternal (`child_process`) hanya dengan argumen tetap (`execFile`, bukan `exec` dengan string rakitan).

## Import

- Alias: `@/` = `src/renderer/src`, `@shared/` = `src/shared`.
- Urutan: library luar → alias internal → relatif.

## Git

- Commit kecil & fokus. Pesan: `feat: tambah scheduler printer least-busy`.
- Jangan commit `out/`, `dist/`, `.env`, `data.json`, atau foto.
