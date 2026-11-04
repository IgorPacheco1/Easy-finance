/**
 * Valor digitado no estilo "caixa registradora": só números, que entram pela direita.
 * "5" vira 0,05; "52" vira 0,52; "5290" vira 52,90. Assim não é preciso digitar vírgula, e
 * não há como digitar um valor inválido (letras ou mais de 2 casas decimais).
 *
 * O valor é guardado como texto só com dígitos (os centavos), e não como número, para não
 * haver erro de arredondamento enquanto o usuário digita.
 */

/**
 * Até 11 dígitos: R$ 999.999.999,99. A API aceita mais (17 dígitos antes da vírgula), mas
 * números maiores perderiam precisão no JavaScript, e nenhum lançamento pessoal chega perto.
 */
export const MAXIMO_DE_DIGITOS = 11

/**
 * Lê o que está no campo e devolve só os dígitos, sem zeros à esquerda.
 * Se passar do limite, mantém o valor anterior (o dígito a mais é ignorado).
 */
export function digitosDoCampo(texto: string, anterior: string): string {
  const digitos = texto.replace(/\D/g, '').replace(/^0+/, '')
  return digitos.length > MAXIMO_DE_DIGITOS ? anterior : digitos
}

const formatoDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Mostra os dígitos como valor: "5290" vira "52,90"; "" vira "0,00". */
export function formatarDigitos(digitos: string): string {
  return formatoDecimal.format(Number(digitos || '0') / 100)
}

/**
 * Converte para o número que a API recebe: "5290" vira 52.9.
 * Dividir um inteiro de até 11 dígitos por 100 dá exatamente o decimal com 2 casas
 * quando convertido para JSON ("52.9"), que a API lê como BigDecimal.
 */
export function valorParaApi(digitos: string): number {
  return Number(digitos || '0') / 100
}
