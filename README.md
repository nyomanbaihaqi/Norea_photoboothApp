# Norea Photobooth App

Aplikasi photobooth desktop untuk Windows. Bisa pakai kamera laptop, kamera USB/capture card/DSLR (mode webcam), atau **HP sebagai kamera nirkabel**. Hasil foto langsung diberi frame, **dicetak ke beberapa printer secara bergantian**, di-upload ke **Google Drive**, dan tamu bisa download softcopy lewat **QR code**.

> Status: **v0.1.0**, fitur inti jalan (PIN, Studio, Mode Tamu, Event, Frame Generator, Preview, Printer, Drive, kamera HP). Menunggu uji printer nyata, akun Google, dan deploy Vercel. Lihat [docs/20-roadmap.md](docs/20-roadmap.md).

## Fitur Utama

| Menu | Fungsi |
|---|---|
| **Studio** | Layar ala OBS (preview + program jadi satu). Pilih kamera, mulai sesi, countdown, jepret, hasil. |
| **Mode Tamu** | Layar penuh khusus tamu. Keluar dari mode ini wajib pakai PIN. |
| **Event** | Multi-event: nama, tanggal, info tambahan, template frame, folder Drive, dan pengaturan sesi. |
| **Frame Generator** | Template siap pakai + upload desain PNG sendiri. Nama, tanggal, dan info otomatis ditempel. |
| **Preview** | Visual hasil jadi: foto + frame + bingkai (mockup cetak). |
| **Printer** | Pilih printer yang udah di-install drivernya, lalu print dibagi otomatis ke printer yang paling kosong. |
| **Pengaturan** | PIN, kamera, akun Google, URL web pendamping, dan folder penyimpanan. |
| **AI Photobooth** | *Segera hadir* (ditunda). |

## Komponen

```
Norea Photobooth App (Electron, di-install di laptop Windows)
        │
        ├── Google Drive API ── upload hasil foto
        │
        └── Web Pendamping (Vercel, statis)
              ├── /camera  → halaman kamera HP (WebRTC via PeerJS)
              └── /d       → halaman download softcopy untuk tamu (dari QR)
```

## Tech Stack

Electron 44 · electron-vite 5 · Vite 7 · React 19 · TypeScript · Tailwind CSS 4 · Zustand · PeerJS · qrcode · electron-builder (NSIS)

## Menjalankan (Development)

```bash
npm install
npm run dev
```

Cek kualitas:

```bash
npm run typecheck
npm test
```

Build installer Windows (hasil di `dist/Norea-Photobooth-Setup-<versi>.exe`):

```bash
npm run dist
```

PIN awal: **1234** (wajib diganti saat pertama masuk). Keluar dari Mode Tamu: tekan **Esc** atau tap pojok kiri atas 5x, lalu masukkan PIN.

## Dokumentasi

| No | Dokumen | Isi |
|---|---|---|
| 00 | [Project Rules](docs/00-project-rules.md) | Aturan emas proyek |
| 01 | [System Overview](docs/01-system-overview.md) | Gambaran sistem, fitur, istilah, dan keputusan |
| 02 | [Architecture](docs/02-architecture.md) | Arsitektur teknis dan alur data |
| 03 | [Orchestrator](docs/03-orchestrator.md) | Koordinator kerja antar agent |
| 04 | [Planner Agent](docs/04-planner-agent.md) | Memecah kebutuhan jadi task |
| 05 | [Architect Agent](docs/05-architect-agent.md) | Desain teknis dan kontrak |
| 06 | [Backend Agent](docs/06-backend-agent.md) | Main process: printer, Drive, file, IPC |
| 07 | [Frontend Agent](docs/07-frontend-agent.md) | UI renderer dan web pendamping |
| 08 | [QA Agent](docs/08-qa-agent.md) | Pengujian dan verifikasi |
| 09 | [Debug Agent](docs/09-debug-agent.md) | Investigasi bug |
| 10 | [Security Agent](docs/10-security-agent.md) | Keamanan dan privasi |
| 11 | [DevOps Agent](docs/11-devops-agent.md) | Build, rilis, dan deploy |
| 12 | [Reporter Agent](docs/12-reporter-agent.md) | Laporan progres |
| 13 | [Agent Communication](docs/13-agent-communication.md) | Format handoff antar agent |
| 14 | [Project Memory](docs/14-project-memory.md) | Log keputusan dan status terkini |
| 15 | [Workflow](docs/15-workflow.md) | Alur kerja dari request sampai rilis |
| 16 | [Repository Structure](docs/16-repository-structure.md) | Struktur folder |
| 17 | [Coding Standard](docs/17-coding-standard.md) | Standar penulisan kode |
| 18 | [Testing Standard](docs/18-testing-standard.md) | Standar pengujian |
| 19 | [Deployment](docs/19-deployment.md) | GitHub, installer, Vercel, dan Google Cloud |
| 20 | [Roadmap](docs/20-roadmap.md) | Fase pengerjaan |
