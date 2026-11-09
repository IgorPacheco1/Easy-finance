import { ErroDaApi } from '../api/cliente.ts'
import type { NovaTransacao, Transacao } from '../api/tipos.ts'
import { criarTransacao } from '../api/transacoes.ts'
import {
  guardarNaFila,
  lerFila,
  marcarComoRecusado,
  tirarDaFila,
} from './banco.ts'

/**
 * Quanto esperar a resposta antes de desistir e guardar o lançamento na fila (ADR-0019). Numa
 * rede ruim o pedido às vezes nem falha nem responde.
 */
export const TEMPO_LIMITE_DO_ENVIO_MS = 10_000

/** Erro em que vale a pena tentar de novo mais tarde: sem rede, demora ou falha do servidor. */
function ehFalhaPassageira(erro: unknown): boolean {
  return erro instanceof ErroDaApi && (erro.status === 0 || erro.status >= 500)
}

export type ResultadoDoLancamento =
  { situacao: 'enviado'; transacao: Transacao } | { situacao: 'guardado' }

/**
 * Tenta enviar um lançamento novo. Sem conexão (ou sem resposta em 10 s), guarda na fila do
 * aparelho em vez de mostrar erro (#100). Outros erros (dados recusados, 409) continuam indo para
 * a tela, como antes: a pessoa está ali e pode corrigir.
 */
export async function lancarOuGuardar(
  nova: NovaTransacao & { id: string },
  tempoLimiteMs = TEMPO_LIMITE_DO_ENVIO_MS,
): Promise<ResultadoDoLancamento> {
  try {
    const transacao = await criarTransacao(nova, { tempoLimiteMs })
    return { situacao: 'enviado', transacao }
  } catch (erro) {
    if (!ehFalhaPassageira(erro)) throw erro
    await guardarNaFila(nova)
    return { situacao: 'guardado' }
  }
}

export type ResultadoDoEnvio = {
  /** Quantos saíram da fila agora, confirmados pelo servidor. */
  enviados: number
  /** Quantos o servidor recusou agora (ficam esperando a pessoa decidir). */
  recusados: number
  /** Quantos continuam pendentes (a rede caiu no meio, por exemplo). */
  pendentes: number
}

let envioEmAndamento: Promise<ResultadoDoEnvio> | null = null

/**
 * Envia a fila, um lançamento por vez e na ordem em que foram feitos, sempre com o mesmo id.
 * Usado pelo app (ao abrir, ao voltar a conexão, no "Enviar agora") e pelo service worker (envio
 * em segundo plano, evento `sync`).
 *
 * O que acontece com cada resposta (tabela do ADR-0019):
 * - 201 ou 200: sai da fila (200 é o reenvio de algo que já tinha chegado: a API não duplica).
 * - 410: o lançamento foi excluído em outro aparelho; fica marcado para a pessoa decidir.
 * - outros 4xx (400, 409): o servidor recusou os dados; fica marcado, com a mensagem.
 * - sem rede, demora ou 5xx: para por aqui e tenta tudo de novo na próxima vez.
 *
 * Se já houver um envio em andamento neste mesmo contexto, devolve o mesmo, em vez de começar
 * outro: dois envios ao mesmo tempo mandariam o mesmo lançamento duas vezes. (Se o app e o
 * service worker enviarem juntos, a API não duplica, por causa do id.)
 */
export function enviarFila(
  tempoLimiteMs = TEMPO_LIMITE_DO_ENVIO_MS,
): Promise<ResultadoDoEnvio> {
  envioEmAndamento ??= enviar(tempoLimiteMs).finally(() => {
    envioEmAndamento = null
  })
  return envioEmAndamento
}

async function enviar(tempoLimiteMs: number): Promise<ResultadoDoEnvio> {
  const resultado: ResultadoDoEnvio = {
    enviados: 0,
    recusados: 0,
    pendentes: 0,
  }
  const pendentes = (await lerFila()).filter((l) => l.situacao === 'pendente')

  for (let i = 0; i < pendentes.length; i++) {
    const lancamento = pendentes[i]
    try {
      await criarTransacao(lancamento.corpo, { tempoLimiteMs })
      await tirarDaFila(lancamento.id)
      resultado.enviados++
    } catch (erro) {
      if (ehFalhaPassageira(erro) || !(erro instanceof ErroDaApi)) {
        // Sem rede agora: não adianta tentar os próximos. Ficam todos para a próxima vez.
        resultado.pendentes = pendentes.length - i
        break
      }
      await marcarComoRecusado(
        lancamento.id,
        erro.status === 410 ? 'excluida' : 'invalida',
        erro.erros[0]?.mensagem ?? erro.detalhe,
      )
      resultado.recusados++
    }
  }
  return resultado
}
