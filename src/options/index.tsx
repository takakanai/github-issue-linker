import React from 'react'
import ReactDOM from 'react-dom/client'
import { Options } from './Options'
import { ThemeProvider } from '../contexts/ThemeContext'
import '../styles/globals.css'
import '../lib/i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Options />
    </ThemeProvider>
  </React.StrictMode>,
)