import { Link } from 'react-router'
import type { TipoCategoria } from '../api/tipos.ts'
import styles from './Lancamento.module.css'
import type { EstadoDasCategorias } from '../categorias/useCategorias.ts'

type Props = {
  estado: EstadoDasCategorias
  tipo: TipoCategoria
  selecionada: string | null
  aoEscolher: (id: string) => void
  aoTentarDeNovo: () => void
  erro?: string
}

/** Categorias do tipo escolhido, em botões: um toque escolhe. */
export function EscolhaDeCategoria({
  estado,
  tipo,
  selecionada,
  aoEscolher,
  aoTentarDeNovo,
  erro,
}: Props) {
  return (
    <fieldset
      className={styles.grupo}
      aria-describedby={erro ? 'erro-categoria' : undefined}
    >
      <legend className={styles.rotulo}>Categoria</legend>

      {estado.situacao === 'carregando' && (
        <p className={styles.mensagem}>Carregando categorias…</p>
      )}

      {estado.situacao === 'erro' && (
        <>
          <p className={styles.mensagem} role="alert">
            {estado.mensagem}
          </p>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={aoTentarDeNovo}
          >
            Tentar de novo
          </button>
        </>
      )}

      {estado.situacao === 'pronto' && (
        <CategoriasDoTipo
          categorias={estado.categorias.filter((c) => c.tipo === tipo)}
          tipo={tipo}
          selecionada={selecionada}
          aoEscolher={aoEscolher}
        />
      )}

      {erro && (
        <p id="erro-categoria" className={styles.erroDoCampo}>
          {erro}
        </p>
      )}
    </fieldset>
  )
}

function CategoriasDoTipo({
  categorias,
  tipo,
  selecionada,
  aoEscolher,
}: {
  categorias: { id: string; nome: string }[]
  tipo: TipoCategoria
  selecionada: string | null
  aoEscolher: (id: string) => void
}) {
  if (categorias.length === 0) {
    return (
      <p className={styles.mensagem}>
        Nenhuma categoria de {tipo === 'DESPESA' ? 'despesa' : 'receita'}.{' '}
        <Link to="/categorias">Criar uma categoria</Link>
      </p>
    )
  }
  return (
    <div className={styles.chips}>
      {categorias.map((categoria) => (
        <button
          key={categoria.id}
          type="button"
          className={styles.chip}
          aria-pressed={categoria.id === selecionada}
          onClick={() => aoEscolher(categoria.id)}
        >
          {categoria.nome}
        </button>
      ))}
    </div>
  )
}
