const THEMES = ['⚽ Bola', '🏫 Sekolah', '💼 Pekerjaan', '🎮 Game', '🦸 Superhero', '🏝️ Liburan']

export function AiBooth() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-lg text-center">
        <div className="text-6xl">✨</div>
        <h1 className="mt-4 text-3xl font-bold">AI Photobooth</h1>
        <p className="mt-2 text-muted">
          Foto tamu langsung diubah jadi tema seru. Fitur ini <b className="text-brand">segera hadir</b>.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {THEMES.map((t) => (
            <span key={t} className="rounded-full border border-line px-4 py-2 text-sm text-gray-400">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
