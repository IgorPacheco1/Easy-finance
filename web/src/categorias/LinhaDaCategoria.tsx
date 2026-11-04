import { Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { atualizarCategoria, excluirCategoria } from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import type { Categoria } from '../api/tipos.ts'
import styles from './Categorias.module.css'
import { TAMANHO_MAXIMO_DO_NOME, validarNome } from './regras.ts'

type Props = {
  categoria: Categoria
  existentes: Categoria[]
  aoAtualizar: (categoria: Categoria) => void
  aoExcluir: (categoria: Categoria) => void
}

type Modo = 'vendo' | 'editando' | 'confirmandoExclusao'

/**
 * Uma categoria da lista. As do sistema só mostram a etiqueta "Padrão": a API não deixa
 * editar nem excluir. As personalizadas podem ser renomeadas e excluídas na própria linha.
 */
export function LinhaDaCategoria({
  categoria,
  existentes,
  aoAtualizar,
  aoExcluir,
}: Props) {
  const [modo, setModo] = useState<Modo>('vendo')
  const [nome, setNome] = useState(categoria.nome)
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const idDoErro = `erro-categoria-${categoria.id}`

  function voltar() {
    setModo('vendo')
    setNome(categoria.nome)
    setErro(undefined)
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const erroLocal = validarNome(nome, existentes, categoria.id)
    setErro(erroLocal)
    if (erroLocal) {
      return
    }
    setEnviando(true)
    try {
      aoAtualizar(await atualizarCategoria(categoria.id, { nome: nome.trim() }))
      setModo('vendo')
    } catch (falha) {
      setErro(mensagemDoErro(falha, 'Não foi possível renomear a categoria.'))
    } finally {
      setEnviando(false)
    }
  }

  async function excluir() {
    setEnviando(true)
    try {
      await excluirCategoria(categoria.id)
      aoExcluir(categoria)
    } catch (falha) {
      // Por exemplo, 409: a categoria tem transações. A mensagem da API explica o motivo.
      setErro(mensagemDoErro(falha, 'Não foi possível excluir a categoria.'))
      setEnviando(false)
    }
  }

  if (modo === 'editando') {
    return (
      <li className={styles.item}>
        <form className={styles.formularioNaLinha} onSubmit={salvar} noValidate>
          <label htmlFor={`nome-${categoria.id}`} className={styles.rotulo}>
            Novo nome
          </label>
          <input
            id={`nome-${categoria.id}`}
            className={styles.campo}
            maxLength={TAMANHO_MAXIMO_DO_NOME}
            autoFocus
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idDoErro : undefined}
          />
          {erro && (
            <p id={idDoErro} className={styles.erro}>
              {erro}
            </p>
          )}
          <div className={styles.botoes}>
            <button
              type="submit"
              className={styles.botaoPrincipal}
              disabled={enviando}
            >
              {enviando ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={voltar}
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    )
  }

  if (modo === 'confirmandoExclusao') {
    return (
      <li className={styles.item}>
        {erro ? (
          <>
            <span className={styles.nome}>{categoria.nome}</span>
            <p className={styles.erro} role="alert">
              {erro}
            </p>
            <div className={styles.botoes}>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={voltar}
              >
                Entendi
              </button>
            </div>
          </>
        ) : (
          <>
            <span className={styles.nome}>Excluir {categoria.nome}?</span>
            <div className={styles.botoes}>
              <button
                type="button"
                className={styles.botaoPerigo}
                onClick={excluir}
                disabled={enviando}
              >
                {enviando ? 'Excluindo…' : 'Excluir'}
              </button>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={voltar}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </li>
    )
  }

  return (
    <li className={styles.item}>
      <div className={styles.linha}>
        <span className={styles.nome}>{categoria.nome}</span>
        {categoria.sistema ? (
          <span className={styles.etiqueta}>Padrão</span>
        ) : (
          <div className={styles.acoes}>
            <button
              type="button"
              className={styles.icone}
              aria-label={`Renomear ${categoria.nome}`}
              onClick={() => setModo('editando')}
            >
              <Pencil size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.icone}
              aria-label={`Excluir ${categoria.nome}`}
              onClick={() => setModo('confirmandoExclusao')}
            >
              <Trash2 size={20} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function mensagemDoErro(falha: unknown, padrao: string): string {
  if (falha instanceof ErroDaApi) {
    return falha.erroDoCampo('nome') ?? falha.detalhe
  }
  return padrao
}
