import type { CountryId } from '../rules/types'

/** Simplified flags, drawn so they render the same everywhere (emoji flags don't on Windows). */
export function Flag({ c }: { c: CountryId }) {
  const body = {
    germany: <><rect width="30" height="7" fill="#111" /><rect y="7" width="30" height="6" fill="#dd0000" /><rect y="13" width="30" height="7" fill="#ffce00" /></>,
    japan: <><rect width="30" height="20" fill="#fff" /><circle cx="15" cy="10" r="6" fill="#bc002d" /></>,
    bangladesh: <><rect width="30" height="20" fill="#006a4e" /><circle cx="13.5" cy="10" r="6" fill="#f42a41" /></>,
    china: <><rect width="30" height="20" fill="#de2910" /><path d="M6 3l1.2 3.6H11L8 8.8l1.1 3.6L6 10.2 2.9 12.4 4 8.8 1 6.6h3.8z" fill="#ffde00" /></>,
    usa: <><rect width="30" height="20" fill="#fff" />{[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={i * 1.54} width="30" height="1.54" fill="#b22234" />)}<rect width="13" height="10.8" fill="#3c3b6e" /></>,
    uk: <><rect width="30" height="20" fill="#012169" /><path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" /><path d="M0 0L30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.5" /><path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" /><path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.5" /></>,
  }[c]
  return (
    <span className="flag-badge" aria-hidden="true">
      <svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice">{body}</svg>
    </span>
  )
}
