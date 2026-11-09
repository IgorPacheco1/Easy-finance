import { useState } from 'react'
import type { ResumoDoTipo, TipoCategoria } from '../api/tipos.ts'
import { formatarMoeda } from '../formatacao/moeda.ts'
import styles from './Mes.module.css'
import type { ResumoDoMes } from './useResumoDoMes.ts'

const formatoDoPercentual = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

type Props = {
  dados: ResumoDoMes
  aoTentarDeNovo: () => void
}

/**
 * "Para onde foi o dinheiro" (#96): cada categoria do mês com o valor, o percentual e uma barra
 * proporcional. Despesas primeiro, porque é o que mais interessa para controlar os gastos; o
 * seletor troca para receitas.
 *
 * A barra é só CSS: uma faixa com a largura igual ao percentual. O percentual também aparece
 * escrito, para a informação não depender só do desenho (quem usa leitor de tela, ou quem não
 * distingue bem a cor, lê o número).
 */
export function ResumoPorCategoria({ dados, aoTentarDeNovo }: Props) {
  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')

  return (
    <section className={styles.resumo} aria-labelledby="titulo-do-resumo">
      <div className={styles.topoDoResumo}>
        <h2 id="titulo-do-resumo" className={styles.tituloDoResumo}>
          Por categoria
        </h2>
        <div className={styles.abas} role="group" aria-label="Tipo do resumo">
          {(
            [
              ['DESPESA', 'Despesas'],
              ['RECEITA', 'Receitas'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className={styles.aba}
              aria-pressed={tipo === valor}
              onClick={() => setTipo(valor)}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {dados.situacao === 'carregando' && (
        <p className={styles.mensagem} role="status">
          Carregando resumo…
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
        <ListaDoResumo
          tipo={tipo}
          resumo={
            tipo === 'DESPESA' ? dados.resumo.despesas : dados.resumo.receitas
          }
        />
      )}
    </section>
  )
}

function ListaDoResumo({
  tipo,
  resumo,
}: {
  tipo: TipoCategoria
  resumo: ResumoDoTipo
}) {
  if (resumo.categorias.length === 0) {
    return (
      <p className={styles.mensagem}>
        {tipo === 'DESPESA'
          ? 'Nenhuma despesa neste mês.'
          : 'Nenhuma receita neste mês.'}
      </p>
    )
  }
  return (
    <ul className={styles.listaDoResumo}>
      {resumo.categorias.map((categoria) => {
        const percentual = `${formatoDoPercentual.format(categoria.percentual)}%`
        return (
          <li key={categoria.id} className={styles.linhaDoResumo}>
            <div className={styles.cabecaDaLinha}>
              <span className={styles.categoria}>{categoria.nome}</span>
              <span className={styles.valor}>
                {formatarMoeda(categoria.total)}
              </span>
            </div>
            <div className={styles.cabecaDaLinha}>
              <div className={styles.trilho} aria-hidden="true">
                <div
                  className={
                    tipo === 'RECEITA'
                      ? `${styles.barra} ${styles.barraDeReceita}`
                      : styles.barra
                  }
                  style={{ width: `${Math.min(categoria.percentual, 100)}%` }}
                />
              </div>
              <span className={styles.percentual}>{percentual}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
