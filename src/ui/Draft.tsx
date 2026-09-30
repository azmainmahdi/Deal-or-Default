// The country-card draft: all six shown face up, flipped, shuffled on the table, then each
// player picks a face-down card in turn and it flips to reveal their country.
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { COUNTRIES, COUNTRY_IDS } from '../rules/countries'
import type { CountryId } from '../rules/types'
import { PAWN_COLORS } from './Board'
import { CountryCard } from './Cards'
import { sfx } from './sound'

gsap.registerPlugin(Flip)

type Phase = 'show' | 'shuffle' | 'pick' | 'done'
const shuffled = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map(([, x]) => x)

export function Draft({ names, auto, onDone }: { names: string[]; auto: boolean; onDone: (countries: CountryId[]) => void }) {
  const [phase, setPhase] = useState<Phase>('show')
  const [order, setOrder] = useState<CountryId[]>(COUNTRY_IDS)
  const [owner, setOwner] = useState<Partial<Record<CountryId, number>>>({})
  const row = useRef<HTMLDivElement>(null)
  const picks = Object.keys(owner).length
  const turn = picks < names.length ? picks : -1

  async function shuffle() {
    if (phase !== 'show') return
    setPhase('shuffle')
    sfx.flip()
    await gsap.timeline().to({}, { duration: 0.6 }) // cards flip face down (CSS)
    for (let i = 0; i < 3; i++) {
      const cards = row.current!.querySelectorAll('.draft-card')
      const state = Flip.getState(cards)
      flushSync(() => setOrder((o) => shuffled(o))) // reorder and animate in the same frame: no flash of the new order
      sfx.dice()
      await Flip.from(state, { duration: 0.45, ease: 'power2.inOut', stagger: 0.02, absolute: true })
    }
    setPhase('pick')
  }

  function pick(c: CountryId) {
    if (phase !== 'pick' || turn < 0 || owner[c] !== undefined) return
    sfx.flip()
    setOwner((o) => ({ ...o, [c]: turn }))
  }

  // Auto-advance: show for a beat, then shuffle; bots pick in the demo.
  useEffect(() => {
    if (phase === 'show') { const t = setTimeout(shuffle, auto ? 1200 : 1800); return () => clearTimeout(t) }
    if (phase === 'pick' && auto && turn >= 0) {
      const t = setTimeout(() => pick(shuffled(order.filter((c) => owner[c] === undefined))[0]!), 700)
      return () => clearTimeout(t)
    }
    if (phase === 'pick' && turn < 0) { const t = setTimeout(() => setPhase('done'), 700); return () => clearTimeout(t) }
    if (phase === 'done' && auto) { const t = setTimeout(finish, 1600); return () => clearTimeout(t) }
  }) // eslint-disable-line react-hooks/exhaustive-deps

  function finish() {
    const bySeat = names.map((_, p) => (Object.keys(owner) as CountryId[]).find((c) => owner[c] === p)!)
    onDone(bySeat)
  }

  const title = phase === 'show' ? 'Six nations. One board.'
    : phase === 'shuffle' ? 'Shuffling…'
    : phase === 'pick' && turn >= 0 ? `${names[turn]}, pick a card`
    : 'Your countries'

  return (
    <div className="overlay draft">
      <p className="eyebrow">{title}</p>
      <div className="draft-row" ref={row}>
        {order.map((c) => {
          const who = owner[c]
          const faceUp = phase === 'show' || who !== undefined || (phase === 'done')
          return (
            <button key={c} data-flip-id={c} className={`draft-card ${faceUp ? '' : 'down'} ${who !== undefined ? 'taken' : ''} ${phase === 'done' && who === undefined ? 'unpicked' : ''}`}
              onClick={() => pick(c)} disabled={phase !== 'pick' || who !== undefined} aria-label={faceUp ? COUNTRIES[c].name : 'Face-down country card'}
              style={who !== undefined ? ({ '--pc': PAWN_COLORS[who] } as React.CSSProperties) : undefined}>
              <span className="dc-inner">
                <span className="dc-front"><CountryCard c={c} /></span>
                <span className="dc-back"><img src="./logo.png" alt="" /></span>
              </span>
              {who !== undefined && <span className="dc-owner"><b>{names[who]}</b><small>{COUNTRIES[c].perk}</small></span>}
            </button>
          )
        })}
      </div>
      {phase === 'show' && <button className="primary" onClick={shuffle}>Shuffle</button>}
      {phase === 'done' && <button className="primary" onClick={finish}>{auto ? 'Starting…' : 'Start the game'}</button>}
    </div>
  )
}
