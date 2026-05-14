import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Overlay from './Overlay.tsx'

const isOverlay = new URLSearchParams(window.location.search).get('view') === 'overlay'

document.body.classList.toggle('overlay-mode', isOverlay)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isOverlay ? <Overlay /> : <App />}
  </StrictMode>,
)
