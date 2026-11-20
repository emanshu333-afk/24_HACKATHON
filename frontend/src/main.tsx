import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { sampleBase } from './services/sample'
import { App } from './app'
import './styles.css'
import './refinements.css'
import './design.css'

createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter basename={sampleBase || "/"}><App /></BrowserRouter></StrictMode>)
