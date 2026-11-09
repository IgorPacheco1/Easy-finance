import type { Transacao } from '../api/tipos.ts'
import { formatarDiaDaLista } from '../formatacao/datas.ts'
import { formatarValorDaTransacao } from '../formatacao/moeda.ts'
import { agruparPorDia } from './agrupamento.ts'
import styles from './Mes.module.css'

/**
 * Transações agrupadas por dia, da mais recente para a mais antiga. Usada na tela do mês e nos
 * resultados da busca (#94).
 */
export function ListaDoMes({ transacoes }: { transacoes: Transacao[] }) {
  return (
    <div className={styles.dias}>
      {agruparPorDia(transacoes).map((dia) => (
        <section key={dia.data} className={styles.dia}>
          <h2 className={styles.tituloDoDia}>{formatarDiaDaLista(dia.data)}</h2>
          <ul className={styles.lista}>
            {dia.transacoes.map((transacao) => (
              <li key={transacao.id} className={styles.item}>
                <div className={styles.textos}>
                  <span className={styles.categoria}>
                    {transacao.categoria.nome}
                  </span>
                  {transacao.descricao && (
                    <span className={styles.descricao}>
                      {transacao.descricao}
                    </span>
                  )}
                </div>
                <span
                  className={
                    transacao.categoria.tipo === 'RECEITA'
                      ? `${styles.valor} ${styles.receita}`
                      : styles.valor
                  }
                >
                  {formatarValorDaTransacao(
                    transacao.valor,
                    transacao.categoria.tipo,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
