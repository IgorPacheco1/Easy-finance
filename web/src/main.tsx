import { StrictMode, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
// Fonte Manrope servida pelo próprio app (ADR-0029): o Vite empacota os arquivos junto.
import '@fontsource-variable/manrope'
import './estilos/tema.css'
import './index.css'
import { roteador } from './rotas.tsx'
import { SessaoProvider } from './sessao/SessaoProvider.tsx'

async function iniciar() {
  let Faixa: ComponentType | null = null
  // Só no build da demonstração (`npm run build:demonstracao`, #162). No build normal o Vite troca
  // a condição por `false` e corta o bloco inteiro: o MSW e os dados de exemplo nem entram no app.
  if (import.meta.env.MODE === 'demonstracao') {
    const demonstracao = await import('./demonstracao/iniciar.ts')
    await demonstracao.iniciarDemonstracao()
    Faixa = demonstracao.FaixaDeDemonstracao
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {Faixa && <Faixa />}
      <SessaoProvider>
        <RouterProvider router={roteador} />
      </SessaoProvider>
    </StrictMode>,
  )
}

void iniciar()
