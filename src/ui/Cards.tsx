import { CARDS } from '../rules/cards'
import type { CardId } from '../rules/types'

export function cardFaceHtml(id: CardId): string {
  const c = CARDS[id]
  return `<div class="cardface ${c.kind}"><small>${c.kind === 'beneficial' ? 'Beneficial' : 'Adverse'}</small><b>${c.name}</b><p>${c.text}</p></div>`
}

export function CardFace({ id }: { id: CardId }) {
  return <div className="cardslot-inner" dangerouslySetInnerHTML={{ __html: cardFaceHtml(id) }} />
}

/** Deck (face down), the card in play, and the discard pile. */
export function CardTable({ deck, current, discardTop }: { deck: number; current: CardId | null; discardTop: CardId | undefined }) {
  return (
    <div className="cardtable">
      <div className="pile deck" data-deck>
        {Array.from({ length: Math.min(4, Math.ceil(deck / 6)) }, (_, i) => (
          <img key={i} src="./card-back.png" alt="" style={{ transform: `translate(${i * 2}px, ${-i * 3}px) rotate(90deg)` }} />
        ))}
        <span className="pile-label">Events · {deck}</span>
      </div>
      <div className="pile slot" data-slot>
        {current ? <CardFace id={current} /> : <span className="pile-label ghost">Card in play</span>}
      </div>
      <div className="pile discard" data-discard>
        {discardTop ? <CardFace id={discardTop} /> : <span className="pile-label ghost">Discard</span>}
      </div>
    </div>
  )
}
