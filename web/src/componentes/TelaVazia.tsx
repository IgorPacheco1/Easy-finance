import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './TelaVazia.module.css'

type Props = {
  icone: LucideIcon
  titulo: string
  texto: string
  /** A ação que tira a pessoa do vazio: um link ("Lançar agora") ou um botão ("Limpar busca"). */
  acao: ReactNode
}

/**
 * Tela vazia (#196): em vez de só "nada aqui", um ícone, uma frase simpática e a ação que resolve.
 * O título é um parágrafo forte, e não um cabeçalho: a tela já tem o título dela.
 */
export function TelaVazia({ icone: Icone, titulo, texto, acao }: Props) {
  return (
    <div className={styles.vazia}>
      <span className={styles.icone} aria-hidden="true">
        <Icone size={28} />
      </span>
      <p className={styles.titulo}>{titulo}</p>
      <p className={styles.texto}>{texto}</p>
      {acao}
    </div>
  )
}
