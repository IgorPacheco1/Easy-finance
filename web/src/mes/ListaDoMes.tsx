import { Link, useLocation } from 'react-router'
import type { Transacao } from '../api/tipos.ts'
import { formatarDiaDaLista } from '../formatacao/datas.ts'
import { formatarValorDaTransacao } from '../formatacao/moeda.ts'
import { agruparPorDia } from './agrupamento.ts'
import styles from './Mes.module.css'

/**
 * Transações agrupadas por dia, da mais recente para a mais antiga. Usada na tela do mês e nos
 * resultados da busca (#94).
 *
 * Cada item é um link para editar o lançamento (#101). O link leva junto o endereço atual
 * (`voltarPara`), para a tela de edição voltar ao mesmo mês ou à mesma busca depois de salvar.
 */
export function ListaDoMes({ transacoes }: { transacoes: Transacao[] }) {
  const { pathname, search } = useLocation()
  const voltarPara = pathname + search

  return (
    <div className={styles.dias}>
      {agruparPorDia(transacoes).map((dia) => (
        <section key={dia.data} className={styles.dia}>
          <h2 className={styles.tituloDoDia}>{formatarDiaDaLista(dia.data)}</h2>
          <ul className={styles.lista}>
            {dia.transacoes.map((transacao) => (
              <li key={transacao.id}>
                <Link
                  to={`/lancamentos/${transacao.id}`}
                  state={{ voltarPara }}
                  className={styles.item}
                >
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
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
