import { render } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { rotas } from '../rotas.tsx'

/**
 * Desenha o app inteiro (layout, navegação e telas) como se o endereço fosse `endereco`.
 *
 * O roteador "de memória" guarda o endereço numa variável, e não na barra do navegador: cada
 * teste começa no endereço que quiser, sem um interferir no outro.
 *
 * Devolve `usuario`, que simula uma pessoa: clica, digita e aperta teclas na ordem em que isso
 * acontece de verdade (foco, teclado, mudança no campo...). E `roteador`, para conferir o
 * endereço depois de uma navegação.
 */
export function renderizarApp(endereco = '/') {
  const roteador = createMemoryRouter(rotas, { initialEntries: [endereco] })
  const usuario = userEvent.setup()
  render(<RouterProvider router={roteador} />)
  return { usuario, roteador }
}
