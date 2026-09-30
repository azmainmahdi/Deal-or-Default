// Card faces modelled on the printed set: event cards are landscape with an art side and a
// navy text side (deco corners, lightning diamond, italic quote, gold effect text); country
// cards are portrait paintings in a copper frame with a flag badge.
import { CARDS, FLAVOUR } from '../rules/cards'
import { COUNTRIES } from '../rules/countries'
import type { CardId, CountryId } from '../rules/types'
import { Flag } from './Flag'

const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)

const CORNERS = `<svg class="deco" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">${
  [[0, 0, 1, 1], [320, 0, -1, 1], [0, 200, 1, -1], [320, 200, -1, -1]].map(([x, y, sx, sy]) =>
    `<g transform="translate(${x},${y}) scale(${sx},${sy})"><path d="M10 10h70M10 16h50M10 10v44M16 16v26M22 22h18v18h-18z M22 31h9"/></g>`).join('')
}<path d="M130 10h60M140 16l20 10 20-10M130 190h60M140 184l20-10 20 10"/></svg>`

const bolt = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 5 14h6l-1 8 8-12h-6z"/></svg>`

/** Numbers and chip words stand out, as on the printed cards. */
const highlight = (text: string) => esc(text).replace(/([+\-−]?\d+(?:\s(?:Capital|Debt|profit|Waiver|turns?))?)/g, '<em>$1</em>')

export function eventTextHtml(id: CardId): string {
  const c = CARDS[id]
  return `<div class="ev-text ${c.kind}">${CORNERS}
    <span class="ev-diamond">${bolt}</span>
    <small class="ev-name">${esc(c.name)}</small>
    <q>${esc(FLAVOUR[id][0])}</q>
    <p>${highlight(c.text)}</p>
  </div>`
}

/** Cards whose painting is in public/art/events/<id>.jpg (title baked into the art). */
const EVENT_ART = new Set<CardId>(['corruptionProbe', 'cyberAttack'])

export function eventArtHtml(id: CardId): string {
  const c = CARDS[id]
  if (EVENT_ART.has(id)) return `<div class="ev-art has-art"><img src="./art/events/${id}.jpg" alt="${esc(c.name)}"></div>`
  return `<div class="ev-art ${c.kind}" data-card="${id}">
    <b>${esc(c.name)}</b>
    <img src="./logo.png" alt="" class="ev-logo">
  </div>`
}

export function EventText({ id }: { id: CardId }) {
  return <div className="card-face" dangerouslySetInnerHTML={{ __html: eventTextHtml(id) }} />
}

/** Deck (face down) and discard pile (text side up). */
export function CardTable({ deck, discardTop }: { deck: number; discardTop: CardId | undefined }) {
  return (
    <div className="cardtable">
      <div className="pile deck" data-deck>
        {Array.from({ length: Math.max(1, Math.min(5, Math.ceil(deck / 5))) }, (_, i) => (
          <img key={i} src="./card-back.png" alt="" style={{ transform: `translate(${i * 1.5}px, ${-i * 2.5}px)` }} />
        ))}
        <span className="pile-label">Event deck · {deck}</span>
      </div>
      <div className="pile discard" data-discard>
        {discardTop ? <EventText id={discardTop} /> : <span className="pile-label ghost">Discard</span>}
        {discardTop && <span className="pile-label">Discard</span>}
      </div>
    </div>
  )
}

/** The drawn card, big over the board until it is applied. */
export function Reveal({ id }: { id: CardId | null }) {
  return (
    <div className="reveal-spot" data-reveal-spot>
      {id && <div className="reveal" key={id}><EventText id={id} /></div>}
    </div>
  )
}

export function CountryCard({ c, name, small }: { c: CountryId; name?: string; small?: boolean }) {
  return (
    <div className={`country-card ${small ? 'small' : ''}`}>
      <div className="cc-art" style={{ backgroundImage: `url(./art/countries/${c}.jpg)` }} />
      <div className="cc-frame" aria-hidden="true" />
      <b className="cc-name">{COUNTRIES[c].name === 'USA' ? 'United States' : COUNTRIES[c].name === 'UK' ? 'United Kingdom' : COUNTRIES[c].name}</b>
      <div className="cc-badge"><Flag c={c} /></div>
      {name && <span className="cc-player">{name}</span>}
    </div>
  )
}
