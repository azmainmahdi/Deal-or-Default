// Plays a batch of engine events as animation, one after another, calling apply(e) so the
// numbers on screen change at the moment the animation shows them changing.
import { gsap } from 'gsap'
import { SNAKES } from '../../rules/board'
import type { CardId, GameEvent } from '../../rules/types'
import type { BoardHandle } from '../Board'
import { cardFaceHtml } from '../Cards'
import type { DieHandle } from '../Die'
import { centerOf } from '../geometry'
import { sfx } from '../sound'

export interface Stage {
  board: BoardHandle
  die: DieHandle
  squares: number[] // displayed square per player, kept in step with the animation
  names: string[]
  colors: string[]
}

const wait = (s: number) => gsap.timeline().to({}, { duration: s })

export async function play(events: GameEvent[], stage: Stage, apply: (e: GameEvent) => void) {
  for (const e of events) {
    switch (e.type) {
      case 'turnStarted':
        apply(e)
        await banner(stage.names[e.player]!, stage.colors[e.player]!)
        break
      case 'diceRolled':
        sfx.dice()
        await stage.die.roll(e.raw)
        apply(e)
        if (e.crunched || e.bonus) await wait(0.5)
        break
      case 'moved':
        await move(stage, e)
        apply(e)
        break
      case 'cardDrawn':
        sfx.flip()
        await flyCard(e.card, '[data-deck]', '[data-slot]', true)
        apply(e)
        break
      case 'capital':
        apply(e)
        float(e.player, `${e.delta > 0 ? '+' : ''}${e.delta}`, e.delta > 0 ? 'gain' : 'loss')
        if (e.delta < 0) sfx.lose()
        await wait(0.25)
        break
      case 'debt':
        apply(e)
        float(e.player, `${e.delta > 0 ? '+' : ''}${e.delta} debt`, 'debt')
        await wait(0.25)
        break
      case 'tariffHit':
        apply(e)
        sfx.thud()
        await pulse(stage, stage.squares[e.from]!, 'tariff')
        await shake(stage, e.player)
        break
      case 'sanctionHit':
        apply(e)
        sfx.thud()
        await spotlight(stage, e.player)
        break
      case 'hedged':
        apply(e)
        sfx.shield()
        await pulse(stage, stage.squares[e.player]!, 'shield')
        break
      case 'projectMatured':
        apply(e)
        sfx.coin()
        await coins(stage, e.player)
        break
      case 'projectLost':
        apply(e)
        await pulse(stage, stage.squares[e.player]!, 'loss')
        break
      case 'waiverUsed':
        apply(e)
        float(e.player, 'Waiver used', 'debt')
        await wait(0.4)
        break
      case 'turnSkipped':
        apply(e)
        float(e.player, 'Embargo: skipped', 'loss')
        await wait(0.6)
        break
      case 'finished':
        apply(e)
        sfx.win()
        await pulse(stage, 100, 'gold', 2.2)
        await wait(0.4)
        break
      default:
        apply(e)
    }
  }
}

async function move(stage: Stage, e: Extract<GameEvent, { type: 'moved' }>) {
  const { board } = stage
  const pawn = board.pawn(e.player), body = board.body(e.player)
  const from = e.path[0]!, to = e.path[e.path.length - 1]!
  const tl = gsap.timeline()
  gsap.set(pawn, { zIndex: 5 })
  pawn.parentNode?.appendChild(pawn) // draw the mover on top

  if (e.via === 'ladder') {
    const c = centerOf(to)
    tl.call(sfx.climb).to(body, { scale: 1.25, duration: 0.15 })
      .to(pawn, { x: c.x, y: c.y, duration: 0.9, ease: 'power1.inOut' })
      .to(body, { scale: 1, duration: 0.2 })
    trail(stage, from, to, 'gold')
  } else if (e.via === 'snake') {
    const tail = SNAKES[from]!
    const path = board.snakePath(from)
    const len = path.getTotalLength()
    const frac = (from - to) / (from - tail) // hedged slides stop part way
    const o = { t: 0 }
    tl.call(sfx.slide).to(body, { rotation: -20, duration: 0.1 })
      .to(o, {
        t: frac >= 1 ? 1 : 0.5, duration: 1.1 * (frac >= 1 ? 1 : 0.6), ease: 'power2.in',
        onUpdate: () => { const p = path.getPointAtLength(o.t * len); gsap.set(pawn, { x: p.x, y: p.y }) },
      })
    if (frac < 1) { const c = centerOf(to); tl.to(pawn, { x: c.x, y: c.y, duration: 0.3 }) }
    tl.to(body, { rotation: 0, duration: 0.15 })
  } else {
    const step = e.via === 'walk' ? 0.2 : 0.12
    for (const sq of e.path.slice(1)) {
      const c = centerOf(sq)
      tl.call(sfx.hop).to(pawn, { x: c.x, y: c.y, duration: step, ease: 'none' })
        .to(body, { y: -16, scaleY: 1.08, duration: step / 2, ease: 'power1.out', yoyo: true, repeat: 1 }, '<')
    }
    tl.to(body, { scaleX: 1.15, scaleY: 0.85, duration: 0.07, yoyo: true, repeat: 1 })
  }
  await tl
  stage.squares[e.player] = to
  await board.layout(stage.squares, 0.18)
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag)
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v))
  return el
}

async function pulse(stage: Stage, square: number, kind: 'tariff' | 'shield' | 'loss' | 'gold', size = 1.4) {
  const c = centerOf(square)
  const ring = svgEl('circle', { cx: c.x, cy: c.y, r: 40, class: `ring ${kind}` })
  stage.board.fx().appendChild(ring)
  await gsap.fromTo(ring, { scale: 0.3, opacity: 1, transformOrigin: 'center' }, { scale: size * 2, opacity: 0, duration: 0.6, ease: 'power2.out' })
  ring.remove()
}

async function shake(stage: Stage, p: number) {
  await gsap.fromTo(stage.board.body(p), { x: -5 }, { x: 5, duration: 0.05, repeat: 5, yoyo: true, clearProps: 'x' })
}

async function spotlight(stage: Stage, p: number) {
  const c = centerOf(stage.squares[p]!)
  const dim = svgEl('rect', { x: -20, y: -20, width: 1040, height: 1040, class: 'dim' })
  const hole = svgEl('circle', { cx: c.x, cy: c.y, r: 60, class: 'ring sanction' })
  stage.board.fx().append(dim, hole)
  await gsap.timeline().fromTo(dim, { opacity: 0 }, { opacity: 0.55, duration: 0.3 }).fromTo(hole, { scale: 3, opacity: 0, transformOrigin: 'center' }, { scale: 1, opacity: 1, duration: 0.4 }).to([dim, hole], { opacity: 0, duration: 0.3, delay: 0.2 })
  dim.remove()
  hole.remove()
}

function trail(stage: Stage, from: number, to: number, cls: string) {
  const a = centerOf(from), z = centerOf(to)
  const line = svgEl('line', { x1: a.x, y1: a.y, x2: z.x, y2: z.y, class: `trail ${cls}` })
  stage.board.fx().appendChild(line)
  const len = Math.hypot(z.x - a.x, z.y - a.y)
  gsap.timeline({ onComplete: () => line.remove() })
    .fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.9, ease: 'power1.inOut' })
    .to(line, { opacity: 0, duration: 0.5 })
}

async function coins(stage: Stage, p: number) {
  const c = centerOf(stage.squares[p]!)
  const tl = gsap.timeline()
  for (let i = 0; i < 10; i++) {
    const coin = svgEl('circle', { cx: c.x, cy: c.y, r: 7, class: 'coin' })
    stage.board.fx().appendChild(coin)
    const a = (Math.PI * 2 * i) / 10
    tl.fromTo(coin, { x: 0, y: 0, opacity: 1 }, { x: Math.cos(a) * 60, y: Math.sin(a) * 60 - 30, opacity: 0, duration: 0.7, ease: 'power2.out', onComplete: () => coin.remove() }, i * 0.02)
  }
  await tl
}

/** "Rafi's turn" ribbon across the table, so a passed phone knows whose go it is. */
async function banner(name: string, color: string) {
  const el = document.createElement('div')
  el.className = 'turn-banner'
  el.innerHTML = `<span class="tb-dot" style="background:${color}"></span><span>${name.replace(/[<&>]/g, '')}'s turn</span>`
  document.body.appendChild(el)
  sfx.turn()
  await gsap.timeline()
    .fromTo(el, { xPercent: -50, x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: 0.3, ease: 'power2.out' })
    .to(el, { x: 80, opacity: 0, duration: 0.3, ease: 'power2.in', delay: 0.5 })
  el.remove()
}

/** Floating "+3" over a player's ledger card. */
function float(p: number, text: string, kind: 'gain' | 'loss' | 'debt') {
  const host = document.querySelector(`[data-ledger="${p}"]`)
  if (!host) return
  const r = host.getBoundingClientRect()
  const el = document.createElement('div')
  el.className = `floater ${kind}`
  el.textContent = text
  el.style.left = `${r.left + r.width / 2}px`
  el.style.top = `${r.top + 16}px`
  document.body.appendChild(el)
  gsap.fromTo(el, { y: 0, opacity: 1 }, { y: -44, opacity: 0, duration: 1.1, ease: 'power1.out', onComplete: () => el.remove() })
}

/** A card flies between piles; flip = it turns face up on the way. */
export async function flyCard(card: CardId, fromSel: string, toSel: string, flip: boolean) {
  const from = document.querySelector(fromSel)?.getBoundingClientRect()
  const to = document.querySelector(toSel)?.getBoundingClientRect()
  if (!from || !to) return
  const el = document.createElement('div')
  el.className = 'flyer'
  el.innerHTML = `<div class="flyer-inner"><div class="flyer-back"><img src="./card-back.png" alt=""></div><div class="flyer-front">${cardFaceHtml(card)}</div></div>`
  Object.assign(el.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` })
  document.body.appendChild(el)
  const inner = el.firstElementChild!
  gsap.set(inner, { rotationY: flip ? 180 : 0 })
  await gsap.timeline()
    .fromTo(el, { x: from.left - to.left, y: from.top - to.top, scale: from.width / to.width }, { x: 0, y: -30, scale: 1.08, duration: 0.45, ease: 'power2.out' })
    .to(inner, { rotationY: 0, duration: 0.45, ease: 'power2.inOut' }, flip ? 0.2 : 0)
    .to(el, { y: 0, scale: 1, duration: 0.2 })
  el.remove()
}
