/**
 * Cliente HTTP do app: o único lugar que sabe fazer pedidos para a API. As telas usam as
 * funções de categorias.ts, transacoes.ts e saldo.ts, e nunca chamam o fetch direto.
 */
import type { ErroDeCampo, Problema, TokenCsrf } from './tipos.ts'

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

/** Só estes pedidos mudam dados, então só eles precisam do token CSRF (ADR-0020). */
function alteraDados(metodo: Metodo): boolean {
  return metodo !== 'GET'
}

/** Título do 403 de token CSRF ausente ou vencido (shared/TratadorGlobalDeErros). */
const TITULO_DO_ERRO_DE_CSRF = 'Sessão desatualizada'

/* ----------------------------------------------------------------- CSRF */

/**
 * O token CSRF da sessão (ADR-0020). Fica só em memória, nunca no armazenamento do aparelho: ele
 * é pedido a `GET /auth/csrf` na primeira vez que um pedido que muda dados precisa dele, e
 * descartado quando a sessão muda (entrar, cadastrar, sair), porque o servidor troca o token.
 * O service worker tem a sua própria cópia, pelo mesmo motivo.
 */
let tokenCsrf: TokenCsrf | null = null
let buscaDoToken: Promise<TokenCsrf> | null = null

export function descartarTokenCsrf(): void {
  tokenCsrf = null
}

function obterTokenCsrf(tempoLimiteMs?: number): Promise<TokenCsrf> {
  if (tokenCsrf) return Promise.resolve(tokenCsrf)
  // Vários pedidos ao mesmo tempo esperam a mesma busca, em vez de pedir um token cada.
  buscaDoToken ??= requisicao<TokenCsrf>('GET', '/auth/csrf', { tempoLimiteMs })
    .then((token) => (tokenCsrf = token))
    .finally(() => {
      buscaDoToken = null
    })
  return buscaDoToken
}

/* --------------------------------------------------------- sessão perdida */

let aoPerderASessao: (() => void) | undefined

/**
 * Quem cuida da sessão (src/sessao) registra aqui o que fazer quando a API responde 401 no meio
 * do uso: a sessão venceu ou foi encerrada em outro lugar. No service worker nada é registrado:
 * lá, o 401 só deixa o lançamento na fila (src/fila/envio.ts).
 */
export function definirAoPerderASessao(funcao: (() => void) | undefined): void {
  aoPerderASessao = funcao
}

/** Parâmetros de consulta (?de=...&ate=...). Os valores `undefined` são ignorados. */
export type Parametros = Record<string, string | undefined>

type Opcoes = {
  corpo?: unknown
  parametros?: Parametros
  /**
   * Desiste do pedido depois deste tempo (#100). Uma rede ruim às vezes nem falha nem
   * responde; sem um limite, a tela ficaria esperando para sempre.
   */
  tempoLimiteMs?: number
}

/**
 * Faz um pedido para a API e devolve o corpo da resposta já convertido do JSON.
 * Em caso de erro, lança um ErroDaApi.
 *
 * Nos pedidos que mudam dados, manda o token CSRF; se o servidor disser que ele está vencido
 * (403 "Sessão desatualizada"), pede um novo e repete o pedido uma vez (ADR-0020). Um 401 fora
 * de `/auth` avisa quem cuida da sessão (ver `definirAoPerderASessao`).
 */
export async function requisicao<T>(
  metodo: Metodo,
  caminho: string,
  opcoes: Opcoes = {},
): Promise<T> {
  try {
    try {
      return await enviar<T>(metodo, caminho, opcoes)
    } catch (erro) {
      if (!alteraDados(metodo) || !ehErroDeCsrf(erro)) throw erro
      descartarTokenCsrf()
      return await enviar<T>(metodo, caminho, opcoes)
    }
  } catch (erro) {
    // /auth/entrar e /auth/cadastro respondem 401/403 por motivos próprios (senha errada...).
    if (
      erro instanceof ErroDaApi &&
      erro.status === 401 &&
      !caminho.startsWith('/auth/')
    ) {
      aoPerderASessao?.()
    }
    throw erro
  }
}

function ehErroDeCsrf(erro: unknown): boolean {
  return (
    erro instanceof ErroDaApi &&
    erro.status === 403 &&
    erro.titulo === TITULO_DO_ERRO_DE_CSRF
  )
}

async function enviar<T>(
  metodo: Metodo,
  caminho: string,
  { corpo, parametros, tempoLimiteMs }: Opcoes,
): Promise<T> {
  const temCorpo = corpo !== undefined
  const csrf = alteraDados(metodo) ? await obterTokenCsrf(tempoLimiteMs) : null

  let resposta: Response
  try {
    resposta = await fetch(URL_BASE + caminho + consulta(parametros), {
      method: metodo,
      headers: {
        Accept: 'application/json, application/problem+json',
        ...(temCorpo ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { [csrf.cabecalho]: csrf.token } : {}),
      },
      body: temCorpo ? JSON.stringify(corpo) : undefined,
      signal:
        tempoLimiteMs === undefined
          ? undefined
          : AbortSignal.timeout(tempoLimiteMs),
    })
  } catch {
    // O fetch só falha assim quando não houve resposta nenhuma (rede ou servidor fora do ar)
    // ou quando passou do tempo limite. Nos dois casos, para o app é "sem conexão".
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
