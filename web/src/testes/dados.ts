import { http, HttpResponse } from 'msw/http'
import type {
  Categoria,
  PaginaDeTransacoes,
  Resumo,
  ResumoDaCategoria,
  ResumoDiario,
  Transacao,
  Usuario,
} from '../api/tipos.ts'
import { API } from './servidor.ts'

/**
 * Dados de exemplo para os testes de tela, no mesmo formato que a API devolve.
 * Cada teste usa estes e muda só o que importa para ele.
 */
/** A pessoa logada nos testes de tela. */
export const USUARIO: Usuario = {
  id: '00000000-0000-4000-8000-0000000000f1',
  email: 'ana@email.com',
  nome: 'Ana',
  avatar: 'iniciais:cinza',
}

export const MERCADO: Categoria = {
  id: '00000000-0000-4000-8000-000000000001',
  nome: 'Mercado',
  tipo: 'DESPESA',
  sistema: true,
  icone: 'shopping-cart',
  cor: 'verde',
}

export const TRANSPORTE: Categoria = {
  id: '00000000-0000-4000-8000-000000000002',
  nome: 'Transporte',
  tipo: 'DESPESA',
  sistema: false,
  icone: 'car',
  cor: 'azul',
}

export const SALARIO: Categoria = {
  id: '00000000-0000-4000-8000-000000000003',
  nome: 'Salário',
  tipo: 'RECEITA',
  sistema: true,
  icone: 'wallet',
  cor: 'menta',
}

export const CATEGORIAS = [MERCADO, TRANSPORTE, SALARIO]

export function transacao(dados: Partial<Transacao> = {}): Transacao {
  return {
    id: '00000000-0000-4000-8000-0000000000aa',
    valor: 12.9,
    data: '2026-11-05',
    descricao: null,
    categoria: {
      id: MERCADO.id,
      nome: MERCADO.nome,
      tipo: MERCADO.tipo,
      icone: MERCADO.icone,
      cor: MERCADO.cor,
    },
    ...dados,
  }
}

/** Uma página da listagem de transações, como a API devolve (#92). */
export function pagina(
  itens: Transacao[],
  dados: Partial<Omit<PaginaDeTransacoes, 'itens'>> = {},
): PaginaDeTransacoes {
  return { itens, pagina: 1, tamanho: 50, temMais: false, ...dados }
}

/** Um resumo por categoria, como a API devolve (#95). Sem nada, é um mês sem lançamentos. */
export function resumo(
  dados: {
    de?: string | null
    ate?: string | null
    despesas?: ResumoDaCategoria[]
    receitas?: ResumoDaCategoria[]
  } = {},
): Resumo {
  const doTipo = (categorias: ResumoDaCategoria[] = []) => ({
    total: categorias.reduce((soma, c) => soma + c.total, 0),
    categorias,
  })
  return {
    de: dados.de ?? '2026-11-01',
    ate: dados.ate ?? '2026-11-30',
    despesas: doTipo(dados.despesas),
    receitas: doTipo(dados.receitas),
  }
}

/**
 * Gasto por dia do período (#189), como a API devolve: um item por dia, de `de` até `ate`, com
 * zero nos dias que não estão em `gastos` ({ '2026-11-03': 52.9 }).
 */
export function resumoDiario(
  de: string,
  ate: string,
  gastos: Record<string, number> = {},
): ResumoDiario {
  const dias: ResumoDiario['dias'] = []
  const [ano, mes, primeiro] = de.split('-').map(Number)
  const ultimo = Number(ate.slice(8))
  for (let dia = primeiro; dia <= ultimo; dia++) {
    const data = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    dias.push({ data, total: gastos[data] ?? 0 })
  }
  const total = Object.values(gastos).reduce((soma, valor) => soma + valor, 0)
  return { de, ate, total: Math.round(total * 100) / 100, dias }
}

/**
 * Respostas "de sempre" da API: as categorias acima e um mês vazio. Cada teste pode trocar
 * uma delas com `servidor.use(...)` (a resposta combinada por último é a que vale).
 */
export function respostasPadrao() {
  return [
    http.get(`${API}/categorias`, () => HttpResponse.json(CATEGORIAS)),
    http.get(`${API}/transacoes`, () => HttpResponse.json(pagina([]))),
    http.get(`${API}/resumo`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      return HttpResponse.json(
        resumo({ de: parametros.get('de'), ate: parametros.get('ate') }),
      )
    }),
    http.get(`${API}/resumo/diario`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      return HttpResponse.json(
        resumoDiario(parametros.get('de') ?? '', parametros.get('ate') ?? ''),
      )
    }),
    http.get(`${API}/saldo`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      return HttpResponse.json({
        de: parametros.get('de'),
        ate: parametros.get('ate'),
        receitas: 0,
        despesas: 0,
        saldo: 0,
      })
    }),
  ]
}

/**
 * Respostas de sessão que valem em todo teste (ligadas em configuracao.ts): quem está logado e o
 * token CSRF. Um teste que precise de outra coisa (401, token vencido) combina a sua com
 * `servidor.use(...)`, que tem prioridade.
 */
/** As estatísticas do perfil nos testes (#194). */
export const ESTATISTICAS = {
  desde: '2026-11-01',
  sequenciaDeDias: 3,
  totalDeLancamentos: 42,
  totalDeCategorias: 1,
}

export function sessaoPadrao() {
  return [
    http.get(`${API}/eu`, () => HttpResponse.json(USUARIO)),
    // Números do perfil (#194), que a tela Conta pede ao abrir.
    http.get(`${API}/eu/estatisticas`, () => HttpResponse.json(ESTATISTICAS)),
    http.get(`${API}/auth/csrf`, () =>
      HttpResponse.json({ token: 'token-de-teste', cabecalho: 'X-XSRF-TOKEN' }),
    ),
  ]
}
