import { render } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { rotas } from '../rotas.tsx'
import type { EstadoDaSessao } from '../sessao/contexto.ts'
import { SessaoProvider } from '../sessao/SessaoProvider.tsx'
import { USUARIO } from './dados.ts'

/**
 * Desenha o app inteiro (layout, navegação e telas) como se o endereço fosse `endereco`.
 *
 * O roteador "de memória" guarda o endereço numa variável, e não na barra do navegador: cada
 * teste começa no endereço que quiser, sem um interferir no outro.
 *
 * Devolve `usuario` (a pessoa que age na tela), que simula uma pessoa: clica, digita e aperta teclas na ordem em que isso
 * acontece de verdade (foco, teclado, mudança no campo...). E `roteador`, para conferir o
 * endereço depois de uma navegação.
 */
export function renderizarApp(
  endereco = '/',
  /** Por padrão a pessoa já está logada (assim as telas aparecem na hora); passe `anonimo` ou `carregando` para testar a entrada. */
  sessaoInicial: EstadoDaSessao = {
    situacao: 'logado',
    usuario: USUARIO,
    confirmada: true,
  },
  /**
   * `estrito`: desenha dentro do `StrictMode`, como o `main.tsx`. Em desenvolvimento o React monta,
   * desmonta e monta de novo cada componente; foi assim que as folhas fechavam sozinhas (#215).
   */
  { estrito = false }: { estrito?: boolean } = {},
) {
  const roteador = createMemoryRouter(rotas, { initialEntries: [endereco] })
  const usuario = userEvent.setup()
  const app = (
    <SessaoProvider estadoInicial={sessaoInicial}>
      <RouterProvider router={roteador} />
    </SessaoProvider>
  )
  render(estrito ? <StrictMode>{app}</StrictMode> : app)
  return { usuario, roteador }
}
