import { CalendarDays, CirclePlus, Tags, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import styles from './NavegacaoInferior.module.css'

type Destino = {
  para: string
  rotulo: string
  Icone: LucideIcon
}

const destinos: Destino[] = [
  { para: '/', rotulo: 'Lançar', Icone: CirclePlus },
  { para: '/mes', rotulo: 'Mês', Icone: CalendarDays },
  { para: '/categorias', rotulo: 'Categorias', Icone: Tags },
]

/**
 * Barra de navegação fixa no rodapé, ao alcance do polegar no celular.
 *
 * O NavLink sabe qual destino é o atual: aplica a classe "ativo" e marca o link com
 * aria-current="page", que os leitores de tela anunciam.
 */
export function NavegacaoInferior() {
  return (
    <nav aria-label="Navegação principal" className={styles.barra}>
      <ul className={styles.lista}>
        {destinos.map(({ para, rotulo, Icone }) => (
          <li key={para}>
            <NavLink
              to={para}
              // "end": o "/" só fica ativo no "/" exato, e não em "/mes" ou "/categorias".
              end
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.ativo}` : styles.link
              }
            >
              <span className={styles.pilula} aria-hidden="true">
                <Icone size={22} strokeWidth={2} />
              </span>
              <span>{rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
