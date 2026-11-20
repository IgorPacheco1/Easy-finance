import { CircleArrowDown, CircleArrowUp, Eye, EyeOff } from 'lucide-react'
import styles from './Mes.module.css'
import type { SaldoDoMes } from './useSaldoDoMes.ts'
import { ValorQueConta } from './Valor.tsx'
import { useValoresVisiveis } from './valoresVisiveis.ts'

type Props = {
  dados: SaldoDoMes
  aoTentarDeNovo: () => void
}

/**
 * Saldo do mês em destaque, com receitas e despesas em dois blocos (#188).
 *
 * O olho esconde todos os valores da tela. É um botão de alternar: o nome fica fixo ("Esconder
 * valores") e o `aria-pressed` diz se está ligado; o leitor de tela anuncia "pressionado" ou "não
 * pressionado" a cada toque.
 *
 * Carrega separado da lista (#153): o cartão aparece desde o início, com o próprio "carregando"
 * e o próprio erro. Se só o saldo falhar, a lista continua na tela e o "Tentar de novo" daqui
 * pede só o saldo.
 */
export function CartaoDoSaldo({ dados, aoTentarDeNovo }: Props) {
  const { visiveis, alternar } = useValoresVisiveis()

  return (
    <section className={styles.saldo} aria-label="Saldo do mês">
      <div className={styles.topoDoSaldo}>
        <div className={styles.saldoRotulo}>Saldo do mês</div>
        <button
          type="button"
          className={styles.olho}
          aria-label="Esconder valores"
          aria-pressed={!visiveis}
          onClick={alternar}
        >
          {visiveis ? (
            <Eye size={20} aria-hidden="true" />
          ) : (
            <EyeOff size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {dados.situacao === 'pronto' && (
        <div className={styles.saldoValor}>
          <ValorQueConta valor={dados.saldo.saldo} />
        </div>
      )}

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
          <div className={styles.blocoDoTotal}>
            <dt>
              <CircleArrowUp size={18} aria-hidden="true" />
              Receitas
            </dt>
            <dd>
              <ValorQueConta valor={dados.saldo.receitas} />
            </dd>
          </div>
          <div className={styles.blocoDoTotal}>
            <dt>
              <CircleArrowDown size={18} aria-hidden="true" />
              Despesas
            </dt>
            <dd>
              <ValorQueConta valor={dados.saldo.despesas} />
            </dd>
          </div>
        </dl>
      )}
    </section>
  )
}
