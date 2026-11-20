import { useState } from 'react'
import { Link } from 'react-router'
import type { Categoria, TipoCategoria } from '../api/tipos.ts'
import type { EstadoDasCategorias } from '../categorias/useCategorias.ts'
import { IconeDaCategoria } from '../componentes/IconeDaCategoria.tsx'
import styles from './Lancamento.module.css'

/** Quantas categorias a grade mostra antes do "Ver todas" (#187): duas linhas de três. */
export const CATEGORIAS_NA_GRADE = 6

type Props = {
  estado: EstadoDasCategorias
  tipo: TipoCategoria
  selecionada: string | null
  aoEscolher: (id: string) => void
  aoTentarDeNovo: () => void
  erro?: string
}

/**
 * Categorias da tela de lançamento em grade, com ícone e cor (#187). Vêm na ordem da API, as mais
 * usadas primeiro (#97), então as 6 da grade costumam bastar; "Ver todas" mostra o resto.
 * (A tela de editar continua com os chips de EscolhaDeCategoria.)
 */
export function GradeDeCategorias({
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
        // `key`: ao trocar de Despesa para Receita, a grade volta a mostrar só as 6.
        <Grade
          key={tipo}
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

function Grade({
  categorias,
  tipo,
  selecionada,
  aoEscolher,
}: {
  categorias: Categoria[]
  tipo: TipoCategoria
  selecionada: string | null
  aoEscolher: (id: string) => void
}) {
  const [todas, setTodas] = useState(false)

  if (categorias.length === 0) {
    return (
      <p className={styles.mensagem}>
        Nenhuma categoria de {tipo === 'DESPESA' ? 'despesa' : 'receita'}.{' '}
        <Link to="/categorias">Criar uma categoria</Link>
      </p>
    )
  }

  const visiveis = todas ? categorias : primeiras(categorias, selecionada)
  return (
    <>
      <div className={styles.grade} data-enter-lanca>
        {visiveis.map((categoria) => (
          <button
            key={categoria.id}
            type="button"
            className={styles.cartaoDaCategoria}
            aria-pressed={categoria.id === selecionada}
            onClick={() => {
              aoEscolher(categoria.id)
              setTodas(false) // escolheu: a grade volta a ficar curta
            }}
          >
            <IconeDaCategoria
              icone={categoria.icone}
              cor={categoria.cor}
              tamanho="medio"
            />
            <span className={styles.nomeDaCategoria}>{categoria.nome}</span>
          </button>
        ))}
      </div>
      {categorias.length > CATEGORIAS_NA_GRADE && (
        <button
          type="button"
          className={styles.botaoDeTexto}
          onClick={() => setTodas(!todas)}
        >
          {todas ? 'Ver menos' : 'Ver todas'}
        </button>
      )}
    </>
  )
}

/**
 * As primeiras da grade. Se a escolhida veio do "Ver todas" (está depois da 6ª), ela entra no
 * lugar da 6ª: a pessoa continua vendo o que escolheu.
 */
function primeiras(categorias: Categoria[], selecionada: string | null) {
  const inicio = categorias.slice(0, CATEGORIAS_NA_GRADE)
  const escolhida = categorias.find((c) => c.id === selecionada)
  if (!escolhida || inicio.includes(escolhida)) return inicio
  return [...inicio.slice(0, CATEGORIAS_NA_GRADE - 1), escolhida]
}
