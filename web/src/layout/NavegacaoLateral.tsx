import { NavLink } from 'react-router'
import { Logo } from '../componentes/Logo.tsx'
import { destinos } from './destinos.ts'
import styles from './NavegacaoLateral.module.css'

/**
 * Navegação do computador (#161): uma coluna fixa à esquerda com a logo e os mesmos destinos da
 * barra inferior, com ícone e nome lado a lado. No computador quem navega é o mouse e o teclado,
 * e a tela é larga: por isso a navegação vai para a lateral, e não para o rodapé.
 */
export function NavegacaoLateral() {
  return (
    <nav aria-label="Navegação principal" className={styles.lateral}>
      <div className={styles.marca}>
        <Logo />
      </div>
      <ul className={styles.lista}>
        {destinos.map(({ para, rotulo, Icone }) => (
          <li key={para}>
            <NavLink
              to={para}
              end
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.ativo}` : styles.link
              }
            >
              <Icone aria-hidden="true" size={20} strokeWidth={2} />
              <span>{rotulo}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
