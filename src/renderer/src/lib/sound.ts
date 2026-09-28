// Suara sederhana via WebAudio (tanpa file audio).
let ctx: AudioContext | null = null

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.2): void {
  try {
    const a = audio()
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(gain, a.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + duration)
    osc.connect(g).connect(a.destination)
    osc.start()
    osc.stop(a.currentTime + duration)
  } catch {
    // audio tidak tersedia
  }
}

export const sounds = {
  tick: () => tone(880, 0.12),
  shutter: () => {
    tone(1600, 0.05, 'square', 0.15)
    setTimeout(() => tone(600, 0.08, 'square', 0.1), 50)
  },
  done: () => {
    tone(660, 0.12)
    setTimeout(() => tone(990, 0.2), 120)
  }
}
