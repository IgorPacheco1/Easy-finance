import { formatarData, somarAnos } from '../formatacao/datas.ts'

/** O que o formulário de lançamento tem preenchido. */
export type DadosDoLancamento = {
  /** Valor em centavos, só dígitos ("5290" = R$ 52,90). */
  digitos: string
  categoriaId: string | null
  data: string
  descricao: string
}

/** Erros por campo, com os mesmos nomes de campo e mensagens que a API usa. */
export type ErrosDoLancamento = Partial<
  Record<'valor' | 'categoriaId' | 'data' | 'descricao', string>
>

export const TAMANHO_MAXIMO_DA_DESCRICAO = 255

/**
 * Confere no aparelho as mesmas regras que a API confere (#20), para avisar antes de enviar.
 * A API continua sendo quem decide: se ela recusar algo, a mensagem dela aparece no campo.
 */
export function validarLancamento(
  dados: DadosDoLancamento,
  hoje: string,
): ErrosDoLancamento {
  const erros: ErrosDoLancamento = {}

  if (!dados.digitos || Number(dados.digitos) === 0) {
    erros.valor = 'O valor deve ser maior que zero.'
  }
  if (!dados.categoriaId) {
    erros.categoriaId = 'A categoria é obrigatória.'
  }
  const minima = somarAnos(hoje, -1)
  const maxima = somarAnos(hoje, 1)
  if (!dados.data) {
    erros.data = 'A data é obrigatória.'
  } else if (dados.data < minima || dados.data > maxima) {
    // Datas no formato AAAA-MM-DD podem ser comparadas como texto.
    erros.data = `A data deve estar entre ${formatarData(minima)} e ${formatarData(maxima)}.`
  }
  if (dados.descricao.length > TAMANHO_MAXIMO_DA_DESCRICAO) {
    erros.descricao = 'A descrição deve ter no máximo 255 caracteres.'
  }

  return erros
}
