import { requisicao } from './cliente.ts'
import type { Estatisticas, PerfilEditado, Usuario } from './tipos.ts'

/** Muda o nome e/ou o avatar de quem está logado (#193). Devolve o usuário atualizado. */
export function atualizarPerfil(perfil: PerfilEditado): Promise<Usuario> {
  return requisicao('PATCH', '/eu/perfil', { corpo: perfil })
}

/**
 * Estatísticas do perfil (#194). Vai junto o fuso do aparelho ("America/Sao_Paulo"), porque a
 * sequência de dias depende de que dia é hoje para quem usa, e o servidor roda em UTC.
 */
export function buscarEstatisticas(
  fuso: string = fusoDoAparelho(),
): Promise<Estatisticas> {
  return requisicao('GET', '/eu/estatisticas', { parametros: { fuso } })
}

/** O fuso do aparelho, pelo nome. Se o navegador não disser, São Paulo. */
export function fusoDoAparelho(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
}
