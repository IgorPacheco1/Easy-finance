import { createBrowserRouter, type RouteObject } from 'react-router'
import { Layout } from './layout/Layout.tsx'
import { CategoriasPagina } from './paginas/CategoriasPagina.tsx'
import { LancarPagina } from './paginas/LancarPagina.tsx'
import { MesPagina } from './paginas/MesPagina.tsx'
import { PaginaNaoEncontrada } from './paginas/PaginaNaoEncontrada.tsx'

/**
 * Mapa de endereços do app. Todas as telas ficam dentro do Layout, que desenha a navegação
 * inferior; o conteúdo de cada uma aparece no lugar do <Outlet /> do Layout.
 *
 * A tela inicial ("/") é a de lançamento: registrar um gasto é a ação principal do app.
 * Decisão provisória da #26, a revisar.
 *
 * As rotas ficam separadas do roteador para os testes montarem o app num endereço qualquer
 * (src/testes/renderizar.tsx).
 */
export const rotas: RouteObject[] = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LancarPagina /> },
      { path: 'mes', element: <MesPagina /> },
      { path: 'categorias', element: <CategoriasPagina /> },
      { path: '*', element: <PaginaNaoEncontrada /> },
    ],
  },
]

/** Roteador do app de verdade, que lê o endereço da barra do navegador. */
export const roteador = createBrowserRouter(rotas)
