import { createBrowserRouter } from 'react-router'
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
 */
export const roteador = createBrowserRouter([
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
])
