import { useCallback, useEffect, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarResumo } from '../api/resumo.ts'
import type { Resumo } from '../api/tipos.ts'
import { periodoDoMes, type Mes } from '../formatacao/datas.ts'

export type ResumoDoMes =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; resumo: Resumo }

type Resposta = { chave: string; dados: ResumoDoMes }

/**
 * Busca o resumo por categoria do mês (#96), separado das transações e do saldo
 * (useDadosDoMes): se só o resumo falhar, o resto da tela continua aparecendo, e o "Tentar de
 * novo" do resumo pede só ele. Os pedidos saem ao mesmo tempo, porque os dois efeitos rodam
 * juntos quando a tela abre ou o mês muda.
 *
 * A "chave" (mês + tentativa) funciona como no useDadosDoMes: resposta atrasada de outro mês é
 * ignorada.
 */
export function useResumoDoMes(mes: Mes) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${mes}#${tentativa}`

  useEffect(() => {
    let ativo = true
    buscarResumo(periodoDoMes(mes))
      .then((resumo) => {
        if (ativo) setResposta({ chave, dados: { situacao: 'pronto', resumo } })
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
                  : 'Não foi possível carregar o resumo.',
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [mes, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])
  const dados: ResumoDoMes =
    resposta?.chave === chave ? resposta.dados : { situacao: 'carregando' }

  return { dados, tentarDeNovo }
}
