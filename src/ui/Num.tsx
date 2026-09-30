import { gsap } from 'gsap'
import { useEffect, useRef, useState } from 'react'

/** A number that rolls to its new value instead of jumping. */
export function Num({ value }: { value: number }) {
  const [shown, setShown] = useState(value)
  const cur = useRef(value)
  useEffect(() => {
    const o = { v: cur.current }
    const tw = gsap.to(o, {
      v: value, duration: 0.7, ease: 'power2.out',
      onUpdate: () => { cur.current = o.v; setShown(o.v) },
      onComplete: () => { cur.current = value; setShown(value) },
    })
    return () => { tw.kill() }
  }, [value])
  const v = Math.round(shown * 2) / 2
  return <span className={`num ${value > shown + 0.01 ? 'up' : value < shown - 0.01 ? 'down' : ''}`}>{Number.isInteger(v) ? v : v.toFixed(1)}</span>
}
