import { requisicao } from './cliente.ts'
import type {
  Categoria,
  CategoriaEditada,
  NovaCategoria,
  TipoCategoria,
} from './tipos.ts'

/** Lista as categorias; com `tipo`, só as de receita ou só as de despesa. */
export function listarCategorias(tipo?: TipoCategoria): Promise<Categoria[]> {
  return requisicao('GET', '/categorias', { parametros: { tipo } })
}

export function buscarCategoria(id: string): Promise<Categoria> {
  return requisicao('GET', `/categorias/${encodeURIComponent(id)}`)
}

/** Cria uma categoria personalizada. Nome repetido gera ErroDaApi com status 409. */
export function criarCategoria(nova: NovaCategoria): Promise<Categoria> {
  return requisicao('POST', '/categorias', { corpo: nova })
}

/** Renomeia uma categoria (o tipo não muda). Categoria do sistema gera status 409. */
export function atualizarCategoria(
  id: string,
  editada: CategoriaEditada,
): Promise<Categoria> {
  return requisicao('PUT', `/categorias/${encodeURIComponent(id)}`, {
    corpo: editada,
  })
}

/** Exclui uma categoria. Categoria do sistema ou com transações gera status 409. */
export function excluirCategoria(id: string): Promise<void> {
  return requisicao('DELETE', `/categorias/${encodeURIComponent(id)}`)
}
