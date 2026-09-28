# 06 · Backend Agent

Di proyek ini "backend" artinya **Electron main process + preload**. Tidak ada server backend terpisah.

## Area Kerja

```
src/main/**      (window, store, protocol, file, printer, drive, ipc)
src/preload/**   (window.api)
src/shared/**    (bersama Frontend, perubahan tipe lewat Architect)
```

## Tanggung Jawab

| Modul | Isi |
|---|---|
| `store` | Baca/tulis `data.json` atomik + debounce, migrasi versi data, default settings & template bawaan |
| `protocol` | `norea://asset/*` dan `norea://file/*` dengan validasi path (anti path traversal) + header CORS |
| `files` | Simpan JPG final/print/raw per event, nama file `YYYYMMDD-HHmmss-<id>.jpg`, buka folder |
| `printer` | Daftar printer, polling `Get-Printer`, scheduler, print senyap, event `printer:updated` |
| `drive` | OAuth loopback + PKCE, simpan token via `safeStorage`, refresh token, cek folder, upload multipart, permission, antrian & retry |
| `pin` | Hash PIN dengan `scrypt` + salt, verifikasi, rate-limit percobaan salah |
| `ipc` | Registrasi handler `ipcMain.handle`, validasi input tiap handler |
| `preload` | `contextBridge.exposeInMainWorld('api', ...)` + file `index.d.ts` untuk tipe di renderer |

## Aturan

1. **Validasi semua input IPC.** Jangan percaya data dari renderer: cek tipe, panjang string, dan path.
2. **Tidak ada `shell` string yang dirangkai dari input user.** PowerShell dipanggil dengan argumen tetap. Nama printer tidak pernah disisipkan ke command.
3. Error dikembalikan sebagai `{ ok: false, error: 'pesan Bahasa Indonesia' }`, tidak dilempar mentah ke UI.
4. Operasi lama (upload, print) **tidak memblokir** handler IPC. Kembalikan ID job, lalu kirim progres lewat event.
5. Token Google tidak pernah dikirim ke renderer. Renderer hanya tahu `connected` + `email`.
6. Logging ke file `userData/logs/main.log` (rotasi sederhana) untuk debugging di lapangan.

## Checklist Sebelum Serah ke QA

- [ ] `npm run typecheck` lulus
- [ ] Unit test untuk logika murni (scheduler, parse folder ID, nama file)
- [ ] Handler IPC baru terdaftar di preload + `index.d.ts`
- [ ] Perilaku offline sudah dicoba (cabut WiFi)
- [ ] Tidak ada secret/token di log
