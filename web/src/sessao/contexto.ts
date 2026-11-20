import { createContext } from 'react'
import type { Credenciais, NovoCadastro, Usuario } from '../api/tipos.ts'

/** Por que a pessoa está na tela de entrar (para a tela explicar, em vez de só pedir login). */
export type MotivoDoLogin = 'expirou' | 'saiu' | 'excluida'

export type EstadoDaSessao =
  /** Ainda perguntando ao servidor se há alguém logado. */
  | { situacao: 'carregando' }
  /**
   * Há alguém logado. `confirmada` é `false` quando o app abriu sem conexão e está usando o
   * último usuário que entrou neste aparelho: dá para lançar (vai para a fila), e a sessão é
   * conferida quando a conexão volta.
   */
  | { situacao: 'logado'; usuario: Usuario; confirmada: boolean }
  | { situacao: 'anonimo'; motivo?: MotivoDoLogin; semConexao?: boolean }

export type Sessao = {
  estado: EstadoDaSessao
  entrar: (credenciais: Credenciais) => Promise<void>
  cadastrar: (dados: NovoCadastro) => Promise<void>
  /** Encerra a sessão e apaga os dados deste aparelho. Sem conexão, dá erro e nada muda. */
  sair: () => Promise<void>
  /** Troca o usuário da sessão pelo que a API devolveu depois de mudar o perfil (#194). */
  atualizarUsuario: (usuario: Usuario) => void
  /** Chamado depois que a API confirmou a exclusão da conta: apaga o aparelho e volta ao login. */
  aoExcluirConta: () => Promise<void>
  /**
   * Quantos lançamentos ainda não enviados de OUTRA conta foram apagados deste aparelho quando
   * esta conta entrou (0 = nenhum). A tela mostra um aviso e chama `dispensarAvisoDeDescarte`.
   */
  descartados: number
  dispensarAvisoDeDescarte: () => void
}

export const ContextoDaSessao = createContext<Sessao | null>(null)
