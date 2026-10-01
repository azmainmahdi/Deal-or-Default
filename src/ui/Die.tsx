import { gsap } from 'gsap'
import { forwardRef, useImperativeHandle, useRef } from 'react'

export interface DieHandle { roll(face: number): gsap.core.Timeline }

const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
// Cube rotation that brings each face to the front.
const ORIENT: Record<number, { x: number; y: number }> = { 1: { x: 0, y: 0 }, 2: { x: 0, y: -90 }, 3: { x: -90, y: 0 }, 4: { x: 90, y: 0 }, 5: { x: 0, y: 90 }, 6: { x: 0, y: 180 } }

export const Die = forwardRef<DieHandle, { note?: string; onRoll?: () => void }>(function Die({ note, onRoll }, ref) {
  const cube = useRef<HTMLSpanElement>(null)
  const hop = useRef<HTMLSpanElement>(null)
  const rot = useRef({ x: -20, y: 25 })

  useImperativeHandle(ref, () => ({
    roll(face) {
      const o = ORIENT[face]!
      const turn = (cur: number, target: number) => cur - (cur % 360) + 720 + target
      rot.current = { x: turn(rot.current.x, o.x), y: turn(rot.current.y, o.y) }
      const tl = gsap.timeline()
      tl.fromTo(hop.current, { y: -70, scale: 1.15 }, { y: 0, scale: 1, duration: 0.8, ease: 'bounce.out' }, 0)
      tl.to(cube.current, { rotationX: rot.current.x, rotationY: rot.current.y, duration: 0.85, ease: 'power3.out' }, 0)
      return tl
    },
  }))

  return (
    <button type="button" className={`tray ${onRoll ? 'ready' : ''}`} onClick={onRoll} disabled={!onRoll} aria-label={onRoll ? 'Roll the die' : 'Die'}>
      <span className="die-hop" ref={hop}>
        <span className="die3d" ref={cube} style={{ transform: 'rotateX(-20deg) rotateY(25deg)' }}>
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <span key={f} className={`face f${f}`}>
              {Array.from({ length: 9 }, (_, i) => <i key={i} className={PIPS[f]!.includes(i) ? 'on' : ''} />)}
            </span>
          ))}
        </span>
      </span>
      {note && <span className="die-note">{note}</span>}
      {onRoll && <span className="die-hint">Tap to roll</span>}
    </button>
  )
})
