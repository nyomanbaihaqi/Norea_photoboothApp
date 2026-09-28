# 13 · Agent Communication

Semua komunikasi antar agent memakai format tertulis yang sama supaya tidak ada konteks yang hilang saat handoff.

## Kartu Task

```markdown
### TASK-<nomor> · <judul singkat>
- Status     : todo | in-progress | review | done | blocked
- Pelaksana  : planner | architect | backend | frontend | qa | debug | security | devops | reporter
- Fase       : <nomor fase roadmap>
- Ukuran     : S | M | L
- Tergantung : TASK-xx, TASK-yy
- Hardware   : ya (kamera / printer / HP) | tidak

**Tujuan:** satu kalimat.

**Kriteria penerimaan:**
- [ ] ...
- [ ] ...

**Catatan / konteks:** link dokumen, keputusan terkait.
```

## Handoff (serah terima)

Setiap kali pekerjaan berpindah agent, pengirim menulis:

```markdown
#### HANDOFF · TASK-<nomor> · <dari> → <ke>
- Yang dikerjakan : ...
- File berubah    : src/main/printer/manager.ts, ...
- Cara mencoba    : langkah singkat
- Belum/risiko    : ...
- Pertanyaan      : ...
```

## Aturan

1. **Satu sumber kebenaran.** Keputusan final ditulis di [14-project-memory.md](14-project-memory.md), bukan hanya di handoff.
2. Kalau ada kontrak (tipe/IPC) yang berubah, Architect wajib memberi tahu Backend **dan** Frontend.
3. Pertanyaan ke pemilik proyek dikumpulkan Orchestrator dan dikirim sekaligus (jangan satu-satu), masing-masing dengan rekomendasi.
4. Status `blocked` wajib menyebut apa yang ditunggu dan dari siapa.
5. Bahasa: Bahasa Indonesia, santai tapi jelas.

## Eskalasi

```
Agent pelaksana ──(buntu > 1 percobaan)──► Debug
Debug ──(butuh ubah desain)──────────────► Architect
Architect ──(butuh keputusan produk)─────► Orchestrator ──► Pemilik proyek
```
