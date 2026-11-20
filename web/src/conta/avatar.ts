import {
  APARENCIA_PADRAO,
  ehCorDeCategoria,
  type CorDeCategoria,
} from '../categorias/aparencia.ts'

/**
 * As iniciais do avatar (#194): a primeira letra do primeiro e do último nome ("Ana Souza" vira
 * "AS"; "Ana" vira "A"). Sem nome (conta de antes da V8), a primeira letra do e-mail.
 */
export function iniciaisDe(nome: string | null, email: string): string {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return email.charAt(0).toUpperCase()
  const primeira = partes[0].charAt(0)
  const ultima = partes.length > 1 ? partes[partes.length - 1].charAt(0) : ''
  return (primeira + ultima).toUpperCase()
}

/** A cor do avatar "iniciais:<cor>" (ADR-0032). Formato desconhecido vira cinza. */
export function corDoAvatar(avatar: string): CorDeCategoria {
  const [tipo, cor] = avatar.split(':')
  return tipo === 'iniciais' && ehCorDeCategoria(cor)
    ? cor
    : APARENCIA_PADRAO.cor
}

/** O avatar no formato da API para uma cor. */
export function avatarDaCor(cor: CorDeCategoria): string {
  return `iniciais:${cor}`
}
