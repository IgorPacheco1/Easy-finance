import { useCallback, useEffect, useState } from 'react'
import { listarCategorias, type OrdemDasCategorias } from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import { guardarCategorias, lerCategorias } from '../fila/banco.ts'
import type { Categoria } from '../api/tipos.ts'

export type EstadoDasCategorias =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | { situacao: 'pronto'; categorias: Categoria[] }

/**
 * Busca as categorias uma vez, quando a tela abre (todas, de receita e de despesa: cada tela
 * filtra o que precisa, sem pedir de novo à API). Usado pelas telas de lançamento e de
 * categorias. `alterarLista` permite atualizar a lista depois de criar, editar ou excluir,
 * sem buscar tudo de novo.
 *
 * `ordem`: a tela de lançamento pede as mais usadas primeiro (#97); as outras usam a ordem
 * alfabética.
 *
 * `copiaNoAparelho`: guarda a lista no aparelho e, sem internet, usa a última guardada. Só a tela
 * de lançamento usa, para dar para lançar offline (#100, ADR-0019).
 *
 * `useEffect` roda o código depois que a tela aparece. O `ativo` evita atualizar o estado se
 * o usuário já tiver saído da tela quando a resposta chegar.
 */
export function useCategorias(
  ordem?: OrdemDasCategorias,
  opcoes: { copiaNoAparelho?: boolean } = {},
) {
  const { copiaNoAparelho = false } = opcoes
  const [estado, setEstado] = useState<EstadoDasCategorias>({
    situacao: 'carregando',
  })
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let ativo = true
    listarCategorias(undefined, ordem)
      .then((categorias) => {
        if (ativo) setEstado({ situacao: 'pronto', categorias })
        // Guarda a lista para poder lançar sem internet da próxima vez (#100). Se o aparelho
        // não deixar gravar, o app segue funcionando com internet.
        if (copiaNoAparelho) guardarCategorias(categorias).catch(() => {})
      })
      .catch(async (erro: unknown) => {
        // Sem conexão: usa a última lista guardada no aparelho, se houver (#100).
        if (copiaNoAparelho && erro instanceof ErroDaApi && erro.status === 0) {
          const guardadas = await lerCategorias().catch(() => [])
          if (ativo && guardadas.length > 0) {
            setEstado({ situacao: 'pronto', categorias: guardadas })
            return
          }
        }
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
  }, [tentativa, ordem, copiaNoAparelho])

  const tentarDeNovo = useCallback(() => {
    setEstado({ situacao: 'carregando' })
    setTentativa((n) => n + 1)
  }, [])

  const alterarLista = useCallback(
    (alterar: (categorias: Categoria[]) => Categoria[]) => {
      setEstado((atual) =>
        atual.situacao === 'pronto'
          ? { situacao: 'pronto', categorias: alterar(atual.categorias) }
          : atual,
      )
    },
    [],
  )

  return { estado, tentarDeNovo, alterarLista }
}
