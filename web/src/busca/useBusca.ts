import { useCallback, useEffect, useRef, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import type { Transacao } from '../api/tipos.ts'
import { listarTransacoes } from '../api/transacoes.ts'
import { juntarSemRepetir } from '../mes/juntarSemRepetir.ts'
import { lerDoEndereco, paraApi } from './filtroDaBusca.ts'

/** Resultados por página. O padrão da API: cabe bem numa tela de celular com folga para rolar. */
export const RESULTADOS_POR_PAGINA = 20

export type Resultados =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | {
      situacao: 'pronto'
      transacoes: Transacao[]
      pagina: number
      temMais: boolean
      carregandoMais: boolean
      erroAoCarregarMais: string | null
    }

type Resposta = { chave: string; dados: Resultados }

/**
 * Mensagem de erro para a tela. Num 400 de filtro inválido (por exemplo, valor mínimo maior que o
 * máximo), a API diz o motivo na lista `erros`; o `detail` sozinho seria só "campos inválidos".
 */
function mensagemDoErro(erro: unknown, padrao: string) {
  if (!(erro instanceof ErroDaApi)) return padrao
  return erro.erros[0]?.mensagem ?? erro.detalhe
}

/**
 * Busca as transações da tela de busca (#94), em páginas, com rolagem infinita.
 *
 * Recebe a busca como texto, no formato do endereço ("descricao=uber&tipo=DESPESA"). Um texto é
 * fácil de comparar: busca igual, mesmo texto, e nada é pedido de novo à toa. Ao mudar, a busca
 * recomeça da página 1.
 *
 * Funciona como o `useDadosDoMes` (mes/useDadosDoMes.ts): a resposta é guardada com a "chave"
 * do pedido, então uma resposta atrasada de uma busca antiga nunca aparece na busca nova.
 */
export function useBusca(consulta: string) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${consulta}#${tentativa}`
  // Trava contra pedir a mesma página duas vezes (ver useDadosDoMes).
  const pedindoMais = useRef<string | null>(null)

  useEffect(() => {
    let ativo = true
    const filtro = paraApi(lerDoEndereco(new URLSearchParams(consulta)))
    listarTransacoes({ ...filtro, pagina: 1, tamanho: RESULTADOS_POR_PAGINA })
      .then((pagina) => {
        if (ativo) {
          setResposta({
            chave,
            dados: {
              situacao: 'pronto',
              transacoes: pagina.itens,
              pagina: pagina.pagina,
              temMais: pagina.temMais,
              carregandoMais: false,
              erroAoCarregarMais: null,
            },
          })
        }
      })
      .catch((erro: unknown) => {
        if (ativo) {
          setResposta({
            chave,
            dados: {
              situacao: 'erro',
              mensagem: mensagemDoErro(erro, 'Não foi possível buscar.'),
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [consulta, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])

  const dados: Resultados =
    resposta?.chave === chave ? resposta.dados : { situacao: 'carregando' }

  const atualizarSeForDoMesmoPedido = useCallback(
    (chaveDoPedido: string, mudar: (dados: Resultados) => Resultados) => {
      setResposta((atual) =>
        atual?.chave === chaveDoPedido
          ? { chave: chaveDoPedido, dados: mudar(atual.dados) }
          : atual,
      )
    },
    [],
  )

  const proximaPagina =
    dados.situacao === 'pronto' && dados.temMais ? dados.pagina + 1 : null

  const carregarMais = useCallback(() => {
    if (proximaPagina === null || pedindoMais.current === chave) return
    const chaveDoPedido = chave
    pedindoMais.current = chaveDoPedido
    atualizarSeForDoMesmoPedido(chaveDoPedido, (atual) =>
      atual.situacao === 'pronto'
        ? { ...atual, carregandoMais: true, erroAoCarregarMais: null }
        : atual,
    )
    const filtro = paraApi(lerDoEndereco(new URLSearchParams(consulta)))
    listarTransacoes({
      ...filtro,
      pagina: proximaPagina,
      tamanho: RESULTADOS_POR_PAGINA,
    })
      .then((pagina) => {
        atualizarSeForDoMesmoPedido(chaveDoPedido, (atual) =>
          atual.situacao === 'pronto'
            ? {
                ...atual,
                transacoes: juntarSemRepetir(atual.transacoes, pagina.itens),
                pagina: pagina.pagina,
                temMais: pagina.temMais,
                carregandoMais: false,
              }
            : atual,
        )
      })
      .catch((erro: unknown) => {
        atualizarSeForDoMesmoPedido(chaveDoPedido, (atual) =>
          atual.situacao === 'pronto'
            ? {
                ...atual,
                carregandoMais: false,
                erroAoCarregarMais: mensagemDoErro(
                  erro,
                  'Não foi possível carregar mais lançamentos.',
                ),
              }
            : atual,
        )
      })
      .finally(() => {
        if (pedindoMais.current === chaveDoPedido) pedindoMais.current = null
      })
  }, [chave, consulta, proximaPagina, atualizarSeForDoMesmoPedido])

  return { dados, tentarDeNovo, carregarMais }
}
