// "How to play": the rules in plain words, numbers read from the live config.
import { DEFAULT_CONFIG as C } from '../rules/config'

const ROWS: [string, string, string][] = [
  ['ladder', 'FDI ladder', `Invest 1–${C.maxInvest} Capital to climb. You get a project that pays chips × Δ after as many turns as chips. Invest 0 to stay.`],
  ['snake', 'Market crash', `Hedge for about Δ ÷ ${C.hedgeDivisor} Capital to slide only half way and keep your projects. Otherwise slide the whole way and lose your biggest project.`],
  ['tariff', 'Tariff', `Every other player moves back ${C.tariffSetback}, unless they spend a Tariff Waiver.`],
  ['sanction', 'Sanction', `The Net Worth leader moves back ${C.sanctionSetback}.`],
  ['event', 'Event', 'Draw a card. Twelve help, twelve hurt.'],
  ['goal', 'Square 100', `Land exactly on 100 to end the game and take +${C.finishBonus}. Overshoot and you stay put.`],
]

export function Rules({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay rules" role="dialog" aria-label="How to play" onClick={onClose}>
      <section className="rules-card" onClick={(e) => e.stopPropagation()}>
        <p className="eyebrow">How to play</p>
        <h2>Finish with the highest Net Worth</h2>
        <p className="lede">Net Worth = Capital − {C.debtWeight} × Debt. Unfinished projects count for nothing. Everyone starts with {C.startCapital} Capital and {C.startWaivers} Tariff Waiver.</p>
        <div className="rules-grid">
          {ROWS.map(([icon, name, text]) => (
            <div key={icon} className="rule">
              <img src={`./icons/${icon}.svg`} alt="" />
              <div><b>{name}</b><p>{text}</p></div>
            </div>
          ))}
        </div>
        <div className="rules-foot">
          <p><b>Your turn:</b> borrow up to {C.maxDebtTake} Debt (cap {C.debtCap}) or repay, then roll. From square {C.crunchFrom} your roll is halved while you owe anything.</p>
          <p><b>Takeover:</b> end your move on a rival with projects and you may pay {C.takeoverCost} to take their smallest one.</p>
          <p><b>Countries:</b> each has one perk, shown on its card.</p>
        </div>
        <button className="primary" onClick={onClose}>Got it</button>
      </section>
    </div>
  )
}
