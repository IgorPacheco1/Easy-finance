import { descartarTokenCsrf, requisicao } from './cliente.ts'
import type {
  Credenciais,
  ExclusaoDeConta,
  NovoCadastro,
  TrocaDeSenha,
  Usuario,
} from './tipos.ts'

/**
 * Entrar, sair e a conta da pessoa (M5, ADR-0020 e ADR-0027). A sessão vive no servidor e vai e
 * volta num cookie que o navegador cuida sozinho; o app só guarda quem está logado (ver
 * src/sessao).
 */

/**
 * Quem está logado agora. Sem sessão, ErroDaApi com status 401; sem conexão, status 0. Usado
 * ao abrir o app para saber se a sessão ainda vale.
 */
export function buscarUsuarioAtual(tempoLimiteMs?: number): Promise<Usuario> {
  return requisicao('GET', '/eu', { tempoLimiteMs })
}

/**
 * Entra na conta. 401: e-mail ou senha incorretos (a mesma resposta nos dois casos); 429: muitas
 * tentativas, com o tempo de espera no `detalhe`.
 */
export async function entrar(credenciais: Credenciais): Promise<Usuario> {
  const usuario = await requisicao<Usuario>('POST', '/auth/entrar', {
    corpo: credenciais,
  })
  // O servidor troca o token CSRF ao entrar: o que estava guardado deixou de valer.
  descartarTokenCsrf()
  return usuario
}

/** Cria a conta e já entra nela. E-mail repetido gera ErroDaApi com status 409. */
export async function cadastrar(dados: NovoCadastro): Promise<Usuario> {
  const usuario = await requisicao<Usuario>('POST', '/auth/cadastro', {
    corpo: dados,
  })
  descartarTokenCsrf()
  return usuario
}

/** Encerra a sessão no servidor. Sem sessão, também dá certo (204). */
export async function sair(): Promise<void> {
  await requisicao<void>('POST', '/auth/sair')
  descartarTokenCsrf()
}

/**
 * Troca a senha. Senha atual errada gera status 400 no campo `senhaAtual`; muitas tentativas,
 * 429. As outras sessões da conta são encerradas; esta continua.
 */
export function trocarSenha(troca: TrocaDeSenha): Promise<void> {
  return requisicao('PUT', '/eu/senha', { corpo: troca })
}

/**
 * Exclui a conta e todos os dados dela, sem volta. Senha errada gera status 400 no campo `senha`;
 * muitas tentativas, 429.
 */
export async function excluirConta(exclusao: ExclusaoDeConta): Promise<void> {
  await requisicao<void>('DELETE', '/eu', { corpo: exclusao })
  descartarTokenCsrf()
}
