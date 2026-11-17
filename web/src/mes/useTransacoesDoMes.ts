import { ErroDaApi } from '../api/cliente.ts'
import { listarTransacoes } from '../api/transacoes.ts'
import { periodoDoMes, type Mes } from '../formatacao/datas.ts'
import {
  usePaginasDeTransacoes,
  type FonteDeTransacoes,
} from '../paginacao/usePaginasDeTransacoes.ts'

/**
 * Quantas transações pedir por vez. Maior que o padrão da API (20) porque um mês costuma ter
 * algumas dezenas de lançamentos: assim, na maioria dos meses, a lista vem num pedido só, e a
 * rolagem infinita só entra em ação nos meses cheios.
 */
export const TRANSACOES_POR_PAGINA = 50

const TRANSACOES_DO_MES: FonteDeTransacoes = {
  // A consulta é o próprio mês ("2026-11").
  buscarPagina: (mes, pagina, tamanho) =>
    listarTransacoes({ periodo: periodoDoMes(mes as Mes), pagina, tamanho }),
  tamanho: TRANSACOES_POR_PAGINA,
  erroAoCarregar: 'Não foi possível carregar os lançamentos.',
  mensagemDoErro: (erro, padrao) =>
    erro instanceof ErroDaApi ? erro.detalhe : padrao,
}

/**
 * Transações do mês, em páginas, com rolagem infinita (paginacao/usePaginasDeTransacoes.ts).
 * Busca de novo sempre que o mês muda (ou quando a pessoa toca em "Tentar de novo").
 *
 * O saldo e o resumo por categoria vêm cada um no seu hook (useSaldoDoMes, useResumoDoMes):
 * se um deles falhar, o resto da tela continua aparecendo (#153).
 */
export function useTransacoesDoMes(mes: Mes) {
  return usePaginasDeTransacoes(TRANSACOES_DO_MES, mes)
}
