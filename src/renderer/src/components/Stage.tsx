import { useEffect, useRef, useState } from 'react'
import type { EventData } from '@shared/types'
import type { BoothState } from '@/hooks/useBoothSession'
import { filterCss } from '@/lib/filters'
import { qrDataUrl } from '@/lib/qr'
import { useApp } from '@/store/app'

interface Props {
  stream: MediaStream | null
  event: EventData | undefined
  booth: BoothState
  guest?: boolean
  cameraError?: string
  onStart(): void
  onDecide(d: 'accept' | 'retake'): void
  onFinish(): void
  onPrint(): void
}

// Layar Program: live kamera + semua overlay sesi. Dipakai Studio & Mode Tamu.
export function Stage({ stream, event, booth, guest, cameraError, onStart, onDecide, onFinish, onPrint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const s = event?.session

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.srcObject = stream
    if (stream) void v.play().catch(() => undefined)
  }, [stream])

  const big = guest ? 'text-[28vh]' : 'text-[16vh]'

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        muted
        playsInline
        className="h-full w-full object-contain"
        style={{
          transform: s?.mirror ? 'scaleX(-1)' : undefined,
          filter: s ? filterCss(s.filter) : undefined
        }}
      />

      {!stream && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-muted">
          <div className="text-5xl">📷</div>
          <div className="text-lg">{cameraError || 'Menunggu kamera…'}</div>
        </div>
      )}

      {booth.flashKey > 0 && s?.flash && (
        <div key={booth.flashKey} className="anim-flash pointer-events-none absolute inset-0 bg-white" />
      )}

      {booth.phase === 'idle' && guest && (
        <button onClick={onStart} className="absolute inset-0 flex flex-col items-center justify-end pb-[10vh]">
          <div className="rounded-full bg-live px-16 py-8 text-5xl font-bold text-white shadow-2xl shadow-red-900/50 transition active:scale-95">
            📸 Tap untuk mulai
          </div>
          {event?.name && <div className="mt-6 text-2xl font-semibold text-white drop-shadow-lg">{event.name}</div>}
        </button>
      )}

      {(booth.phase === 'countdown' || booth.phase === 'wait') && (
        <>
          <Chip>
            Foto {Math.min(booth.shotIndex + 1, booth.totalShots)} / {booth.totalShots}
          </Chip>
          {booth.phase === 'countdown' && booth.count > 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span key={booth.count} className={`anim-pop font-bold text-white drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] ${big}`}>
                {booth.count}
              </span>
            </div>
          )}
          {booth.phase === 'wait' && (
            <Center>
              <div className="rounded-2xl bg-black/60 px-10 py-6 text-center text-3xl font-semibold text-white">
                Siap-siap pose berikutnya! 😄
              </div>
            </Center>
          )}
        </>
      )}

      {booth.phase === 'review' && (
        <Overlay>
          <img src={booth.shots[booth.shotIndex]} className="max-h-[65%] max-w-[80%] rounded-lg shadow-2xl" />
          <Timer endsAt={booth.decisionEndsAt} label="Lanjut otomatis" />
          <div className="flex gap-4">
            <Button onClick={() => onDecide('retake')} ghost>
              🔄 Ulangi
            </Button>
            <Button onClick={() => onDecide('accept')}>✓ Lanjut</Button>
          </div>
        </Overlay>
      )}

      {booth.phase === 'reviewAll' && (
        <Overlay>
          <div className="text-2xl font-semibold text-white">Suka hasilnya?</div>
          <div className="flex max-h-[55%] max-w-[90%] flex-wrap justify-center gap-3">
            {booth.shots.map((src, i) => (
              <img key={i} src={src} className="max-h-[26vh] rounded-lg shadow-xl" />
            ))}
          </div>
          <Timer endsAt={booth.decisionEndsAt} label="Lanjut otomatis" />
          <div className="flex gap-4">
            <Button onClick={() => onDecide('retake')} ghost>
              🔄 Ulangi Semua
            </Button>
            <Button onClick={() => onDecide('accept')}>✓ Lanjut</Button>
          </div>
        </Overlay>
      )}

      {booth.phase === 'processing' && (
        <Overlay>
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-brand" />
          <div className="text-2xl font-semibold text-white">Lagi diproses…</div>
        </Overlay>
      )}

      {booth.phase === 'result' && <Result booth={booth} event={event} guest={guest} onFinish={onFinish} onPrint={onPrint} />}

      {booth.phase === 'error' && (
        <Overlay>
          <div className="text-5xl">😵</div>
          <div className="text-2xl font-semibold text-white">Ups, ada kendala</div>
          {!guest && <div className="max-w-xl text-center text-sm text-red-300">{booth.error}</div>}
          <Button onClick={onFinish}>Kembali</Button>
        </Overlay>
      )}
    </div>
  )
}

function Result({
  booth,
  event,
  guest,
  onFinish,
  onPrint
}: {
  booth: BoothState
  event: EventData | undefined
  guest?: boolean
  onFinish(): void
  onPrint(): void
}) {
  const [qr, setQr] = useState('')
  const link = booth.session?.shareLink
  const drive = useApp((s) => s.drive)
  const job = useApp((s) => s.printers.jobs.find((j) => j.id === booth.printJob?.id))
  const showQr = event?.session.showQr

  useEffect(() => {
    if (link) void qrDataUrl(link, 600).then(setQr)
    else setQr('')
  }, [link])

  const printText = !booth.printJob
    ? event?.session.autoPrint
      ? ''
      : null
    : job?.status === 'error'
      ? '⚠️ Gagal cetak, hubungi crew'
      : job?.status === 'sent'
        ? `🖨️ Dicetak di ${job.printer}`
        : job?.printer
          ? `🖨️ Mengirim ke ${job.printer}…`
          : '🖨️ Menunggu printer…'

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-[4%] bg-black/85 p-[3%] backdrop-blur">
      <img src={booth.resultImage} className="max-h-full max-w-[55%] rounded shadow-2xl" />
      <div className={`flex flex-col items-center gap-5 text-center text-white ${guest ? 'w-[30%]' : 'w-[38%]'}`}>
        <div className="text-3xl font-bold">Keren! 🎉</div>
        {showQr && (
          <div className="flex flex-col items-center gap-3">
            {qr ? (
              <>
                <img src={qr} className="w-[min(22vw,32vh)] rounded-xl bg-white p-2" />
                <div className="text-lg">Scan buat ambil softcopy</div>
              </>
            ) : (
              <div className="rounded-xl bg-white/10 px-5 py-4 text-sm text-gray-300">
                {!drive?.connected
                  ? 'Softcopy tersimpan di booth'
                  : !drive.online
                    ? 'Softcopy dikirim setelah online'
                    : 'Menyiapkan QR…'}
              </div>
            )}
          </div>
        )}
        {printText && <div className="text-base text-gray-200">{printText}</div>}
        <div className="flex flex-wrap justify-center gap-3">
          {printText === null && <Button onClick={onPrint}>🖨️ Cetak</Button>}
          <Button onClick={onFinish} ghost>
            Selesai
          </Button>
        </div>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-5 py-2 text-lg font-semibold text-white">
      {children}
    </div>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="pointer-events-none absolute inset-0 flex items-center justify-center">{children}</div>
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 p-6 backdrop-blur">
      {children}
    </div>
  )
}

function Button({ children, onClick, ghost }: { children: React.ReactNode; onClick(): void; ghost?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-16 rounded-2xl px-10 py-4 text-2xl font-bold transition active:scale-95 ${
        ghost ? 'border-2 border-white/40 text-white hover:bg-white/10' : 'bg-brand text-black hover:bg-brand-2'
      }`}
    >
      {children}
    </button>
  )
}

function Timer({ endsAt, label }: { endsAt: number; label: string }) {
  const [left, setLeft] = useState(Math.max(0, endsAt - Date.now()))
  useEffect(() => {
    const t = setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 200)
    return () => clearInterval(t)
  }, [endsAt])
  return (
    <div className="text-sm text-gray-400">
      {label} dalam {Math.ceil(left / 1000)} detik
    </div>
  )
}
