import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { Logo } from '../componentes/Logo.tsx'
import { CampoDeTexto } from '../componentes/CampoDeTexto.tsx'
import formulario from '../componentes/Formulario.module.css'
import autenticacao from '../sessao/Autenticacao.module.css'
import type { MotivoDoLogin } from '../sessao/contexto.ts'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import { useSessao } from '../sessao/useSessao.ts'
import { validarEmail, validarSenhaInformada } from '../sessao/validacao.ts'

const MENSAGEM_DO_MOTIVO: Record<MotivoDoLogin, string> = {
  expirou: 'Sua sessão expirou. Entre de novo.',
  saiu: 'Você saiu da conta. Os dados deste aparelho foram apagados.',
  excluida: 'Sua conta foi excluída.',
}

/** Tela de entrar. Quem já está logado é levado para a tela inicial. */
export function EntrarPagina() {
  const { estado, entrar } = useSessao()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroDoEmail, setErroDoEmail] = useState<string>()
  const [erroDaSenha, setErroDaSenha] = useState<string>()
  const [falha, setFalha] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  if (estado.situacao === 'logado') {
    return <Navigate to="/" replace />
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const erroEmail = validarEmail(email)
    const erroSenha = validarSenhaInformada(senha)
    setErroDoEmail(erroEmail)
    setErroDaSenha(erroSenha)
    setFalha(undefined)
    if (erroEmail || erroSenha) return

    setEnviando(true)
    try {
      await entrar({ email: email.trim(), senha })
    } catch (erro) {
      setFalha(mensagemDeFalha(erro))
      setEnviando(false)
    }
  }

  const motivo = estado.situacao === 'anonimo' ? estado.motivo : undefined
  const semConexao = estado.situacao === 'anonimo' && estado.semConexao

  return (
    // <main>: fora do Layout, a tela precisa da própria região principal (leitor de tela, #154).
    <main className={autenticacao.pagina}>
      <div className={autenticacao.topo}>
        <Logo />
        <CabecalhoPagina
          titulo="Entrar"
          descricao="Entre na sua conta para ver e lançar seus gastos."
        />
      </div>
      {motivo && (
        <p className={autenticacao.motivo} role="status">
          {MENSAGEM_DO_MOTIVO[motivo]}
        </p>
      )}
      {semConexao && (
        <p className={autenticacao.motivo} role="status">
          Sem conexão com o servidor. Conecte-se à internet para entrar.
        </p>
      )}
      <form
        className={`${formulario.formulario} ${autenticacao.cartao}`}
        onSubmit={aoEnviar}
        noValidate
      >
        <CampoDeTexto
          id="entrar-email"
          rotulo="E-mail"
          tipo="email"
          valor={email}
          aoMudar={setEmail}
          erro={erroDoEmail}
          autoComplete="email"
          autoFocus
        />
        <CampoDeTexto
          id="entrar-senha"
          rotulo="Senha"
          tipo="password"
          valor={senha}
          aoMudar={setSenha}
          erro={erroDaSenha}
          autoComplete="current-password"
        />
        {falha && (
          <p className={formulario.erro} role="alert">
            {falha}
          </p>
        )}
        <div className={formulario.botoes}>
          <button
            type="submit"
            className={`${formulario.botaoPrincipal} ${formulario.botaoLargo}`}
            disabled={enviando}
          >
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
        </div>
      </form>
      <p className={autenticacao.rodape}>
        Ainda não tem conta?{' '}
        <Link to="/criar-conta" className={autenticacao.link}>
          Criar conta
        </Link>
      </p>
    </main>
  )
}
