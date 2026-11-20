import { useState } from 'react'
import type { ResumoDoTipo, TipoCategoria } from '../api/tipos.ts'
import { classeDaCor } from '../categorias/corDaCategoria.ts'
import { IconeDaCategoria } from '../componentes/IconeDaCategoria.tsx'
import { fatiasDaRosca } from './fatiasDaRosca.ts'
import styles from './Mes.module.css'
import type { ResumoDoMes } from './useResumoDoMes.ts'
import { Valor } from './Valor.tsx'

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

/** Comprimento da volta da rosca: com este raio, a volta mede 100, e cada fatia mede a sua parte. */
const RAIO_DA_ROSCA = 100 / (2 * Math.PI)
/** Espaço entre uma fatia e a próxima, na mesma medida (de 0 a 100). */
const VAO_ENTRE_FATIAS = 0.8

/**
 * "Para onde foi o dinheiro" (#190): a rosca com as fatias, o total no centro e o maior gasto em
 * destaque.
 *
 * Cada fatia é um círculo só com a borda, e o `stroke-dasharray` diz quanto da borda pintar
 * ("traço de 25, vão de 75" pinta um quarto). O `stroke-dashoffset` gira o começo do traço para
 * a fatia começar onde a anterior acabou. A cor vem da classe da categoria, sem `style` (CSP).
 *
 * A rosca fica com `aria-hidden`: a lista embaixo já diz o valor e o percentual de cada categoria
 * em texto. O total do centro e o maior gasto continuam legíveis.
 */
function Rosca({
  tipo,
  resumo,
}: {
  tipo: TipoCategoria
  resumo: ResumoDoTipo
}) {
  const fatias = fatiasDaRosca(resumo.categorias)
  const maior = resumo.categorias[0]
  const vao = fatias.length > 1 ? VAO_ENTRE_FATIAS : 0
  // Onde cada fatia começa: a soma das partes das fatias antes dela.
  const inicios = fatias.map((_, i) =>
    fatias.slice(0, i).reduce((soma, anterior) => soma + anterior.parte, 0),
  )

  return (
    <div className={styles.topoDaRosca}>
      <div className={styles.rosca}>
        <svg
          className={styles.desenhoDaRosca}
          viewBox="0 0 42 42"
          aria-hidden="true"
        >
          <circle
            className={styles.fundoDaRosca}
            cx="21"
            cy="21"
            r={RAIO_DA_ROSCA}
          />
          {fatias.map((fatia, i) => {
            const comeco = inicios[i]
            const traco = Math.max(fatia.parte - vao, 0.1)
            return (
              <circle
                key={fatia.id}
                className={`${styles.fatia} ${classeDaCor(fatia.cor)}`}
                cx="21"
                cy="21"
                r={RAIO_DA_ROSCA}
                strokeDasharray={`${traco} ${100 - traco}`}
                // A volta começa às 3 horas; 25 a mais leva o começo para o meio-dia.
                strokeDashoffset={25 - comeco}
              />
            )
          })}
        </svg>
        <div className={styles.centroDaRosca}>
          <span className={styles.rotuloDoCentro}>
            {tipo === 'DESPESA' ? 'Despesas' : 'Receitas'}
          </span>
          <span className={styles.valorDoCentro}>
            <Valor valor={resumo.total} />
          </span>
        </div>
      </div>
      <p className={styles.maiorDoResumo}>
        {tipo === 'DESPESA' ? 'Maior gasto' : 'Maior receita'}:{' '}
        <strong>{maior.nome}</strong>, <Valor valor={maior.total} /> (
        {formatoDoPercentual.format(maior.percentual)}%)
      </p>
    </div>
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
    <>
      <Rosca tipo={tipo} resumo={resumo} />
      <ul className={styles.listaDoResumo}>
        {resumo.categorias.map((categoria) => {
          const percentual = `${formatoDoPercentual.format(categoria.percentual)}%`
          return (
            <li
              key={categoria.id}
              className={`${styles.linhaDoResumo} ${classeDaCor(categoria.cor)}`}
            >
              <div className={styles.cabecaDaLinha}>
                <span className={styles.nomeComIcone}>
                  <IconeDaCategoria
                    icone={categoria.icone}
                    cor={categoria.cor}
                    tamanho="pequeno"
                  />
                  <span className={styles.textos}>
                    <span className={styles.categoria}>{categoria.nome}</span>
                    <span className={styles.quantidade}>
                      {categoria.quantidade === 1
                        ? '1 lançamento'
                        : `${categoria.quantidade} lançamentos`}
                    </span>
                  </span>
                </span>
                <span className={styles.valor}>
                  <Valor valor={categoria.total} />
                </span>
              </div>
              <div className={styles.cabecaDaLinha}>
                {/* SVG com o atributo width, e não style inline: assim o app aceita uma CSP
                  estrita, sem 'unsafe-inline' em estilos (M6, #157). */}
                <svg className={styles.trilho} aria-hidden="true">
                  <rect
                    className={styles.barra}
                    width={`${Math.max(Math.min(categoria.percentual, 100), 1)}%`}
                    height="100%"
                    rx="4"
                  />
                </svg>
                <span className={styles.percentual}>{percentual}</span>
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}
