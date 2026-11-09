import { http, HttpResponse } from 'msw/http'
import type { Categoria, PaginaDeTransacoes, Transacao } from '../api/tipos.ts'
import { API } from './servidor.ts'

/**
 * Dados de exemplo para os testes de tela, no mesmo formato que a API devolve.
 * Cada teste usa estes e muda só o que importa para ele.
 */
export const MERCADO: Categoria = {
  id: '00000000-0000-4000-8000-000000000001',
  nome: 'Mercado',
  tipo: 'DESPESA',
  sistema: true,
}

export const TRANSPORTE: Categoria = {
  id: '00000000-0000-4000-8000-000000000002',
  nome: 'Transporte',
  tipo: 'DESPESA',
  sistema: false,
}

export const SALARIO: Categoria = {
  id: '00000000-0000-4000-8000-000000000003',
  nome: 'Salário',
  tipo: 'RECEITA',
  sistema: true,
}

export const CATEGORIAS = [MERCADO, TRANSPORTE, SALARIO]

export function transacao(dados: Partial<Transacao> = {}): Transacao {
  return {
    id: '00000000-0000-4000-8000-0000000000aa',
    valor: 12.9,
    data: '2026-11-05',
    descricao: null,
    categoria: { id: MERCADO.id, nome: MERCADO.nome, tipo: MERCADO.tipo },
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

/**
 * Respostas "de sempre" da API: as categorias acima e um mês vazio. Cada teste pode trocar
 * uma delas com `servidor.use(...)` (a resposta combinada por último é a que vale).
 */
export function respostasPadrao() {
  return [
    http.get(`${API}/categorias`, () => HttpResponse.json(CATEGORIAS)),
    http.get(`${API}/transacoes`, () => HttpResponse.json(pagina([]))),
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
