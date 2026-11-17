import { ErroDaApi } from '../api/cliente.ts'
import { listarTransacoes } from '../api/transacoes.ts'
import {
  usePaginasDeTransacoes,
  type FonteDeTransacoes,
} from '../paginacao/usePaginasDeTransacoes.ts'
import { lerDoEndereco, paraApi } from './filtroDaBusca.ts'

/** Resultados por página. O padrão da API: cabe bem numa tela de celular com folga para rolar. */
export const RESULTADOS_POR_PAGINA = 20

/**
 * Mensagem de erro para a tela. Num 400 de filtro inválido (por exemplo, valor mínimo maior que o
 * máximo), a API diz o motivo na lista `erros`; o `detail` sozinho seria só "campos inválidos".
 */
function mensagemDoErro(erro: unknown, padrao: string) {
  if (!(erro instanceof ErroDaApi)) return padrao
  return erro.erros[0]?.mensagem ?? erro.detalhe
}

const RESULTADOS_DA_BUSCA: FonteDeTransacoes = {
  buscarPagina: (consulta, pagina, tamanho) =>
    listarTransacoes({
      ...paraApi(lerDoEndereco(new URLSearchParams(consulta))),
      pagina,
      tamanho,
    }),
  tamanho: RESULTADOS_POR_PAGINA,
  erroAoCarregar: 'Não foi possível buscar.',
  mensagemDoErro,
}

/**
 * Busca as transações da tela de busca (#94), em páginas, com rolagem infinita
 * (paginacao/usePaginasDeTransacoes.ts).
 *
 * Recebe a busca como texto, no formato do endereço ("descricao=uber&tipo=DESPESA"). Um texto é
 * fácil de comparar: busca igual, mesmo texto, e nada é pedido de novo à toa. Ao mudar, a busca
 * recomeça da página 1.
 */
export function useBusca(consulta: string) {
  return usePaginasDeTransacoes(RESULTADOS_DA_BUSCA, consulta)
}
