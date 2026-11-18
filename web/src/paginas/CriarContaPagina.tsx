import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { ErroDaApi } from '../api/cliente.ts'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { Logo } from '../componentes/Logo.tsx'
import { CampoDeTexto } from '../componentes/CampoDeTexto.tsx'
import formulario from '../componentes/Formulario.module.css'
import autenticacao from '../sessao/Autenticacao.module.css'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import { useSessao } from '../sessao/useSessao.ts'
import { validarEmail, validarSenhaNova } from '../sessao/validacao.ts'

/** Tela de criar conta. Ao dar certo, a pessoa já entra (o servidor abre a sessão). */
export function CriarContaPagina() {
  const { estado, cadastrar } = useSessao()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erroDoEmail, setErroDoEmail] = useState<string>()
  const [erroDaSenha, setErroDaSenha] = useState<string>()
  const [erroDaRepetida, setErroDaRepetida] = useState<string>()
  const [falha, setFalha] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  if (estado.situacao === 'logado') {
    return <Navigate to="/" replace />
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const erroEmail = validarEmail(email)
    const erroSenha = validarSenhaNova(senha)
    const erroRepetida =
      !erroSenha && repetida !== senha ? 'As senhas não são iguais.' : undefined
    setErroDoEmail(erroEmail)
    setErroDaSenha(erroSenha)
    setErroDaRepetida(erroRepetida)
    setFalha(undefined)
    if (erroEmail || erroSenha || erroRepetida) return

    setEnviando(true)
    try {
      await cadastrar({ email: email.trim(), senha })
    } catch (erro) {
      // 400 com erros por campo (o servidor recusou algo que o app deixou passar).
      if (erro instanceof ErroDaApi && erro.erros.length > 0) {
        setErroDoEmail(erro.erroDoCampo('email'))
        setErroDaSenha(erro.erroDoCampo('senha'))
      } else {
        setFalha(mensagemDeFalha(erro))
      }
      setEnviando(false)
    }
  }

  return (
    // <main>: fora do Layout, a tela precisa da própria região principal (leitor de tela, #154).
    <main className={autenticacao.pagina}>
      <div className={autenticacao.topo}>
        <Logo />
        <CabecalhoPagina
          titulo="Criar conta"
          descricao="Cada conta vê só os próprios lançamentos."
        />
      </div>
      <form
        className={`${formulario.formulario} ${autenticacao.cartao}`}
        onSubmit={aoEnviar}
        noValidate
      >
        <CampoDeTexto
          id="conta-email"
          rotulo="E-mail"
          tipo="email"
          valor={email}
          aoMudar={setEmail}
          erro={erroDoEmail}
          autoComplete="email"
          autoFocus
        />
        <CampoDeTexto
          id="conta-senha"
          rotulo="Senha"
          tipo="password"
          valor={senha}
          aoMudar={setSenha}
          erro={erroDaSenha}
          dica="Ao menos 8 caracteres. Uma frase longa protege mais que uma senha curta e complicada."
          autoComplete="new-password"
        />
        <CampoDeTexto
          id="conta-repetida"
          rotulo="Repita a senha"
          tipo="password"
          valor={repetida}
          aoMudar={setRepetida}
          erro={erroDaRepetida}
          autoComplete="new-password"
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
            {enviando ? 'Criando…' : 'Criar conta'}
          </button>
        </div>
      </form>
      <p className={autenticacao.rodape}>
        Já tem conta?{' '}
        <Link to="/entrar" className={autenticacao.link}>
          Entrar
        </Link>
      </p>
    </main>
  )
}
