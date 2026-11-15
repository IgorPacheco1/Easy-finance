/**
 * Conferências feitas no app antes de enviar, só para responder na hora. A regra valendo é a do
 * servidor (Bean Validation): se as duas divergirem, a do servidor vence e o app mostra a mensagem
 * dela.
 */

const TAMANHO_MINIMO_DA_SENHA = 8
/** O BCrypt só lê os 72 primeiros bytes; por isso o servidor recusa senhas maiores (ADR-0020). */
const BYTES_MAXIMOS_DA_SENHA = 72

export function validarEmail(email: string): string | undefined {
  const limpo = email.trim()
  if (limpo === '') return 'Informe o e-mail.'
  if (!limpo.includes('@'))
    return 'Informe um e-mail válido, como ana@email.com.'
  return undefined
}

/** Para a senha que a pessoa está criando (cadastro e troca de senha). */
export function validarSenhaNova(senha: string): string | undefined {
  if (senha.length < TAMANHO_MINIMO_DA_SENHA) {
    return `Use ao menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`
  }
  if (new TextEncoder().encode(senha).length > BYTES_MAXIMOS_DA_SENHA) {
    return 'A senha é longa demais (o limite é de 72 bytes; acentos contam mais de um).'
  }
  return undefined
}

/** Para a senha que a pessoa já tem (entrar, confirmar a senha atual). */
export function validarSenhaInformada(senha: string): string | undefined {
  return senha === '' ? 'Informe a senha.' : undefined
}
