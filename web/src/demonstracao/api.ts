import { http, HttpResponse, type HttpHandler } from 'msw'
import type {
  Categoria,
  CategoriaEditada,
  Credenciais,
  NovaCategoria,
  NovaTransacao,
  Resumo,
  ResumoDaCategoria,
  Transacao,
  TransacaoEditada,
} from '../api/tipos.ts'
import { APARENCIA_PADRAO } from '../categorias/aparencia.ts'
import { dataLocal, paraTextoDaApi } from '../formatacao/datas.ts'
import { criarBancoDeExemplo, type BancoDaDemonstracao } from './banco.ts'

/**
 * A API da demonstração (#162): as mesmas rotas e respostas da API de verdade, mas respondidas
 * no próprio navegador pelo MSW, a partir do banco na memória (banco.ts). As regras que o app
 * mostra para a pessoa (nome repetido, categoria em uso, lançamento excluído) seguem as da API.
 *
 * O `*` no começo aceita qualquer endereço antes de /api/v1: o do GitHub Pages e o dos testes.
 */
const API = '*/api/v1'

/** Uma resposta de erro no formato da API (ProblemDetail, RFC 9457). */
function problema(
  status: number,
  titulo: string,
  detalhe: string,
  erros?: { campo: string; mensagem: string }[],
) {
  return HttpResponse.json(
    { status, title: titulo, detail: detalhe, ...(erros ? { erros } : {}) },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

const semConteudo = () => new HttpResponse(null, { status: 204 })

const naoEncontrada = () =>
  problema(
    404,
    'Transação não encontrada',
    'Não existe transação com o id informado.',
  )

const categoriaNaoEncontrada = () =>
  problema(
    404,
    'Categoria não encontrada',
    'Não existe categoria com o id informado.',
  )

const categoriaInvalida = () =>
  problema(400, 'Dados inválidos', 'Confira os campos.', [
    { campo: 'categoriaId', mensagem: 'Categoria não encontrada.' },
  ])

const mesmoNome = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'pt-BR', { sensitivity: 'base' }) === 0

const porNome = (a: Categoria, b: Categoria) =>
  a.nome.localeCompare(b.nome, 'pt-BR')

/** Lê um número da consulta; `undefined` se não veio. */
function numero(parametros: URLSearchParams, nome: string) {
  const texto = parametros.get(nome)
  return texto === null ? undefined : Number(texto)
}

export function respostasDaDemonstracao(
  banco: BancoDaDemonstracao = criarBancoDeExemplo(),
): HttpHandler[] {
  const categoria = (id: string) => banco.categorias.find((c) => c.id === id)
  const transacao = (id: string) => banco.transacoes.find((t) => t.id === id)
  const resumoDaCategoria = (c: Categoria) => ({
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    icone: c.icone,
    cor: c.cor,
  })
  const exigirLogin = () =>
    banco.logado
      ? null
      : problema(401, 'Não autenticado', 'Entre na sua conta para continuar.')

  /** Transações do período (pontas incluídas). */
  function doPeriodo(parametros: URLSearchParams): Transacao[] {
    const de = parametros.get('de')
    const ate = parametros.get('ate')
    return banco.transacoes.filter(
      (t) => (!de || t.data >= de) && (!ate || t.data <= ate),
    )
  }

  /** Ordem da lista da API: data mais recente primeiro; no mesmo dia, a criada por último. */
  function maisRecentesPrimeiro(a: Transacao, b: Transacao) {
    if (a.data !== b.data) return a.data < b.data ? 1 : -1
    return (
      (banco.ordemDeCriacao.get(b.id) ?? 0) -
      (banco.ordemDeCriacao.get(a.id) ?? 0)
    )
  }

  return [
    // ---- Sessão: a demonstração já começa logada (USUARIO_DE_EXEMPLO) ----
    http.get(
      `${API}/eu`,
      () => exigirLogin() ?? HttpResponse.json(banco.usuario),
    ),
    http.get(`${API}/auth/csrf`, () =>
      HttpResponse.json({ token: 'demonstracao', cabecalho: 'X-XSRF-TOKEN' }),
    ),
    // Entrar e criar conta aceitam qualquer e-mail e senha: não há contas de verdade aqui.
    ...(['entrar', 'cadastro'] as const).map((rota) =>
      http.post(`${API}/auth/${rota}`, async ({ request }) => {
        const { email } = (await request.json()) as Credenciais
        banco.usuario = { ...banco.usuario, email }
        banco.logado = true
        return HttpResponse.json(banco.usuario, {
          status: rota === 'cadastro' ? 201 : 200,
        })
      }),
    ),
    http.post(`${API}/auth/sair`, () => {
      banco.logado = false
      return semConteudo()
    }),
    http.put(`${API}/eu/senha`, () => exigirLogin() ?? semConteudo()),
    // Excluir a conta sai e põe os dados de exemplo de volta, para a próxima pessoa que entrar.
    http.delete(`${API}/eu`, () => {
      Object.assign(banco, criarBancoDeExemplo(), { logado: false })
      return semConteudo()
    }),

    // ---- Categorias ----
    http.get(`${API}/categorias`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      const tipo = parametros.get('tipo')
      const lista = banco.categorias.filter((c) => !tipo || c.tipo === tipo)
      if (parametros.get('ordem') === 'USO') {
        // As mais usadas nos últimos 90 dias primeiro (#97); empate, ordem alfabética.
        const inicio = new Date()
        inicio.setDate(inicio.getDate() - 90)
        const desde = paraTextoDaApi(inicio)
        const usos = (c: Categoria) =>
          banco.transacoes.filter(
            (t) => t.categoria.id === c.id && t.data >= desde,
          ).length
        return HttpResponse.json(
          [...lista].sort((a, b) => usos(b) - usos(a) || porNome(a, b)),
        )
      }
      return HttpResponse.json(
        [...lista].sort(
          (a, b) => a.tipo.localeCompare(b.tipo) || porNome(a, b),
        ),
      )
    }),
    http.get(`${API}/categorias/:id`, ({ params }) => {
      const encontrada = categoria(String(params.id))
      return encontrada
        ? HttpResponse.json(encontrada)
        : categoriaNaoEncontrada()
    }),
    http.post(`${API}/categorias`, async ({ request }) => {
      const nova = (await request.json()) as NovaCategoria
      if (banco.categorias.some((c) => mesmoNome(c.nome, nova.nome))) {
        return nomeRepetido(nova.nome)
      }
      const criada: Categoria = {
        id: crypto.randomUUID(),
        nome: nova.nome.trim(),
        tipo: nova.tipo,
        sistema: false,
        // Como na API (#185): sem escolher, a categoria nasce com a aparência padrão.
        icone: nova.icone ?? APARENCIA_PADRAO.icone,
        cor: nova.cor ?? APARENCIA_PADRAO.cor,
      }
      banco.categorias.push(criada)
      return HttpResponse.json(criada, { status: 201 })
    }),
    http.put(`${API}/categorias/:id`, async ({ request, params }) => {
      const existente = categoria(String(params.id))
      if (!existente) return categoriaNaoEncontrada()
      if (existente.sistema) return categoriaDoSistema()
      const { nome, icone, cor } = (await request.json()) as CategoriaEditada
      if (
        banco.categorias.some(
          (c) => c.id !== existente.id && mesmoNome(c.nome, nome),
        )
      ) {
        return nomeRepetido(nome)
      }
      existente.nome = nome.trim()
      // O que não vier fica como está, como na API (#185).
      existente.icone = icone ?? existente.icone
      existente.cor = cor ?? existente.cor
      // Os lançamentos mostram o nome novo, como na API (eles guardam só o id da categoria).
      banco.transacoes = banco.transacoes.map((t) =>
        t.categoria.id === existente.id
          ? { ...t, categoria: resumoDaCategoria(existente) }
          : t,
      )
      return HttpResponse.json(existente)
    }),
    http.delete(`${API}/categorias/:id`, ({ params }) => {
      const existente = categoria(String(params.id))
      if (!existente) return categoriaNaoEncontrada()
      if (existente.sistema) return categoriaDoSistema()
      if (banco.transacoes.some((t) => t.categoria.id === existente.id)) {
        return problema(
          409,
          'Categoria em uso',
          'A categoria tem transações vinculadas e não pode ser excluída.',
        )
      }
      banco.categorias = banco.categorias.filter((c) => c !== existente)
      return semConteudo()
    }),

    // ---- Transações ----
    http.get(`${API}/transacoes`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      const categoriaId = parametros.get('categoriaId')
      const tipo = parametros.get('tipo')
      const descricao = parametros.get('descricao')?.toLowerCase()
      const minimo = numero(parametros, 'valorMinimo')
      const maximo = numero(parametros, 'valorMaximo')
      const pagina = numero(parametros, 'pagina') ?? 1
      const tamanho = numero(parametros, 'tamanho') ?? 20

      const filtradas = doPeriodo(parametros)
        .filter(
          (t) =>
            (!categoriaId || t.categoria.id === categoriaId) &&
            (!tipo || t.categoria.tipo === tipo) &&
            (!descricao ||
              (t.descricao ?? '').toLowerCase().includes(descricao)) &&
            (minimo === undefined || t.valor >= minimo) &&
            (maximo === undefined || t.valor <= maximo),
        )
        .sort(maisRecentesPrimeiro)
      const inicio = (pagina - 1) * tamanho
      return HttpResponse.json({
        itens: filtradas.slice(inicio, inicio + tamanho),
        pagina,
        tamanho,
        temMais: filtradas.length > inicio + tamanho,
      })
    }),
    http.get(`${API}/transacoes/:id`, ({ params }) => {
      const encontrada = transacao(String(params.id))
      return encontrada ? HttpResponse.json(encontrada) : naoEncontrada()
    }),
    http.post(`${API}/transacoes`, async ({ request }) => {
      const nova = (await request.json()) as NovaTransacao
      const id = nova.id ?? crypto.randomUUID()
      if (banco.excluidas.has(id)) {
        return problema(
          410,
          'Transação excluída',
          'Este lançamento foi excluído e não pode ser enviado de novo.',
        )
      }
      // Mesmo id de novo (reenvio): devolve a que já existe, sem duplicar (#19).
      const existente = transacao(id)
      if (existente) return HttpResponse.json(existente)
      const escolhida = categoria(nova.categoriaId)
      if (!escolhida) return categoriaInvalida()
      const criada: Transacao = {
        id,
        valor: nova.valor,
        data: nova.data,
        descricao: nova.descricao?.trim() || null,
        categoria: resumoDaCategoria(escolhida),
      }
      banco.transacoes.push(criada)
      banco.ordemDeCriacao.set(id, banco.ordemDeCriacao.size)
      return HttpResponse.json(criada, { status: 201 })
    }),
    http.put(`${API}/transacoes/:id`, async ({ request, params }) => {
      const existente = transacao(String(params.id))
      if (!existente) return naoEncontrada()
      const editada = (await request.json()) as TransacaoEditada
      const escolhida = categoria(editada.categoriaId)
      if (!escolhida) return categoriaInvalida()
      Object.assign(existente, {
        valor: editada.valor,
        data: editada.data,
        descricao: editada.descricao?.trim() || null,
        categoria: resumoDaCategoria(escolhida),
      })
      return HttpResponse.json(existente)
    }),
    http.delete(`${API}/transacoes/:id`, ({ params }) => {
      const existente = transacao(String(params.id))
      if (!existente) return naoEncontrada()
      banco.transacoes = banco.transacoes.filter((t) => t !== existente)
      banco.excluidas.add(existente.id)
      return semConteudo()
    }),

    // ---- Saldo e resumo do período ----
    http.get(`${API}/saldo`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      const doTipo = (tipo: Categoria['tipo']) =>
        somar(doPeriodo(parametros).filter((t) => t.categoria.tipo === tipo))
      const receitas = doTipo('RECEITA')
      const despesas = doTipo('DESPESA')
      return HttpResponse.json({
        de: parametros.get('de'),
        ate: parametros.get('ate'),
        receitas,
        despesas,
        saldo: centavos(receitas - despesas),
      })
    }),
    http.get(`${API}/resumo`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      const periodo = doPeriodo(parametros)
      const resposta: Resumo = {
        de: parametros.get('de') ?? '',
        ate: parametros.get('ate') ?? '',
        receitas: resumoDoTipo(
          periodo.filter((t) => t.categoria.tipo === 'RECEITA'),
        ),
        despesas: resumoDoTipo(
          periodo.filter((t) => t.categoria.tipo === 'DESPESA'),
        ),
      }
      return HttpResponse.json(resposta)
    }),

    // Gasto por dia (#189): as despesas de cada dia do período, com zero nos dias sem gasto.
    http.get(`${API}/resumo/diario`, ({ request }) => {
      const parametros = new URL(request.url).searchParams
      const de = parametros.get('de') ?? ''
      const ate = parametros.get('ate') ?? ''
      const despesas = doPeriodo(parametros).filter(
        (t) => t.categoria.tipo === 'DESPESA',
      )
      const dias = []
      for (
        let dia = dataLocal(de);
        paraTextoDaApi(dia) <= ate;
        dia.setDate(dia.getDate() + 1)
      ) {
        const data = paraTextoDaApi(dia)
        dias.push({
          data,
          total: somar(despesas.filter((t) => t.data === data)),
        })
      }
      return HttpResponse.json({ de, ate, total: somar(despesas), dias })
    }),

    // Qualquer outro pedido para a API para aqui, e nunca segue para a internet.
    http.all(`${API}/*`, () =>
      problema(
        501,
        'Indisponível na demonstração',
        'Esta parte do app não funciona na demonstração.',
      ),
    ),
  ]
}

function nomeRepetido(nome: string) {
  return problema(
    409,
    'Nome de categoria já existe',
    `Já existe uma categoria chamada "${nome.trim()}".`,
  )
}

function categoriaDoSistema() {
  return problema(
    409,
    'Categoria do sistema',
    'Categorias do sistema não podem ser alteradas nem excluídas.',
  )
}

/** Arredonda para centavos (somar números quebrados deixa "sobras" como 0.30000000000000004). */
function centavos(valor: number): number {
  return Math.round(valor * 100) / 100
}

function somar(transacoes: Transacao[]): number {
  return centavos(transacoes.reduce((soma, t) => soma + t.valor, 0))
}

/** Total por categoria, da que mais somou para a que menos somou, com o percentual do tipo. */
function resumoDoTipo(transacoes: Transacao[]) {
  const total = somar(transacoes)
  const porCategoria = new Map<string, Transacao[]>()
  for (const t of transacoes) {
    porCategoria.set(t.categoria.id, [
      ...(porCategoria.get(t.categoria.id) ?? []),
      t,
    ])
  }
  const categorias: ResumoDaCategoria[] = [...porCategoria.values()]
    .map((daCategoria) => {
      const totalDaCategoria = somar(daCategoria)
      return {
        id: daCategoria[0].categoria.id,
        nome: daCategoria[0].categoria.nome,
        icone: daCategoria[0].categoria.icone,
        cor: daCategoria[0].categoria.cor,
        total: totalDaCategoria,
        quantidade: daCategoria.length,
        percentual: Math.round((totalDaCategoria / total) * 1000) / 10,
      }
    })
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
  return { total, categorias }
}
