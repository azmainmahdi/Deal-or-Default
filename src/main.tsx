import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// ponytail: placeholder screen until M3 brings the real UI
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#121417', color: '#efe6d2', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="./logo.png" alt="Deal or Default" width={300} />
        <p>v2 rebuild in progress</p>
      </div>
    </main>
  </StrictMode>,
)
