import { ChevronRight, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import type { CorDeCategoria } from '../categorias/aparencia.ts'
import { classeDaCor } from '../categorias/corDaCategoria.ts'
import styles from './Conta.module.css'

type Props = {
  icone: LucideIcon
  /** A cor do quadradinho do ícone: as mesmas cores das categorias (ADR-0031). */
  cor: CorDeCategoria
  titulo: string
  subtitulo?: string
  /** Ids do título e do subtítulo, para um controle dentro da linha (a chave) usar como nome. */
  ids?: { titulo: string; subtitulo: string }
} & (
  | { para: string; aoTocar?: never; children?: never }
  | { aoTocar: () => void; para?: never; children?: never }
  | { children?: ReactNode; para?: never; aoTocar?: never }
)

/**
 * Uma linha das listas da Conta (#217): ícone colorido, título, subtítulo e, no fim, uma seta
 * (quando leva para outro lugar) ou um controle, como a chave de "Esconder valores".
 *
 * - `para`: um link para outra tela.
 * - `aoTocar`: um botão (por exemplo, "Instalar o app").
 * - `children`: uma linha só de texto, com o controle que vier dentro dela.
 */
export function LinhaDaConta({
  icone: Icone,
  cor,
  titulo,
  subtitulo,
  ids,
  para,
  aoTocar,
  children,
}: Props) {
  const base = useId()
  const idDoTitulo = ids?.titulo ?? `${base}-titulo`
  const idDoSubtitulo = ids?.subtitulo ?? `${base}-subtitulo`
  // No link e no botão, o nome é só o título; o subtítulo vira a descrição.
  const nomes = {
    'aria-labelledby': idDoTitulo,
    'aria-describedby': subtitulo ? idDoSubtitulo : undefined,
  }
  const conteudo = (
    <>
      <span className={`${styles.iconeDaLinha} ${classeDaCor(cor)}`}>
        <Icone size={20} aria-hidden="true" />
      </span>
      <span className={styles.textosDaLinha}>
        <span id={idDoTitulo} className={styles.tituloDaLinha}>
          {titulo}
        </span>
        {subtitulo && (
          <span id={idDoSubtitulo} className={styles.subtituloDaLinha}>
            {subtitulo}
          </span>
        )}
      </span>
    </>
  )
  const seta = (
    <ChevronRight className={styles.setaDaLinha} size={20} aria-hidden="true" />
  )

  if (para !== undefined) {
    return (
      <Link to={para} className={styles.linha} {...nomes}>
        {conteudo}
        {seta}
      </Link>
    )
  }
  if (aoTocar !== undefined) {
    return (
      <button
        type="button"
        className={styles.linha}
        onClick={aoTocar}
        {...nomes}
      >
        {conteudo}
        {seta}
      </button>
    )
  }
  return (
    <div className={styles.linha}>
      {conteudo}
      {children}
    </div>
  )
}
