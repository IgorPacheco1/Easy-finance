import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
// Fonte Manrope servida pelo próprio app (ADR-0029): o Vite empacota os arquivos junto.
import '@fontsource-variable/manrope'
import './estilos/tema.css'
import './index.css'
import { roteador } from './rotas.tsx'
import { SessaoProvider } from './sessao/SessaoProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessaoProvider>
      <RouterProvider router={roteador} />
    </SessaoProvider>
  </StrictMode>,
)
