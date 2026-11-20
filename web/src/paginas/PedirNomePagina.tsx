import { useState, type FormEvent } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { atualizarPerfil } from '../api/conta.ts'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { CampoDeTexto } from '../componentes/CampoDeTexto.tsx'
import formulario from '../componentes/Formulario.module.css'
import { Logo } from '../componentes/Logo.tsx'
import autenticacao from '../sessao/Autenticacao.module.css'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import { useSessao } from '../sessao/useSessao.ts'
import { validarNomeDaPessoa } from '../sessao/validacao.ts'

/**
 * "Como podemos te chamar?" (#194): aparece uma vez para quem tem conta de antes do nome existir
 * (V8, #193). Com o nome salvo, o app abre normalmente.
 */
export function PedirNomePagina() {
  const { atualizarUsuario } = useSessao()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string>()
  const [falha, setFalha] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const erroLocal = validarNomeDaPessoa(nome)
    setErro(erroLocal)
    setFalha(undefined)
    if (erroLocal) return

    setEnviando(true)
    try {
      atualizarUsuario(await atualizarPerfil({ nome: nome.trim() }))
    } catch (falhaDaApi) {
      if (falhaDaApi instanceof ErroDaApi && falhaDaApi.erros.length > 0) {
        setErro(falhaDaApi.erroDoCampo('nome'))
      } else {
        setFalha(mensagemDeFalha(falhaDaApi))
      }
      setEnviando(false)
    }
  }

  return (
    <main className={autenticacao.pagina}>
      <div className={autenticacao.topo}>
        <Logo />
        <CabecalhoPagina
          titulo="Como podemos te chamar?"
          descricao="Seu nome aparece no seu perfil. Dá para mudar depois."
        />
      </div>
      <form
        className={`${formulario.formulario} ${autenticacao.cartao}`}
        onSubmit={aoEnviar}
        noValidate
      >
        <CampoDeTexto
          id="pedir-nome"
          rotulo="Seu nome"
          valor={nome}
          aoMudar={setNome}
          erro={erro}
          autoComplete="name"
          autoFocus
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
            {enviando ? 'Salvando…' : 'Continuar'}
          </button>
        </div>
      </form>
    </main>
  )
}
