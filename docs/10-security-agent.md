# 10 · Security Agent

## Peran

Melindungi **akun Google operator**, **foto tamu**, dan **laptop booth**. Mereview setiap perubahan yang menyentuh IPC, jaringan, kredensial, file, atau data tamu.

## Model Ancaman (ringkas)

| Aset | Ancaman | Mitigasi |
|---|---|---|
| Akun Google (akses Drive penuh) | Token bocor dari laptop/log/repo | Refresh token dienkripsi `safeStorage` (DPAPI), tidak pernah ke renderer/log, tidak ada secret di repo |
| Foto tamu | Link Drive tersebar / ditebak | File ID Drive acak & panjang, permission "anyone with link" hanya per file (bukan folder), opsi mematikan share publik per event |
| Laptop booth | Tamu keluar dari Mode Tamu & mengutak-atik | PIN (scrypt + salt), rate-limit 5x salah → jeda 30 detik, shortcut sistem ditangani di Mode Tamu |
| Aplikasi | Renderer disusupi konten jahat → akses OS | `contextIsolation`, `sandbox`, `nodeIntegration: false`, CSP ketat, API preload minimal & tervalidasi |
| File lokal | Path traversal lewat `norea://file/...` | Hanya melayani file di dalam `saveDir` & `userData/assets`, normalisasi path |
| Kamera HP | Orang lain menyambung ke booth | Peer ID acak per sesi app, satu HP aktif, koneksi baru butuh konfirmasi operator |

## Aturan Wajib

1. **Electron hardening:**
   - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`
   - blokir `window.open` / navigasi ke URL luar (`setWindowOpenHandler` → buka di browser sistem kalau URL https yang diizinkan)
   - CSP: `default-src 'self' norea:; img-src 'self' norea: data: blob:; media-src 'self' blob: mediastream:; connect-src 'self' https://*.peerjs.com wss://*.peerjs.com`
2. **OAuth:** PKCE + loopback `127.0.0.1` + parameter `state`. Client secret untuk aplikasi Desktop tidak dianggap rahasia oleh Google, tapi tetap diisi user di Pengaturan, tidak di-commit.
3. **PowerShell:** hanya command tetap tanpa interpolasi input user.
4. **Log:** tidak boleh berisi token, kode OAuth, atau PIN.
5. **Dependency:** `npm audit` tiap rilis. Library baru lewat Architect.
6. **Web pendamping:** statis, tanpa menyimpan data, tanpa analytics pihak ketiga.

## Privasi Tamu

- Softcopy disimpan di **Drive milik operator/klien**, bukan server Norea.
- Halaman download tidak menampilkan foto lain (tidak ada galeri publik).
- Operator bisa menghapus foto lokal per event setelah event selesai.

## Checklist Review

- [ ] Tidak ada secret/token di diff, log, atau pesan error
- [ ] Input IPC divalidasi
- [ ] Tidak ada akses Node/OS baru di renderer
- [ ] URL eksternal baru sudah masuk CSP & alasannya dicatat
- [ ] Data tamu tidak dikirim ke pihak selain Google Drive milik operator
