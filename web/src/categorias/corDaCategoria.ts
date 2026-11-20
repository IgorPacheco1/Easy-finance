import { APARENCIA_PADRAO, ehCorDeCategoria } from './aparencia.ts'
import styles from './CorDaCategoria.module.css'

/**
 * A classe que pinta um elemento (e o que está dentro dele) com a cor da categoria: ela define
 * `--cor-da-categoria`, que o ícone e a barra do resumo usam (#186, ADR-0031). Por classe, e não
 * por `style`, para o app continuar compatível com uma CSP estrita. Cor desconhecida vira cinza.
 */
export function classeDaCor(cor: string): string {
  return styles[ehCorDeCategoria(cor) ? cor : APARENCIA_PADRAO.cor]
}
