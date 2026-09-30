// Every sound is synthesised with Web Audio: no files to download, nothing to license.
let ctx: AudioContext | null = null
let muted = false

export function setMuted(m: boolean) { muted = m }

function ac(): AudioContext | null {
  if (muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slideTo?: number } = {}) {
  const a = ac()
  if (!a) return
  const t = a.currentTime + (opts.at ?? 0)
  const o = a.createOscillator(), g = a.createGain()
  o.type = opts.type ?? 'sine'
  o.frequency.setValueAtTime(freq, t)
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(opts.vol ?? 0.15, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(a.destination)
  o.start(t)
  o.stop(t + dur + 0.02)
}

function noise(dur: number, { vol = 0.2, at = 0, freq = 2000 } = {}) {
  const a = ac()
  if (!a) return
  const t = a.currentTime + at
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain()
  src.buffer = buf
  f.type = 'bandpass'
  f.frequency.value = freq
  g.gain.value = vol
  src.connect(f).connect(g).connect(a.destination)
  src.start(t)
}

export const sfx = {
  dice() { for (let i = 0; i < 7; i++) noise(0.05, { at: i * 0.09 + Math.random() * 0.03, vol: 0.35 - i * 0.04, freq: 1800 + Math.random() * 1200 }) },
  hop() { tone(520 + Math.random() * 60, 0.06, { type: 'triangle', vol: 0.08 }) },
  climb() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'triangle', at: i * 0.18, vol: 0.12 })) },
  slide() { tone(700, 1.0, { type: 'sawtooth', vol: 0.05, slideTo: 110 }) },
  flip() { noise(0.12, { freq: 4000, vol: 0.25 }); noise(0.08, { at: 0.2, freq: 3000, vol: 0.2 }) },
  coin() { tone(1319, 0.12, { type: 'square', vol: 0.05 }); tone(1760, 0.3, { type: 'square', vol: 0.05, at: 0.08 }) },
  lose() { tone(330, 0.25, { type: 'triangle', vol: 0.12, slideTo: 220 }) },
  thud() { tone(90, 0.35, { vol: 0.35, slideTo: 45 }); noise(0.15, { freq: 300, vol: 0.3 }) },
  shield() { tone(880, 0.4, { type: 'sine', vol: 0.1, slideTo: 1320 }) },
  flare() { tone(988, 0.08, { type: 'triangle', vol: 0.06 }); tone(1480, 0.14, { type: 'triangle', vol: 0.05, at: 0.06 }) },
  turn() { tone(784, 0.12, { type: 'triangle', vol: 0.07 }); tone(1047, 0.2, { type: 'triangle', vol: 0.07, at: 0.1 }) },
  win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', at: i * 0.15, vol: 0.14 })) },
}
