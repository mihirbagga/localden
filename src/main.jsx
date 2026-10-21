import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './responsive.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


requestAnimationFrame(() => {
  const splash = document.getElementById('splash')
  if (!splash) return
  setTimeout(() => {
    splash.classList.add('hide')
    setTimeout(() => splash.remove(), 400)
  }, 250)
})
