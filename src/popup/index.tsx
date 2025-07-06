import React from 'react'
import ReactDOM from 'react-dom/client'
import { Popup } from './Popup'
import '../styles/globals.css'
import '../lib/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)