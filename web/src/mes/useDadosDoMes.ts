import { useCallback, useEffect, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarSaldo } from '../api/saldo.ts'
import type { Saldo, Transacao } from '../api/tipos.ts'
import { listarTransacoes } from '../api/transacoes.ts'
import { periodoDoMes, type Mes } from '../formatacao/datas.ts'

export type DadosDoMes =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; transacoes: Transacao[]; saldo: Saldo }

type Resposta = { chave: string; dados: DadosDoMes }

/**
 * Busca as transações e o saldo do mês, os dois pedidos ao mesmo tempo (Promise.all), e busca
 * de novo sempre que o mês muda (ou quando a pessoa toca em "Tentar de novo").
 *
 * A resposta é guardada junto com a "chave" do pedido (mês + tentativa). Se a chave guardada
 * não é a atual, é porque a resposta do pedido atual ainda não chegou: a tela está carregando.
 * Assim o efeito não precisa mudar o estado para "carregando" (o que faria a tela desenhar duas
 * vezes), e uma resposta atrasada de outro mês nunca aparece no mês errado.
 */
export function useDadosDoMes(mes: Mes) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${mes}#${tentativa}`

  useEffect(() => {
    let ativo = true
    const periodo = periodoDoMes(mes)
    Promise.all([listarTransacoes(periodo), buscarSaldo(periodo)])
      .then(([transacoes, saldo]) => {
        if (ativo) {
          setResposta({
            chave,
            dados: { situacao: 'pronto', transacoes, saldo },
          })
        }
      })
      .catch((erro: unknown) => {
        if (ativo) {
          setResposta({
            chave,
            dados: {
              situacao: 'erro',
              mensagem:
                erro instanceof ErroDaApi
                  ? erro.detalhe
                  : 'Não foi possível carregar o mês.',
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [mes, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])
  const dados: DadosDoMes =
    resposta?.chave === chave ? resposta.dados : { situacao: 'carregando' }

  return { dados, tentarDeNovo }
}
