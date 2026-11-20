import type { Categoria, Transacao, Usuario } from '../api/tipos.ts'
import { paraTextoDaApi } from '../formatacao/datas.ts'

/**
 * Os "dados do servidor" da demonstração (#162), guardados só na memória da aba: recarregar a
 * página volta ao começo. Nada sai do navegador.
 */
export type BancoDaDemonstracao = {
  usuario: Usuario
  logado: boolean
  categorias: Categoria[]
  transacoes: Transacao[]
  /** Ids de transações excluídas: reenviar uma delas dá 410, como na API de verdade. */
  excluidas: Set<string>
  /** Quando a transação foi criada, para desempatar a ordem da lista (como o `criadoEm` da API). */
  ordemDeCriacao: Map<string, number>
}

export const USUARIO_DE_EXEMPLO: Usuario = {
  id: 'demonstracao-usuario',
  email: 'pessoa@exemplo.com',
}

/**
 * As mesmas categorias do sistema que a API cria para toda conta (migration V2), com o ícone e a
 * cor da migration V7 (#185): nome, ícone e cor.
 */
const CATEGORIAS_DO_SISTEMA: Record<
  Categoria['tipo'],
  [string, string, string][]
> = {
  DESPESA: [
    ['Moradia', 'house', 'coral'],
    ['Contas da casa', 'zap', 'amarelo'],
    ['Mercado', 'shopping-cart', 'verde'],
    ['Alimentação fora', 'utensils', 'laranja'],
    ['Transporte', 'car', 'azul'],
    ['Saúde', 'heart-pulse', 'rosa'],
    ['Educação', 'graduation-cap', 'anil'],
    ['Vestuário', 'shirt', 'roxo'],
    ['Cuidados pessoais', 'sparkles', 'rosa'],
    ['Lazer', 'ticket', 'roxo'],
    ['Assinaturas', 'repeat', 'ciano'],
    ['Dívidas e empréstimos', 'landmark', 'coral'],
    ['Impostos e taxas', 'receipt', 'cinza'],
    ['Outras despesas', 'circle-ellipsis', 'cinza'],
  ],
  RECEITA: [
    ['Salário', 'wallet', 'menta'],
    ['Renda extra', 'briefcase', 'turquesa'],
    ['Benefícios', 'gift', 'amarelo'],
    ['Rendimentos', 'trending-up', 'verde'],
    ['Outras receitas', 'circle-plus', 'cinza'],
  ],
}

/** "Alimentação fora" vira "categoria-alimentacao-fora". */
function idDaCategoria(nome: string): string {
  const semAcento = nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
  return `categoria-${semAcento.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

/** Lançamentos de um mês típico: dia, valor, categoria e descrição. */
const MES_TIPICO: [number, number, string, string | null][] = [
  [1, 92.5, 'Saúde', 'Farmácia'],
  [3, 312.4, 'Mercado', 'Compra do mês'],
  [5, 4800, 'Salário', 'Salário'],
  [8, 120, 'Transporte', 'Recarga do cartão de ônibus'],
  [10, 1450, 'Moradia', 'Aluguel'],
  [12, 189.9, 'Contas da casa', 'Luz e água'],
  [14, 64.9, 'Alimentação fora', 'Pizza com amigos'],
  [17, 86.3, 'Mercado', 'Feira'],
  [20, 39.9, 'Assinaturas', 'Streaming'],
  [22, 75, 'Lazer', 'Cinema'],
  [25, 350, 'Renda extra', 'Site para um cliente'],
  [27, 145.8, 'Mercado', null],
]

/** Cada mês um pouco diferente do outro; salário e aluguel não mudam. */
const VARIACAO_POR_MES = [1, 0.93, 1.08]
const VALORES_FIXOS = new Set(['Salário', 'Moradia'])

/**
 * Cria o banco com os dados de exemplo: as categorias do sistema e três meses de lançamentos
 * (o atual, até hoje, e os dois anteriores). Os meses são contados a partir de `agora`, para a
 * demonstração ter dados em qualquer época.
 */
export function criarBancoDeExemplo(
  agora: Date = new Date(),
): BancoDaDemonstracao {
  const categorias: Categoria[] = (['DESPESA', 'RECEITA'] as const).flatMap(
    (tipo) =>
      CATEGORIAS_DO_SISTEMA[tipo].map(([nome, icone, cor]) => ({
        id: idDaCategoria(nome),
        nome,
        tipo,
        sistema: true,
        icone,
        cor,
      })),
  )
  const porNome = new Map(categorias.map((c) => [c.nome, c]))

  const transacoes: Transacao[] = []
  VARIACAO_POR_MES.forEach((variacao, mesesAtras) => {
    MES_TIPICO.forEach(([dia, valor, nomeDaCategoria, descricao], indice) => {
      const data = new Date(
        agora.getFullYear(),
        agora.getMonth() - mesesAtras,
        dia,
      )
      if (data > agora) return // nada no futuro
      const categoria = porNome.get(nomeDaCategoria)!
      transacoes.push({
        id: `demonstracao-${mesesAtras}-${indice}`,
        valor: VALORES_FIXOS.has(nomeDaCategoria)
          ? valor
          : Math.round(valor * variacao * 100) / 100,
        data: paraTextoDaApi(data),
        descricao,
        categoria: {
          id: categoria.id,
          nome: categoria.nome,
          tipo: categoria.tipo,
        },
      })
    })
  })

  return {
    usuario: USUARIO_DE_EXEMPLO,
    logado: true,
    categorias,
    transacoes,
    excluidas: new Set(),
    ordemDeCriacao: new Map(transacoes.map((t, i) => [t.id, i])),
  }
}
