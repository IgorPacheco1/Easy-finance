import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaginaDeTransacoes, Transacao } from '../api/tipos.ts'
import { juntarSemRepetir } from './juntarSemRepetir.ts'

export type PaginasDeTransacoes =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | {
      situacao: 'pronto'
      transacoes: Transacao[]
      /** Última página já carregada (começa em 1). */
      pagina: number
      temMais: boolean
      carregandoMais: boolean
      /** Erro ao buscar a próxima página; a lista que já veio continua na tela. */
      erroAoCarregarMais: string | null
    }

/**
 * De onde vêm as páginas de uma lista. Crie no nível do módulo (fora do componente): assim é
 * sempre o mesmo objeto, e o hook não pede tudo de novo a cada vez que a tela desenha.
 */
export type FonteDeTransacoes = {
  /** Pede uma página. `consulta` é o texto que identifica a lista (o mês, a busca). */
  buscarPagina: (
    consulta: string,
    pagina: number,
    tamanho: number,
  ) => Promise<PaginaDeTransacoes>
  /** Quantas transações por página. */
  tamanho: number
  /** Mensagem padrão quando a primeira página falha por um motivo que não é da API. */
  erroAoCarregar: string
  /** Texto do erro para a tela; `padrao` quando o erro não traz uma mensagem da API. */
  mensagemDoErro: (erro: unknown, padrao: string) => string
}

const ERRO_AO_CARREGAR_MAIS = 'Não foi possível carregar mais lançamentos.'

type Resposta = { chave: string; dados: PaginasDeTransacoes }

/**
 * Uma lista de transações em páginas, com rolagem infinita (#92, #153). Usado pela tela do mês
 * (useTransacoesDoMes) e pela busca (useBusca), que só dizem de onde vêm as páginas.
 *
 * Primeiro vem só a página 1; `carregarMais` busca a próxima e junta no fim, sem repetir.
 * Quando a `consulta` muda (outro mês, outra busca), a lista recomeça da página 1.
 *
 * A resposta é guardada junto com a "chave" do pedido (consulta + tentativa). Se a chave
 * guardada não é a atual, é porque a resposta do pedido atual ainda não chegou: a tela está
 * carregando. Assim o efeito não precisa mudar o estado para "carregando" (o que faria a tela
 * desenhar duas vezes), e uma resposta atrasada de uma consulta antiga nunca aparece na nova. A
 * mesma chave protege o `carregarMais`: uma página que chega depois de a consulta mudar é ignorada.
 */
export function usePaginasDeTransacoes(
  fonte: FonteDeTransacoes,
  consulta: string,
) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${consulta}#${tentativa}`
  // Trava contra dois pedidos da mesma página (por exemplo, o aviso de "fim da lista" disparar
  // duas vezes seguidas). Guarda a chave do pedido em andamento, ou null. É um ref, e não estado,
  // porque precisa valer na hora, sem esperar a tela desenhar de novo.
  const pedindoMais = useRef<string | null>(null)

  useEffect(() => {
    let ativo = true
    fonte
      .buscarPagina(consulta, 1, fonte.tamanho)
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
              mensagem: fonte.mensagemDoErro(erro, fonte.erroAoCarregar),
            },
          })
        }
      })
    return () => {
      ativo = false
    }
  }, [fonte, consulta, chave])

  const tentarDeNovo = useCallback(() => setTentativa((n) => n + 1), [])

  const dados: PaginasDeTransacoes =
    resposta?.chave === chave ? resposta.dados : { situacao: 'carregando' }

  /** Muda os dados da tela, mas só se eles ainda forem do mesmo pedido (mesma chave). */
  const atualizarSeForDoMesmoPedido = useCallback(
    (
      chaveDoPedido: string,
      mudar: (dados: PaginasDeTransacoes) => PaginasDeTransacoes,
    ) => {
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
    fonte
      .buscarPagina(consulta, proximaPagina, fonte.tamanho)
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
                erroAoCarregarMais: fonte.mensagemDoErro(
                  erro,
                  ERRO_AO_CARREGAR_MAIS,
                ),
              }
            : atual,
        )
      })
      .finally(() => {
        // Libera a trava. Quando a consulta muda não é preciso liberar: a chave muda e a trava
        // antiga deixa de valer sozinha.
        if (pedindoMais.current === chaveDoPedido) pedindoMais.current = null
      })
  }, [fonte, chave, consulta, proximaPagina, atualizarSeForDoMesmoPedido])

  return { dados, tentarDeNovo, carregarMais }
}
