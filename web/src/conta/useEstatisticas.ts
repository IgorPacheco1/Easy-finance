import { useCallback, useEffect, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarEstatisticas } from '../api/conta.ts'
import type { Estatisticas } from '../api/tipos.ts'

export type EstadoDasEstatisticas =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; estatisticas: Estatisticas }

type Resposta = { tentativa: number; dados: EstadoDasEstatisticas }

/** Busca as estatísticas do perfil (#194), com "Tentar de novo" como os hooks do Mês. */
export function useEstatisticas() {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)

  useEffect(() => {
    let ativo = true
    buscarEstatisticas()
      .then((estatisticas) => {
        if (ativo)
          setResposta({
            tentativa,
            dados: { situacao: 'pronto', estatisticas },
          })
      })
      .catch((erro: unknown) => {
        if (ativo) {
          setResposta({
            tentativa,
            dados: {
              situacao: 'erro',
              mensagem:
                erro instanceof ErroDaApi
                  ? erro.detalhe
                  : 'Não foi possível carregar as estatísticas.',
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [tentativa])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])
  const dados: EstadoDasEstatisticas =
    resposta?.tentativa === tentativa
      ? resposta.dados
      : { situacao: 'carregando' }
  return { dados, tentarDeNovo }
}
