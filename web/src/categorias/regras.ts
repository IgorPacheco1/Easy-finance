import type { Categoria } from '../api/tipos.ts'

export const TAMANHO_MAXIMO_DO_NOME = 50

const ordemAlfabetica = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/** Ordena pelo nome, do jeito que um brasileiro espera ("Água" junto do "A", sem diferenciar maiúsculas). */
export function ordenarPorNome(categorias: Categoria[]): Categoria[] {
  return [...categorias].sort((a, b) => ordemAlfabetica.compare(a.nome, b.nome))
}

/**
 * Confere o nome antes de enviar, com as mesmas regras e mensagens da API (#17):
 * obrigatório, até 50 caracteres e único sem diferenciar maiúsculas.
 * `idEmEdicao` é a própria categoria, que pode manter o nome (ou só trocar maiúsculas).
 */
export function validarNome(
  nome: string,
  existentes: Categoria[],
  idEmEdicao?: string,
): string | undefined {
  const limpo = nome.trim()
  if (!limpo) {
    return 'O nome é obrigatório.'
  }
  if (limpo.length > TAMANHO_MAXIMO_DO_NOME) {
    return 'O nome deve ter no máximo 50 caracteres.'
  }
  const repetida = existentes.find(
    (c) => c.id !== idEmEdicao && c.nome.toLowerCase() === limpo.toLowerCase(),
  )
  if (repetida) {
    return `Já existe uma categoria chamada "${repetida.nome}".`
  }
  return undefined
}
