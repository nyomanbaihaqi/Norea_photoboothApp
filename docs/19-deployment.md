# 19 · Deployment

Ada tiga hal yang di-deploy/disiapkan:

1. **Repo GitHub** (akun Norea): kode & rilis installer
2. **Web pendamping** di **Vercel** (akun Norea): kamera HP & halaman download
3. **Google Cloud OAuth client**: supaya aplikasi bisa upload ke Drive

> Semua akun dibuat dan di-login sendiri oleh pemilik akun Norea. Langkah di bawah bisa diikuti tanpa menyerahkan password ke siapa pun.

## 1. GitHub

1. Buat akun/organisasi GitHub Norea (misal `norea`).
2. Repo: **`nyomanbaihaqi/Norea_photoboothApp`** (private).
3. Di laptop developer:
   ```bash
   git init
   git add .
   git commit -m "chore: inisialisasi proyek"
   git branch -M main
   git remote add origin https://github.com/nyomanbaihaqi/Norea_photoboothApp.git
   git push -u origin main
   ```
4. **Sumber auto-update:** `electron-builder.yml` → `publish` (sekarang `nyomanbaihaqi/Norea_photoboothApp`). Karena repo kode private, ganti `repo` ke repo rilis public (lihat bagian Auto-update).
5. **Rilis versi baru:** workflow `.github/workflows/release.yml` jalan otomatis saat tag didorong:
   ```bash
   npm version patch
   git push --follow-tags
   ```
   Hasilnya `Norea-Photobooth-Setup-x.y.z.exe` + `latest.yml` di tab **Releases**.

### Auto-update

- Aplikasi terinstal mengecek GitHub Releases **30 detik setelah dibuka, lalu tiap 4 jam**.
- Update baru di-download di background. Aplikasi **tidak pernah restart sendiri**:
  - update dipasang otomatis saat aplikasi ditutup, atau
  - operator klik **Pengaturan → Update aplikasi → Restart & pasang** (tidak bisa saat Mode Tamu).
- Bisa dimatikan lewat toggle **Update otomatis** (misal saat event dengan kuota internet terbatas). Tombol **Cek update sekarang** tetap bisa dipakai.
- Sidebar menampilkan "⬆️ Update vX siap dipasang" kalau ada update yang sudah didownload.
- ⚠️ **Repo harus public** supaya aplikasi bisa download update tanpa token. Kalau kode mau tetap private, buat repo public terpisah khusus rilis (misal `norea-photobooth-releases`), set `repo:` di `electron-builder.yml` ke repo itu, lalu upload rilis ke sana. Untuk opsi ini, workflow butuh Personal Access Token (izin `contents: write` ke repo rilis) yang disimpan di GitHub Secrets sebagai `GH_TOKEN`, lalu `release.yml` diganti memakai `secrets.GH_TOKEN`. `GITHUB_TOKEN` bawaan hanya bisa menulis ke repo kode itu sendiri.
- Auto-update hanya aktif di versi terinstal. Di `npm run dev` statusnya "hanya aktif di versi terinstal".

### Catatan installer
- Installer belum ber-code-signing, jadi Windows SmartScreen akan menampilkan "Windows protected your PC" → klik **More info → Run anyway**.
- Data user (`%APPDATA%/Norea Photobooth App`) tidak terhapus saat update.

## 2. Vercel (web pendamping)

1. Login Vercel dengan akun Norea → **Add New Project** → import repo `norea-photobooth`.
2. **Root Directory:** `web`
3. **Framework Preset:** Other (statis, tanpa build command).
4. Deploy. Catat URL-nya, misal `https://norea-photobooth.vercel.app`.
5. (Opsional) tambahkan domain sendiri, misal `foto.norea.id`.
6. Di aplikasi: **Pengaturan → URL Web Pendamping** → isi URL tadi.

Setiap push ke `main` otomatis deploy ulang. PR mendapat preview URL.

## 3. Google Cloud (akses Drive)

1. Buka <https://console.cloud.google.com> dengan akun Google Norea → buat project `norea-photobooth`.
2. **APIs & Services → Library** → aktifkan **Google Drive API**.
3. **OAuth consent screen:**
   - User type: **External**
   - Isi nama aplikasi "Norea Photobooth", email support
   - Scope: `.../auth/drive`
   - **Publishing status: In production**
     > ⚠️ Kalau dibiarkan "Testing", login kedaluwarsa tiap **7 hari**. Dengan status production tanpa verifikasi, saat login muncul peringatan "Google hasn't verified this app" → klik **Advanced → Go to Norea Photobooth (unsafe)**. Ini normal untuk aplikasi internal.
4. **Credentials → Create Credentials → OAuth client ID → Application type: Desktop app**.
5. Salin **Client ID** & **Client Secret** → di aplikasi: **Pengaturan → Google Drive** → tempel → **Hubungkan Google**.
6. Pastikan akun yang login punya akses **Editor** ke folder Drive tiap event.

## 4. Install di Laptop Booth

1. Download installer dari GitHub Releases → install.
2. Install driver semua printer yang akan dipakai → set ukuran kertas default (misal 4x6 / 4R).
3. Buka aplikasi → ganti PIN → isi Pengaturan (Google, URL web pendamping, folder simpan).
4. Menu **Printer** → centang printer aktif → **Test Print**.
5. Buat event → uji 1 sesi penuh sebelum tamu datang.
