import { useState, type FormEvent } from 'react'
import { trocarSenha } from '../api/auth.ts'
import { ErroDaApi } from '../api/cliente.ts'
import { CampoDeTexto } from '../componentes/CampoDeTexto.tsx'
import formulario from '../componentes/Formulario.module.css'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import { validarSenhaInformada, validarSenhaNova } from '../sessao/validacao.ts'
import styles from './Conta.module.css'

/** Formulário de trocar a senha. As outras sessões da conta são encerradas pelo servidor. */
export function TrocarSenha() {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [erroDaAtual, setErroDaAtual] = useState<string>()
  const [erroDaNova, setErroDaNova] = useState<string>()
  const [falha, setFalha] = useState<string>()
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault()
    const erroAtual = validarSenhaInformada(senhaAtual)
    const erroNova = validarSenhaNova(novaSenha)
    setErroDaAtual(erroAtual)
    setErroDaNova(erroNova)
    setFalha(undefined)
    setSucesso(false)
    if (erroAtual || erroNova) return

    setEnviando(true)
    try {
      await trocarSenha({ senhaAtual, novaSenha })
      setSenhaAtual('')
      setNovaSenha('')
      setSucesso(true)
    } catch (erro) {
      if (erro instanceof ErroDaApi && erro.erros.length > 0) {
        // Ex.: senha atual errada (campo senhaAtual) ou nova igual à atual (campo novaSenha).
        setErroDaAtual(erro.erroDoCampo('senhaAtual'))
        setErroDaNova(erro.erroDoCampo('novaSenha'))
      } else {
        setFalha(mensagemDeFalha(erro))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={styles.secao} aria-labelledby="secao-senha">
      <h2 id="secao-senha" className={styles.titulo}>
        Trocar senha
      </h2>
      <form className={formulario.formulario} onSubmit={aoEnviar} noValidate>
        <CampoDeTexto
          id="senha-atual"
          rotulo="Senha atual"
          tipo="password"
          valor={senhaAtual}
          aoMudar={setSenhaAtual}
          erro={erroDaAtual}
          autoComplete="current-password"
        />
        <CampoDeTexto
          id="senha-nova"
          rotulo="Nova senha"
          tipo="password"
          valor={novaSenha}
          aoMudar={setNovaSenha}
          erro={erroDaNova}
          dica="Ao menos 8 caracteres."
          autoComplete="new-password"
        />
        {falha && (
          <p className={formulario.erro} role="alert">
            {falha}
          </p>
        )}
        {sucesso && (
          <p className={styles.sucesso} role="status">
            Senha trocada. Suas outras sessões foram encerradas.
          </p>
        )}
        <div className={formulario.botoes}>
          <button
            type="submit"
            className={formulario.botaoPrincipal}
            disabled={enviando}
          >
            {enviando ? 'Trocando…' : 'Trocar senha'}
          </button>
        </div>
      </form>
    </section>
  )
}
