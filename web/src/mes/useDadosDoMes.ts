import { useCallback, useEffect, useRef, useState } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { buscarSaldo } from '../api/saldo.ts'
import type { Saldo, Transacao } from '../api/tipos.ts'
import { listarTransacoes } from '../api/transacoes.ts'
import { periodoDoMes, type Mes } from '../formatacao/datas.ts'
import { juntarSemRepetir } from './juntarSemRepetir.ts'

/**
 * Quantas transações pedir por vez. Maior que o padrão da API (20) porque um mês costuma ter
 * algumas dezenas de lançamentos: assim, na maioria dos meses, a lista vem num pedido só, e a
 * rolagem infinita só entra em ação nos meses cheios.
 */
export const TRANSACOES_POR_PAGINA = 50

export type DadosDoMes =
  | { situacao: 'carregando' }
  | { situacao: 'erro'; mensagem: string }
  | {
      situacao: 'pronto'
      transacoes: Transacao[]
      saldo: Saldo
      /** Última página já carregada (começa em 1). */
      pagina: number
      temMais: boolean
      carregandoMais: boolean
      /** Erro ao buscar a próxima página; a lista que já veio continua na tela. */
      erroAoCarregarMais: string | null
    }

type Resposta = { chave: string; dados: DadosDoMes }

function mensagemDoErro(erro: unknown, padrao: string) {
  return erro instanceof ErroDaApi ? erro.detalhe : padrao
}

/**
 * Busca as transações e o saldo do mês, os dois pedidos ao mesmo tempo (Promise.all), e busca
 * de novo sempre que o mês muda (ou quando a pessoa toca em "Tentar de novo").
 *
 * As transações vêm em páginas (#92): primeiro só a página 1; `carregarMais` busca a próxima e
 * junta no fim da lista. O saldo não depende disso, porque vem somado pela API.
 *
 * A resposta é guardada junto com a "chave" do pedido (mês + tentativa). Se a chave guardada
 * não é a atual, é porque a resposta do pedido atual ainda não chegou: a tela está carregando.
 * Assim o efeito não precisa mudar o estado para "carregando" (o que faria a tela desenhar duas
 * vezes), e uma resposta atrasada de outro mês nunca aparece no mês errado. A mesma chave
 * protege o `carregarMais`: uma página que chega depois de a pessoa trocar de mês é ignorada.
 */
export function useDadosDoMes(mes: Mes) {
  const [tentativa, setTentativa] = useState(0)
  const [resposta, setResposta] = useState<Resposta | null>(null)
  const chave = `${mes}#${tentativa}`
  // Trava contra dois pedidos da mesma página (por exemplo, o aviso de "fim da lista" disparar
  // duas vezes seguidas). Guarda a chave do pedido em andamento, ou null. É um ref, e não estado,
  // porque precisa valer na hora, sem esperar a tela desenhar de novo.
  const pedindoMais = useRef<string | null>(null)

  useEffect(() => {
    let ativo = true
    const periodo = periodoDoMes(mes)
    Promise.all([
      listarTransacoes({ periodo, pagina: 1, tamanho: TRANSACOES_POR_PAGINA }),
      buscarSaldo(periodo),
    ])
      .then(([pagina, saldo]) => {
        if (ativo) {
          setResposta({
            chave,
            dados: {
              situacao: 'pronto',
              transacoes: pagina.itens,
              saldo,
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
              mensagem: mensagemDoErro(
                erro,
                'Não foi possível carregar o mês.',
              ),
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

  /** Muda os dados da tela, mas só se eles ainda forem do mesmo pedido (mesma chave). */
  const atualizarSeForDoMesmoPedido = useCallback(
    (chaveDoPedido: string, mudar: (dados: DadosDoMes) => DadosDoMes) => {
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
    listarTransacoes({
      periodo: periodoDoMes(mes),
      pagina: proximaPagina,
      tamanho: TRANSACOES_POR_PAGINA,
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
        // Libera a trava. Ao trocar de mês não é preciso liberar: a chave muda e a trava antiga
        // (com a chave do mês anterior) deixa de valer sozinha.
        if (pedindoMais.current === chaveDoPedido) pedindoMais.current = null
      })
  }, [chave, mes, proximaPagina, atualizarSeForDoMesmoPedido])

  return { dados, tentarDeNovo, carregarMais }
}
