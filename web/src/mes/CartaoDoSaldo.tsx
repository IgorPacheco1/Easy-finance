import type { Saldo } from '../api/tipos.ts'
import { formatarMoeda } from '../formatacao/moeda.ts'
import styles from './Mes.module.css'

/** Saldo do mês em destaque, com o total de receitas e de despesas. */
export function CartaoDoSaldo({ saldo }: { saldo: Saldo }) {
  return (
    <section className={styles.saldo} aria-label="Saldo do mês">
      <div>
        <div className={styles.saldoRotulo}>Saldo do mês</div>
        <div className={styles.saldoValor}>{formatarMoeda(saldo.saldo)}</div>
      </div>
      <dl className={styles.totais}>
        <div>
          <dt>Receitas</dt>
          <dd>{formatarMoeda(saldo.receitas)}</dd>
        </div>
        <div>
          <dt>Despesas</dt>
          <dd>{formatarMoeda(saldo.despesas)}</dd>
        </div>
      </dl>
    </section>
  )
}
