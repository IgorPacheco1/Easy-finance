import { useState, type FormEvent } from 'react'
import { criarCategoria } from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import type { Categoria, TipoCategoria } from '../api/tipos.ts'
import styles from './Categorias.module.css'
import { TAMANHO_MAXIMO_DO_NOME, validarNome } from './regras.ts'

type Props = {
  existentes: Categoria[]
  aoCriar: (categoria: Categoria) => void
  aoCancelar: () => void
}

/** Formulário curto para criar uma categoria personalizada: nome e tipo. */
export function FormularioNovaCategoria({
  existentes,
  aoCriar,
  aoCancelar,
}: Props) {
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const erroLocal = validarNome(nome, existentes)
    setErro(erroLocal)
    if (erroLocal) {
      return
    }
    setEnviando(true)
    try {
      aoCriar(await criarCategoria({ nome: nome.trim(), tipo }))
    } catch (falha) {
      setErro(
        falha instanceof ErroDaApi
          ? (falha.erroDoCampo('nome') ?? falha.detalhe)
          : 'Não foi possível criar a categoria.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form
      className={styles.formulario}
      onSubmit={salvar}
      noValidate
      aria-label="Nova categoria"
    >
      <label htmlFor="nova-categoria" className={styles.rotulo}>
        Nome
      </label>
      <input
        id="nova-categoria"
        className={styles.campo}
        placeholder="Ex.: Pets"
        maxLength={TAMANHO_MAXIMO_DO_NOME}
        autoFocus
        value={nome}
        onChange={(evento) => setNome(evento.target.value)}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? 'erro-nova-categoria' : undefined}
      />
      {erro && (
        <p id="erro-nova-categoria" className={styles.erro}>
          {erro}
        </p>
      )}

      <div className={styles.alternador} role="group" aria-label="Tipo">
        <button
          type="button"
          className={styles.opcao}
          aria-pressed={tipo === 'DESPESA'}
          onClick={() => setTipo('DESPESA')}
        >
          Despesa
        </button>
        <button
          type="button"
          className={styles.opcao}
          aria-pressed={tipo === 'RECEITA'}
          onClick={() => setTipo('RECEITA')}
        >
          Receita
        </button>
      </div>
      <p className={styles.dica}>O tipo não pode ser mudado depois.</p>

      <div className={styles.botoes}>
        <button
          type="submit"
          className={styles.botaoPrincipal}
          disabled={enviando}
        >
          {enviando ? 'Criando…' : 'Criar categoria'}
        </button>
        <button
          type="button"
          className={styles.botaoSecundario}
          onClick={aoCancelar}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
