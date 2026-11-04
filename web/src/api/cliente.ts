/**
 * Cliente HTTP do app: o único lugar que sabe fazer pedidos para a API. As telas usam as
 * funções de categorias.ts, transacoes.ts e saldo.ts, e nunca chamam o fetch direto.
 */
import type { ErroDeCampo, Problema } from './tipos.ts'

/**
 * Endereço base da API. O padrão "/api/v1" é relativo: no desenvolvimento, o proxy do Vite
 * repassa tudo que começa com /api para o backend (ver vite.config.ts), então não há CORS.
 */
export const URL_BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

/**
 * Erro vindo da API (ou da falta dela), pronto para a tela mostrar.
 *
 * A API responde os erros no formato ProblemDetail (RFC 9457): `title`, `detail` e, nos dados
 * inválidos, a lista `erros` por campo. Esta classe guarda isso com nomes em português.
 */
export class ErroDaApi extends Error {
  /** Status HTTP. 0 quando nem deu para falar com o servidor (sem internet, backend fora). */
  readonly status: number
  readonly titulo: string
  /** Erros por campo (só nos 400 de dados inválidos). */
  readonly erros: ErroDeCampo[]

  constructor(
    status: number,
    titulo: string,
    detalhe: string,
    erros: ErroDeCampo[] = [],
  ) {
    super(detalhe)
    this.name = 'ErroDaApi'
    this.status = status
    this.titulo = titulo
    this.erros = erros
  }

  /** A mensagem para mostrar ao usuário (o `detail` do ProblemDetail). */
  get detalhe(): string {
    return this.message
  }

  /** Mensagem do erro de um campo, para mostrar embaixo dele no formulário. */
  erroDoCampo(campo: string): string | undefined {
    return this.erros.find((erro) => erro.campo === campo)?.mensagem
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE'

/** Parâmetros de consulta (?de=...&ate=...). Os valores `undefined` são ignorados. */
export type Parametros = Record<string, string | undefined>

/**
 * Faz um pedido para a API e devolve o corpo da resposta já convertido do JSON.
 * Em caso de erro, lança um ErroDaApi.
 */
export async function requisicao<T>(
  metodo: Metodo,
  caminho: string,
  opcoes: { corpo?: unknown; parametros?: Parametros } = {},
): Promise<T> {
  const { corpo, parametros } = opcoes
  const temCorpo = corpo !== undefined

  let resposta: Response
  try {
    resposta = await fetch(URL_BASE + caminho + consulta(parametros), {
      method: metodo,
      headers: {
        Accept: 'application/json, application/problem+json',
        ...(temCorpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: temCorpo ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    // O fetch só falha assim quando não houve resposta nenhuma (rede ou servidor fora do ar).
    throw new ErroDaApi(
      0,
      'Sem conexão',
      'Não foi possível falar com o servidor. Confira sua conexão e tente de novo.',
    )
  }

  if (!resposta.ok) {
    throw await erroDaResposta(resposta)
  }
  if (resposta.status === 204) {
    // 204 No Content (por exemplo, numa exclusão): não há corpo para ler.
    return undefined as T
  }
  return (await resposta.json()) as T
}

function consulta(parametros?: Parametros): string {
  if (!parametros) {
    return ''
  }
  const busca = new URLSearchParams()
  for (const [nome, valor] of Object.entries(parametros)) {
    if (valor !== undefined) {
      busca.set(nome, valor)
    }
  }
  const texto = busca.toString()
  return texto ? `?${texto}` : ''
}

/** Lê o ProblemDetail da resposta. Se o corpo não for JSON, usa uma mensagem padrão. */
async function erroDaResposta(resposta: Response): Promise<ErroDaApi> {
  try {
    const problema = (await resposta.json()) as Problema
    return new ErroDaApi(
      resposta.status,
      problema.title ?? 'Erro',
      problema.detail ?? mensagemPadrao(resposta.status),
      (problema.erros ?? []).map((erro) => ({
        campo: erro.campo ?? '',
        mensagem: erro.mensagem ?? '',
      })),
    )
  } catch {
    return new ErroDaApi(
      resposta.status,
      'Erro',
      mensagemPadrao(resposta.status),
    )
  }
}

function mensagemPadrao(status: number): string {
  if (status >= 500) {
    return 'O servidor não respondeu como esperado. Tente de novo em instantes.'
  }
  return 'Não foi possível concluir a operação.'
}
