import { createBrowserRouter, type RouteObject } from 'react-router'
import { Layout } from './layout/Layout.tsx'
import { BuscarPagina } from './paginas/BuscarPagina.tsx'
import { CategoriasPagina } from './paginas/CategoriasPagina.tsx'
import { ContaPagina } from './paginas/ContaPagina.tsx'
import { CriarContaPagina } from './paginas/CriarContaPagina.tsx'
import { EditarLancamentoPagina } from './paginas/EditarLancamentoPagina.tsx'
import { EntrarPagina } from './paginas/EntrarPagina.tsx'
import { LancarPagina } from './paginas/LancarPagina.tsx'
import { MesPagina } from './paginas/MesPagina.tsx'
import { PaginaNaoEncontrada } from './paginas/PaginaNaoEncontrada.tsx'
import { PrivacidadePagina } from './paginas/PrivacidadePagina.tsx'
import { TrocarSenhaPagina } from './paginas/TrocarSenhaPagina.tsx'
import { RotaProtegida } from './sessao/RotaProtegida.tsx'

/**
 * Mapa de endereços do app. As telas de entrar e criar conta ficam de fora; todas as outras
 * ficam atrás da RotaProtegida (só quem está logado vê) e dentro do Layout, que desenha a
 * navegação inferior; o conteúdo de cada uma aparece no lugar do <Outlet /> do Layout (ADR-0027).
 *
 * A tela inicial ("/") é a de lançamento: registrar um gasto é a ação principal do app.
 * Decisão provisória da #26, a revisar.
 *
 * As rotas ficam separadas do roteador para os testes montarem o app num endereço qualquer
 * (src/testes/renderizar.tsx).
 */
export const rotas: RouteObject[] = [
  { path: '/entrar', element: <EntrarPagina /> },
  { path: '/criar-conta', element: <CriarContaPagina /> },
  {
    path: '/',
    element: (
      <RotaProtegida>
        <Layout />
      </RotaProtegida>
    ),
    children: [
      { index: true, element: <LancarPagina /> },
      { path: 'mes', element: <MesPagina /> },
      { path: 'buscar', element: <BuscarPagina /> },
      { path: 'categorias', element: <CategoriasPagina /> },
      { path: 'conta', element: <ContaPagina /> },
      { path: 'conta/senha', element: <TrocarSenhaPagina /> },
      { path: 'conta/privacidade', element: <PrivacidadePagina /> },
      { path: 'lancamentos/:id', element: <EditarLancamentoPagina /> },
      { path: '*', element: <PaginaNaoEncontrada /> },
    ],
  },
]

/**
 * Roteador do app de verdade, que lê o endereço da barra do navegador. `basename`: o app pode
 * estar numa subpasta (a demonstração no GitHub Pages fica em /Easy-finance/, #162); no app normal
 * é a raiz.
 */
export const roteador = createBrowserRouter(rotas, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
