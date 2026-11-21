import { useState, type FormEvent } from 'react'
import { excluirConta } from '../api/auth.ts'
import { ErroDaApi } from '../api/cliente.ts'
import { CampoDeTexto } from '../componentes/CampoDeTexto.tsx'
import formulario from '../componentes/Formulario.module.css'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import { useSessao } from '../sessao/useSessao.ts'
import { validarSenhaInformada } from '../sessao/validacao.ts'
import styles from './Conta.module.css'

/**
 * Excluir a conta: apaga a conta e todos os lançamentos e categorias dela, sem volta. Por isso o
 * botão só abre a confirmação, que pede a senha e avisa do que será perdido.
 */
export function ExcluirConta() {
  const { aoExcluirConta } = useSessao()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erroDaSenha, setErroDaSenha] = useState<string>()
  const [falha, setFalha] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  function cancelar() {
    setAberto(false)
    setSenha('')
    setErroDaSenha(undefined)
    setFalha(undefined)
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const erro = validarSenhaInformada(senha)
    setErroDaSenha(erro)
    setFalha(undefined)
    if (erro) return

    setEnviando(true)
    try {
      await excluirConta({ senha })
      await aoExcluirConta()
    } catch (falhaDaApi) {
      if (falhaDaApi instanceof ErroDaApi && falhaDaApi.erros.length > 0) {
        setErroDaSenha(falhaDaApi.erroDoCampo('senha'))
      } else {
        setFalha(mensagemDeFalha(falhaDaApi))
      }
      setEnviando(false)
    }
  }

  // Fechado, é só um botão discreto no fim de "Seus dados e privacidade" (#217). Aberto, explica
  // o que será perdido e pede a senha.
  return (
    <section className={styles.zonaDeExcluir} aria-labelledby="secao-excluir">
      <h2 id="secao-excluir" className={styles.somenteParaLeitor}>
        Excluir conta
      </h2>
      {aberto ? (
        <form className={formulario.formulario} onSubmit={aoEnviar} noValidate>
          <p className={styles.textoDePerigo}>
            Apaga sua conta, todos os seus lançamentos e suas categorias. Não dá
            para desfazer.
          </p>
          <CampoDeTexto
            id="excluir-senha"
            rotulo="Confirme com sua senha"
            tipo="password"
            valor={senha}
            aoMudar={setSenha}
            erro={erroDaSenha}
            autoComplete="current-password"
            autoFocus
          />
          {falha && (
            <p className={formulario.erro} role="alert">
              {falha}
            </p>
          )}
          <div className={formulario.botoes}>
            <button
              type="button"
              className={formulario.botaoSecundario}
              onClick={cancelar}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={formulario.botaoPerigo}
              disabled={enviando}
            >
              {enviando ? 'Excluindo…' : 'Excluir para sempre'}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={styles.botaoExcluirDiscreto}
          onClick={() => setAberto(true)}
        >
          Excluir minha conta
        </button>
      )}
    </section>
  )
}
