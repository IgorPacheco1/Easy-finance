import { useCallback, useEffect, useState } from 'react'
import { listarCategorias } from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import type { Categoria } from '../api/tipos.ts'

export type EstadoDasCategorias =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; categorias: Categoria[] }

/**
 * Busca as categorias uma vez, quando a tela abre (todas, de receita e de despesa: a tela
 * filtra pelo tipo escolhido, sem precisar pedir de novo à API).
 *
 * `useEffect` roda o código depois que a tela aparece. O `ativo` evita atualizar o estado se
 * o usuário já tiver saído da tela quando a resposta chegar.
 */
export function useCategorias() {
  const [estado, setEstado] = useState<EstadoDasCategorias>({
    situacao: 'carregando',
  })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    listarCategorias()
      .then((categorias) => {
        if (ativo) setEstado({ situacao: 'pronto', categorias })
      })
      .catch((erro: unknown) => {
        if (ativo) {
          setEstado({
            situacao: 'erro',
            mensagem:
              erro instanceof ErroDaApi
                ? erro.detalhe
                : 'Não foi possível carregar as categorias.',
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [tentativa])

  const tentarDeNovo = useCallback(() => {
    setEstado({ situacao: 'carregando' })
    setTentativa((n) => n + 1)
  }, [])

  return { estado, tentarDeNovo }
}
