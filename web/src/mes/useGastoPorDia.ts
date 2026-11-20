import { useCallback, useEffect, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarResumoDiario } from '../api/resumo.ts'
import type { ResumoDiario } from '../api/tipos.ts'
import { periodoDoMes, type Mes } from '../formatacao/datas.ts'

export type GastoPorDiaDoMes =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; resumo: ResumoDiario }

type Resposta = { chave: string; dados: GastoPorDiaDoMes }

/**
 * Busca o gasto de cada dia do mês (#189), separado do saldo, do resumo e da lista: se só ele
 * falhar, o resto da tela continua, e o "Tentar de novo" do gráfico pede só ele (como #153).
 *
 * A "chave" (mês + tentativa) funciona como nos outros hooks do mês: resposta atrasada de outro
 * mês é ignorada.
 */
export function useGastoPorDia(mes: Mes) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${mes}#${tentativa}`

  useEffect(() => {
    let ativo = true
    buscarResumoDiario(periodoDoMes(mes))
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
                  : 'Não foi possível carregar o gasto por dia.',
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [mes, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])
  const dados: GastoPorDiaDoMes =
    resposta?.chave === chave ? resposta.dados : { situacao: 'carregando' }

  return { dados, tentarDeNovo }
}
