import { classeDaCor } from '../categorias/corDaCategoria.ts'
import { corDoAvatar, iniciaisDe } from './avatar.ts'
import styles from './Conta.module.css'

type Props = {
  nome: string | null
  email: string
  avatar: string
  tamanho?: 'medio' | 'grande'
}

/**
 * O avatar da pessoa: as iniciais num círculo da cor escolhida (#194, ADR-0032). É decorativo
 * (`aria-hidden`): o nome dela está sempre escrito ao lado.
 */
export function Avatar({ nome, email, avatar, tamanho = 'grande' }: Props) {
  return (
    <span
      className={`${styles.avatar} ${tamanho === 'grande' ? styles.avatarGrande : styles.avatarMedio} ${classeDaCor(corDoAvatar(avatar))}`}
      aria-hidden="true"
    >
      {iniciaisDe(nome, email)}
    </span>
  )
}
