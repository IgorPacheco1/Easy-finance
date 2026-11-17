import { useCallback, useEffect, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarSaldo } from '../api/saldo.ts'
import type { Saldo } from '../api/tipos.ts'
import { periodoDoMes, type Mes } from '../formatacao/datas.ts'

export type SaldoDoMes =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; saldo: Saldo }

type Resposta = { chave: string; dados: SaldoDoMes }

/**
 * Busca o saldo do mês (receitas, despesas e saldo), separado das transações
 * (useTransacoesDoMes) e do resumo (useResumoDoMes), como o resumo já fazia (#96): se só o saldo
 * falhar, a lista continua na tela, e o "Tentar de novo" do saldo pede só ele (#153).
 *
 * A "chave" (mês + tentativa) funciona como nos outros hooks do mês: resposta atrasada de outro
 * mês é ignorada.
 */
export function useSaldoDoMes(mes: Mes) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${mes}#${tentativa}`

  useEffect(() => {
    let ativo = true
    buscarSaldo(periodoDoMes(mes))
      .then((saldo) => {
        if (ativo) setResposta({ chave, dados: { situacao: 'pronto', saldo } })
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
                  : 'Não foi possível carregar o saldo.',
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [mes, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])
  const dados: SaldoDoMes =
    resposta?.chave === chave ? resposta.dados : { situacao: 'carregando' }

  return { dados, tentarDeNovo }
}
