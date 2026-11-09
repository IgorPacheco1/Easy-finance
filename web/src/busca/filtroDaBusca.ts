import type { TipoCategoria } from '../api/tipos.ts'
import type { FiltroDeTransacoes } from '../api/transacoes.ts'
import { valorParaApi } from '../lancamento/valor.ts'

/**
 * O que a pessoa escolheu na tela de busca (#94). Tudo em texto, como fica nos campos e no
 * endereço da página; texto vazio quer dizer "sem esse filtro".
 *
 * Os valores ficam em centavos, só com dígitos ("5290" = R$ 52,90), no mesmo estilo
 * "caixa registradora" da tela de lançamento (lancamento/valor.ts).
 */
export type FiltroDaBusca = {
  descricao: string
  categoriaId: string
  tipo: TipoCategoria | ''
  valorMinimo: string
  valorMaximo: string
  /** Datas no formato da API ("2026-11-01"). */
  de: string
  ate: string
}

export const FILTRO_VAZIO: FiltroDaBusca = {
  descricao: '',
  categoriaId: '',
  tipo: '',
  valorMinimo: '',
  valorMaximo: '',
  de: '',
  ate: '',
}

const DATA = /^\d{4}-\d{2}-\d{2}$/
const VALOR_DO_ENDERECO = /^\d{1,9}(\.\d{1,2})?$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Valor do endereço ("52.9") em centavos ("5290"). Valor estranho vira "sem filtro". */
function centavosDoEndereco(texto: string | null): string {
  if (!texto || !VALOR_DO_ENDERECO.test(texto)) return ''
  const centavos = Math.round(Number(texto) * 100)
  return centavos > 0 ? String(centavos) : ''
}

/** Centavos ("5290") no formato do endereço ("52.90"). */
function centavosParaEndereco(centavos: string): string {
  return (Number(centavos) / 100).toFixed(2)
}

/**
 * Lê o filtro do endereço (/buscar?descricao=uber&tipo=DESPESA). Assim, voltar, recarregar ou
 * compartilhar o endereço mantém a busca. O que vier fora do formato é ignorado, em vez de
 * virar erro na tela: o endereço pode ter sido digitado ou cortado.
 */
export function lerDoEndereco(parametros: URLSearchParams): FiltroDaBusca {
  const tipo = parametros.get('tipo')
  const texto = (nome: string, formato: RegExp) => {
    const valor = parametros.get(nome) ?? ''
    return formato.test(valor) ? valor : ''
  }
  return {
    descricao: (parametros.get('descricao') ?? '').slice(0, 255),
    categoriaId: texto('categoriaId', UUID),
    tipo: tipo === 'RECEITA' || tipo === 'DESPESA' ? tipo : '',
    valorMinimo: centavosDoEndereco(parametros.get('valorMinimo')),
    valorMaximo: centavosDoEndereco(parametros.get('valorMaximo')),
    de: texto('de', DATA),
    ate: texto('ate', DATA),
  }
}

/** O filtro para o endereço da página, só com o que foi preenchido. */
export function paraEndereco(filtro: FiltroDaBusca): Record<string, string> {
  const parametros: Record<string, string> = {}
  const descricao = filtro.descricao.trim()
  if (descricao) parametros.descricao = descricao
  if (filtro.categoriaId) parametros.categoriaId = filtro.categoriaId
  if (filtro.tipo) parametros.tipo = filtro.tipo
  if (filtro.valorMinimo)
    parametros.valorMinimo = centavosParaEndereco(filtro.valorMinimo)
  if (filtro.valorMaximo)
    parametros.valorMaximo = centavosParaEndereco(filtro.valorMaximo)
  if (filtro.de) parametros.de = filtro.de
  if (filtro.ate) parametros.ate = filtro.ate
  return parametros
}

/**
 * O filtro no formato da API. O período só vai quando as duas datas estão preenchidas, porque a
 * API pede as duas juntas; com uma só, a tela avisa (ver `periodoIncompleto`).
 */
export function paraApi(filtro: FiltroDaBusca): FiltroDeTransacoes {
  const descricao = filtro.descricao.trim()
  return {
    periodo:
      filtro.de && filtro.ate ? { de: filtro.de, ate: filtro.ate } : undefined,
    categoriaId: filtro.categoriaId || undefined,
    tipo: filtro.tipo || undefined,
    descricao: descricao || undefined,
    valorMinimo: filtro.valorMinimo
      ? valorParaApi(filtro.valorMinimo)
      : undefined,
    valorMaximo: filtro.valorMaximo
      ? valorParaApi(filtro.valorMaximo)
      : undefined,
  }
}

/** Só uma das datas preenchida: o período não é aplicado até a outra ser escolhida. */
export function periodoIncompleto(filtro: FiltroDaBusca): boolean {
  return Boolean(filtro.de) !== Boolean(filtro.ate)
}

/** Quantos filtros do painel estão ativos (sem contar o texto), para mostrar no botão. */
export function quantosFiltros(filtro: FiltroDaBusca): number {
  return [
    filtro.categoriaId,
    filtro.tipo,
    filtro.valorMinimo || filtro.valorMaximo,
    filtro.de || filtro.ate,
  ].filter(Boolean).length
}
