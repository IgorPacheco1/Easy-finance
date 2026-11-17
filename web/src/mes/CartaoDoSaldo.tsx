import { formatarMoeda } from '../formatacao/moeda.ts'
import styles from './Mes.module.css'
import type { SaldoDoMes } from './useSaldoDoMes.ts'

type Props = {
  dados: SaldoDoMes
  aoTentarDeNovo: () => void
}

/**
 * Saldo do mês em destaque, com o total de receitas e de despesas.
 *
 * Carrega separado da lista (#153): o cartão aparece desde o início, com o próprio "carregando"
 * e o próprio erro. Se só o saldo falhar, a lista continua na tela e o "Tentar de novo" daqui
 * pede só o saldo.
 */
export function CartaoDoSaldo({ dados, aoTentarDeNovo }: Props) {
  return (
    <section className={styles.saldo} aria-label="Saldo do mês">
      <div>
        <div className={styles.saldoRotulo}>Saldo do mês</div>
        {dados.situacao === 'pronto' && (
          <div className={styles.saldoValor}>
            {formatarMoeda(dados.saldo.saldo)}
          </div>
        )}
      </div>

      {dados.situacao === 'carregando' && (
        <p className={styles.saldoMensagem} role="status">
          Carregando saldo…
        </p>
      )}

      {dados.situacao === 'erro' && (
        <div className={styles.saldoErro} role="alert">
          <p className={styles.saldoMensagem}>{dados.mensagem}</p>
          <button
            type="button"
            className={styles.saldoBotao}
            onClick={aoTentarDeNovo}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {dados.situacao === 'pronto' && (
        <dl className={styles.totais}>
          <div>
            <dt>Receitas</dt>
            <dd>{formatarMoeda(dados.saldo.receitas)}</dd>
          </div>
          <div>
            <dt>Despesas</dt>
            <dd>{formatarMoeda(dados.saldo.despesas)}</dd>
          </div>
        </dl>
      )}
    </section>
  )
}
