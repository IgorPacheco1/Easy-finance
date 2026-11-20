import {
  APARENCIA_PADRAO,
  ehCorDeCategoria,
  ehIconeDeCategoria,
  ICONES_DE_CATEGORIA,
} from '../categorias/aparencia.ts'
import styles from './IconeDaCategoria.module.css'

type Tamanho = 'pequeno' | 'medio' | 'grande'

interface Props {
  /** Nome do ícone guardado na categoria (ex.: `shopping-cart`). */
  icone: string
  /** Nome da cor guardada na categoria (ex.: `verde`). */
  cor: string
  tamanho?: Tamanho
}

/**
 * Ícone de uma categoria na cor dela (ADR-0031): o desenho na cor e um fundo da mesma cor bem
 * clarinho. É decorativo (`aria-hidden`): a categoria sempre aparece com o **nome** ao lado,
 * então quem usa leitor de tela ou não distingue as cores não perde nada.
 *
 * A cor entra por classe (não por `style`), para o app continuar compatível com uma CSP estrita.
 * Valor desconhecido vira a aparência padrão, em vez de quebrar a tela.
 */
export function IconeDaCategoria({ icone, cor, tamanho = 'medio' }: Props) {
  const nomeDoIcone = ehIconeDeCategoria(icone) ? icone : APARENCIA_PADRAO.icone
  const corValida = ehCorDeCategoria(cor) ? cor : APARENCIA_PADRAO.cor
  const Desenho = ICONES_DE_CATEGORIA[nomeDoIcone]

  return (
    <span
      className={`${styles.icone} ${styles[tamanho]} ${styles[corValida]}`}
      data-icone={nomeDoIcone}
      data-cor={corValida}
      aria-hidden="true"
    >
      <Desenho className={styles.desenho} focusable="false" />
    </span>
  )
}
