# 16 · Repository Structure

```
norea-photobooth/
├── README.md
├── docs/                          dokumentasi (00–20)
├── package.json
├── electron.vite.config.ts        build main / preload / renderer
├── electron-builder.yml           konfigurasi installer Windows (NSIS)
├── tsconfig.json                  referensi ke node & web
├── tsconfig.node.json             main + preload + shared
├── tsconfig.web.json              renderer + shared
├── build/
│   └── icon.ico                   ikon aplikasi & installer
├── .github/
│   └── workflows/
│       ├── ci.yml                 typecheck + test + build
│       └── release.yml            build installer saat tag v*
│
├── src/
│   ├── shared/                    dipakai main & renderer
│   │   ├── types.ts               semua tipe data
│   │   ├── layouts.ts             definisi layout/ukuran cetak
│   │   └── defaults.ts            settings, sesi, & template bawaan
│   │
│   ├── main/                      Electron main process
│   │   ├── index.ts               bootstrap app & window
│   │   ├── ipc.ts                 registrasi semua handler IPC
│   │   ├── store.ts               data.json (atomik, debounce, migrasi)
│   │   ├── protocol.ts            norea://asset & norea://file
│   │   ├── files.ts               simpan foto, folder event
│   │   ├── pin.ts                 hash & verifikasi PIN
│   │   ├── log.ts                 logger ke file
│   │   ├── printer/
│   │   │   ├── windows.ts         polling Get-Printer (PowerShell)
│   │   │   ├── scheduler.ts       pemilihan printer (logika murni)
│   │   │   └── manager.ts         antrian job + print senyap
│   │   └── drive/
│   │       ├── oauth.ts           login loopback + PKCE, token
│   │       ├── api.ts             cek folder, upload, permission
│   │       └── queue.ts           antrian upload & retry
│   │
│   ├── preload/
│   │   ├── index.ts               contextBridge → window.api
│   │   └── index.d.ts             tipe window.api untuk renderer
│   │
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx            routing sederhana + kunci PIN
│           ├── styles.css         Tailwind + font
│           ├── store/             Zustand (app state, sesi)
│           ├── lib/
│           │   ├── camera.ts      daftar & buka kamera lokal
│           │   ├── phoneCamera.ts sumber kamera HP (PeerJS)
│           │   ├── compose.ts     komposisi final & print (kanvas)
│           │   ├── filters.ts     filter warna
│           │   ├── fonts.ts       daftar & pemuatan font
│           │   └── qr.ts          pembuat QR
│           ├── components/        komponen UI (Button, Panel, Keypad, ...)
│           └── pages/
│               ├── Lock.tsx
│               ├── Studio.tsx
│               ├── GuestMode.tsx
│               ├── Events.tsx
│               ├── FrameGenerator.tsx
│               ├── Preview.tsx
│               ├── Printers.tsx
│               ├── Settings.tsx
│               └── AiBooth.tsx    placeholder "Segera hadir"
│
├── web/                           web pendamping (Vercel, statis)
│   ├── vercel.json
│   ├── index.html                 landing sederhana
│   ├── camera/index.html          kamera HP
│   ├── d/index.html               halaman download tamu
│   └── assets/                    css, js, logo
│
└── tests/                         unit test logika murni (vitest)
```

## Aturan Penempatan

| Kode tentang... | Taruh di |
|---|---|
| Tipe yang dipakai 2 proses | `src/shared/types.ts` |
| Akses OS / jaringan / file | `src/main/**` |
| Logika murni yang bisa dites tanpa Electron | file terpisah (`scheduler.ts`, `layouts.ts`, parser) + test di `tests/` |
| Menggambar gambar | `src/renderer/src/lib/compose.ts` saja |
| Halaman yang dibuka dari HP | `web/` |

Output build (`out/`, `dist/`) dan `node_modules/` tidak di-commit.
