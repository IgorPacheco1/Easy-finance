import styles from './CabecalhoPagina.module.css'

type Props = {
  titulo: string
  descricao?: string
}

/** Título de cada tela. Cada tela tem um único h1, o que ajuda quem usa leitor de tela. */
export function CabecalhoPagina({ titulo, descricao }: Props) {
  return (
    <header className={styles.cabecalho}>
      <h1 className={styles.titulo}>{titulo}</h1>
      {descricao && <p className={styles.descricao}>{descricao}</p>}
    </header>
  )
}
