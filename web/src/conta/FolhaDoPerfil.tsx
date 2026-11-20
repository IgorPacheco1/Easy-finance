import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import { atualizarPerfil } from '../api/conta.ts'
import type { Usuario } from '../api/tipos.ts'
import {
  CORES_DE_CATEGORIA,
  nomeDaCor,
  type CorDeCategoria,
} from '../categorias/aparencia.ts'
// A folha usa o mesmo visual da folha de categoria (#192): mesmo <dialog>, mesma grade de cores.
import folhas from '../categorias/Categorias.module.css'
import { classeDaCor } from '../categorias/corDaCategoria.ts'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import {
  TAMANHO_MAXIMO_DO_NOME,
  validarNomeDaPessoa,
} from '../sessao/validacao.ts'
import { Avatar } from './Avatar.tsx'
import { avatarDaCor, corDoAvatar } from './avatar.ts'

type Props = {
  usuario: Usuario
  /** "perfil": nome e cor. "cor": só a cor (tocar no avatar). */
  modo: 'perfil' | 'cor'
  aoSalvar: (usuario: Usuario) => void
  aoFechar: () => void
}

/**
 * Folha de editar o perfil (#194): nome e cor do avatar, com a prévia ao vivo. É o mesmo
 * `<dialog>` da folha de categoria (#192): foco preso, Esc fecha e o foco volta para quem abriu.
 */
export function FolhaDoPerfil({ usuario, modo, aoSalvar, aoFechar }: Props) {
  const folha = useRef<HTMLDialogElement>(null)
  const primeiroCampo = useRef<HTMLInputElement>(null)
  const [nome, setNome] = useState(usuario.nome ?? '')
  const [cor, setCor] = useState<CorDeCategoria>(corDoAvatar(usuario.avatar))
  const [erroDoNome, setErroDoNome] = useState<string>()
  const [falha, setFalha] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const soACor = modo === 'cor'

  useEffect(() => {
    const quemAbriu = document.activeElement
    const dialogo = folha.current
    dialogo?.showModal()
    primeiroCampo.current?.focus()
    return () => {
      if (dialogo?.open) dialogo.close()
      if (quemAbriu instanceof HTMLElement) quemAbriu.focus()
    }
  }, [])

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const erro = soACor ? undefined : validarNomeDaPessoa(nome)
    setErroDoNome(erro)
    setFalha(undefined)
    if (erro) return

    setEnviando(true)
    try {
      aoSalvar(
        await atualizarPerfil(
          soACor
            ? { avatar: avatarDaCor(cor) }
            : { nome: nome.trim(), avatar: avatarDaCor(cor) },
        ),
      )
    } catch (falhaDaApi) {
      if (falhaDaApi instanceof ErroDaApi && falhaDaApi.erros.length > 0) {
        setErroDoNome(falhaDaApi.erroDoCampo('nome'))
        setFalha(falhaDaApi.erroDoCampo('avatar'))
      } else {
        setFalha(mensagemDeFalha(falhaDaApi))
      }
      setEnviando(false)
    }
  }

  return (
    <dialog
      ref={folha}
      className={folhas.folha}
      aria-labelledby="titulo-do-perfil"
      onClose={aoFechar}
    >
      <form
        className={folhas.formularioDaFolha}
        onSubmit={salvar}
        noValidate
        aria-labelledby="titulo-do-perfil"
      >
        <h2 id="titulo-do-perfil" className={folhas.tituloDaFolha}>
          {soACor ? 'Cor do avatar' : 'Editar perfil'}
        </h2>

        {/* Prévia ao vivo; repete o que os campos dizem, então o leitor de tela pula. */}
        <div className={folhas.previa} aria-hidden="true">
          <Avatar
            nome={soACor ? usuario.nome : nome}
            email={usuario.email}
            avatar={avatarDaCor(cor)}
          />
        </div>

        {!soACor && (
          <div className={folhas.campoDaFolha}>
            <label htmlFor="nome-do-perfil" className={folhas.rotulo}>
              Nome
            </label>
            <input
              id="nome-do-perfil"
              ref={primeiroCampo}
              className={folhas.campo}
              maxLength={TAMANHO_MAXIMO_DO_NOME}
              autoComplete="name"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              aria-invalid={erroDoNome ? true : undefined}
              aria-describedby={erroDoNome ? 'erro-do-perfil' : undefined}
            />
            {erroDoNome && (
              <p id="erro-do-perfil" className={folhas.erro}>
                {erroDoNome}
              </p>
            )}
          </div>
        )}

        <fieldset className={folhas.escolha}>
          <legend className={folhas.rotulo}>Cor do avatar</legend>
          <div className={folhas.gradeDeCores}>
            {CORES_DE_CATEGORIA.map((opcao) => (
              <button
                key={opcao}
                type="button"
                className={`${folhas.opcaoDeCor} ${classeDaCor(opcao)}`}
                aria-label={nomeDaCor(opcao)}
                aria-pressed={cor === opcao}
                onClick={() => setCor(opcao)}
              >
                <span className={folhas.amostraDaCor} />
              </button>
            ))}
          </div>
        </fieldset>

        {falha && (
          <p className={folhas.erro} role="alert">
            {falha}
          </p>
        )}

        <div className={folhas.botoesDaFolha}>
          <button
            type="submit"
            className={folhas.botaoPrincipal}
            disabled={enviando}
          >
            {enviando ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className={folhas.botaoSecundario}
            onClick={() => folha.current?.close()}
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  )
}
