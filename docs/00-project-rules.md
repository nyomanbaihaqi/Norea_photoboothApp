# 00 · Project Rules

Aturan ini berlaku untuk semua orang dan semua agent yang mengerjakan Norea Photobooth App. Kalau ada dokumen lain yang bertentangan, **dokumen ini yang menang**.

## Aturan Emas

1. **Sesi foto tamu tidak boleh gagal karena internet.** Foto, frame, dan print harus jalan offline. Upload Drive dan QR menyusul ketika online.
2. **Windows dulu.** Target saat ini cuma Windows 10/11 x64. Jangan menambah kompleksitas untuk Mac/Linux sebelum masuk roadmap.
3. **Hardware bervariasi.** Kamera dan printer tidak boleh di-hardcode ke merk tertentu. Printer apa pun yang drivernya ter-install di Windows harus bisa dipilih.
4. **Satu layar.** Tampilan operator itu gabungan Preview + Program (ala OBS) di satu layar. Tamu memakai Mode Tamu layar penuh.
5. **Bahasa Indonesia untuk semua teks UI.** Kode (nama variabel, fungsi, file) pakai bahasa Inggris. Komentar kode singkat dan boleh berbahasa Indonesia.
6. **Tidak ada secret di repo.** Client secret Google, token, dan PIN tidak boleh di-commit. Token disimpan terenkripsi di laptop (lihat [10-security-agent.md](10-security-agent.md)).
7. **Keputusan dicatat.** Setiap keputusan teknis/produk baru wajib ditulis di [14-project-memory.md](14-project-memory.md).
8. **Kecil dan bisa diuji.** Satu task, satu perubahan yang jelas. Setiap task selesai harus lolos `npm run typecheck` dan checklist QA terkait.
9. **Jangan melebar dari scope.** AI Photobooth **ditunda**. Cuma placeholder menu "Segera hadir" sampai ada keputusan baru.

## Akun & Kepemilikan

- Repo GitHub dan project Vercel memakai **akun khusus Norea**, bukan akun pribadi.
- Pembuatan akun, login, dan pengisian kredensial dilakukan sendiri oleh pemilik akun. Agent hanya menyiapkan kode dan langkah-langkahnya.

## Git

- Branch utama: `main` (selalu bisa di-build).
- Branch kerja: `feat/<nama>`, `fix/<nama>`, `docs/<nama>`, `chore/<nama>`.
- Pesan commit: `<tipe>: <ringkasan>` dengan tipe `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, atau `build`.
- Rilis ditandai tag `vX.Y.Z` (semver).

## Definition of Done

Sebuah task dianggap selesai kalau:

- [ ] Kode lolos `npm run typecheck`
- [ ] Unit test terkait lulus (kalau ada logika murni)
- [ ] Checklist manual QA untuk fitur itu sudah dijalankan ([18-testing-standard.md](18-testing-standard.md))
- [ ] Teks UI berbahasa Indonesia
- [ ] Dokumen terkait diperbarui (arsitektur, memory, atau roadmap)
