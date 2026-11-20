import type { GastoDoDia } from '../api/tipos.ts'
import {
  formatarData,
  hoje as calcularHoje,
  type Mes,
} from '../formatacao/datas.ts'
import { diaDeMaiorGasto, mediaDiaria } from './gastoPorDia.ts'
import styles from './Mes.module.css'
import type { GastoPorDiaDoMes } from './useGastoPorDia.ts'
import { Valor } from './Valor.tsx'

/** Cada dia ocupa 10 unidades de largura no desenho; a barra, 7 delas (sobra o espaço entre elas). */
const LARGURA_DO_DIA = 10
const LARGURA_DA_BARRA = 7
/** Altura do desenho. A barra mais alta usa 90; o resto fica para a bolinha do dia de hoje. */
const ALTURA = 100
const ALTURA_MAXIMA_DA_BARRA = 90

type Props = {
  mes: Mes
  dados: GastoPorDiaDoMes
  aoTentarDeNovo: () => void
}

/**
 * Gasto por dia do mês (#189): uma barra por dia, o dia de hoje destacado e uma linha tracejada
 * na média diária.
 *
 * O desenho é um SVG feito à mão, sem biblioteca de gráficos: são só retângulos com x, y, largura
 * e altura calculados aqui. Medidas vão como atributos do SVG, e não como `style`, para o app
 * continuar aceitando uma CSP estrita.
 *
 * Quem não enxerga o gráfico não perde nada: a frase de cima diz a média e o dia de maior gasto,
 * e "Ver dia a dia" abre uma tabela com todos os valores. Por isso o desenho fica com
 * `aria-hidden`: ele repete o que já está escrito.
 */
export function GastoPorDia({ mes, dados, aoTentarDeNovo }: Props) {
  return (
    <section
      className={styles.gastoPorDia}
      aria-labelledby="titulo-gasto-por-dia"
    >
      <h2 id="titulo-gasto-por-dia" className={styles.tituloDoResumo}>
        Gasto por dia
      </h2>

      {dados.situacao === 'carregando' && (
        <p className={styles.mensagem} role="status">
          Carregando gasto por dia…
        </p>
      )}

      {dados.situacao === 'erro' && (
        <div className={styles.vazio} role="alert">
          <p className={styles.mensagem}>{dados.mensagem}</p>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={aoTentarDeNovo}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {dados.situacao === 'pronto' && (
        <Grafico
          mes={mes}
          dias={dados.resumo.dias}
          total={dados.resumo.total}
        />
      )}
    </section>
  )
}

function Grafico({
  mes,
  dias,
  total,
}: {
  mes: Mes
  dias: GastoDoDia[]
  total: number
}) {
  const hoje = calcularHoje()
  const maior = diaDeMaiorGasto(dias)
  if (!maior) {
    return <p className={styles.mensagem}>Nenhuma despesa neste mês.</p>
  }
  const media = mediaDiaria(total, dias.length, mes, hoje)
  const temHoje = dias.some((dia) => dia.data === hoje)
  const escala = ALTURA_MAXIMA_DA_BARRA / maior.total
  const largura = dias.length * LARGURA_DO_DIA
  const alturaDaMedia = media === null ? null : ALTURA - media * escala

  return (
    <>
      <p className={styles.resumoDoGrafico}>
        {media !== null && (
          <>
            Média de <Valor valor={media} /> por dia.{' '}
          </>
        )}
        O dia com mais gasto foi {formatarData(maior.data).slice(0, 5)}, com{' '}
        <Valor valor={maior.total} />.
      </p>

      <svg
        className={styles.grafico}
        viewBox={`0 0 ${largura} ${ALTURA}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          className={styles.linhaDeBase}
          x1="0"
          x2={largura}
          y1={ALTURA}
          y2={ALTURA}
          vectorEffect="non-scaling-stroke"
        />
        {dias.map((dia, indice) => {
          const altura = dia.total * escala
          const ehHoje = dia.data === hoje
          return (
            <rect
              key={dia.data}
              className={ehHoje ? styles.barraDeHoje : styles.barraDoDia}
              x={
                indice * LARGURA_DO_DIA +
                (LARGURA_DO_DIA - LARGURA_DA_BARRA) / 2
              }
              y={ALTURA - altura}
              width={LARGURA_DA_BARRA}
              height={altura}
              rx="1.5"
            />
          )
        })}
        {alturaDaMedia !== null && (
          <line
            className={styles.linhaDaMedia}
            x1="0"
            x2={largura}
            y1={alturaDaMedia}
            y2={alturaDaMedia}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div className={styles.eixoDosDias} aria-hidden="true">
        <span>1</span>
        <span>{Math.ceil(dias.length / 2)}</span>
        <span>{dias.length}</span>
      </div>
      <ul className={styles.legendaDoGrafico} aria-hidden="true">
        {temHoje && (
          <li>
            <span className={styles.amostraDeHoje} /> Hoje
          </li>
        )}
        {media !== null && (
          <li>
            <span className={styles.amostraDaMedia} /> Média
          </li>
        )}
      </ul>

      <details className={styles.diaADia}>
        <summary>Ver dia a dia</summary>
        <table className={styles.tabelaDoGrafico}>
          <caption className={styles.somenteParaLeitor}>
            Gasto de cada dia do mês
          </caption>
          <thead>
            <tr>
              <th scope="col">Dia</th>
              <th scope="col">Gasto</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia.data}>
                <th scope="row">
                  {formatarData(dia.data).slice(0, 5)}
                  {dia.data === hoje && ' (hoje)'}
                </th>
                <td>
                  <Valor valor={dia.total} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  )
}
