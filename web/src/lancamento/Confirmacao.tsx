import { useEffect, useRef } from 'react'
import type { Categoria } from '../api/tipos.ts'
import { IconeDaCategoria } from '../componentes/IconeDaCategoria.tsx'
import { formatarData, formatarMes } from '../formatacao/datas.ts'
import { formatarMoeda } from '../formatacao/moeda.ts'
import { useSaldoDoMes } from '../mes/useSaldoDoMes.ts'
import styles from './Lancamento.module.css'

export type DadosDaConfirmacao = {
  /** "enviado": chegou ao servidor. "guardado": sem conexão, ficou na fila do aparelho (#100). */
  situacao: 'enviado' | 'guardado'
  id: string
  valor: number
  data: string
  categoria: Pick<Categoria, 'nome' | 'tipo' | 'icone' | 'cor'>
}

type Props = {
  dados: DadosDaConfirmacao
  hoje: string
  ontem: string
  desfazendo: boolean
  aoLancarOutra: () => void
  aoDesfazer: () => void
}

/**
 * Confirmação depois de lançar (#187): o ícone da categoria "salta" (a animação some com
 * "reduzir movimento"), o resumo do que foi lançado e como ficou o saldo do mês. Fica na tela até
 * a pessoa escolher "Lançar outra" ou "Desfazer".
 *
 * O foco vai para o título, para o leitor de tela anunciar o que aconteceu.
 */
export function Confirmacao({
  dados,
  hoje,
  ontem,
  desfazendo,
  aoLancarOutra,
  aoDesfazer,
}: Props) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus()
  }, [])

  const { categoria } = dados
  const guardado = dados.situacao === 'guardado'
  const quando =
    dados.data === hoje
      ? 'hoje'
      : dados.data === ontem
        ? 'ontem'
        : formatarData(dados.data)

  return (
    <section
      className={styles.confirmacao}
      aria-labelledby="titulo-confirmacao"
    >
      <div className={styles.iconeQueSalta}>
        <IconeDaCategoria
          icone={categoria.icone}
          cor={categoria.cor}
          tamanho="grande"
        />
      </div>
      <h2
        id="titulo-confirmacao"
        ref={titulo}
        tabIndex={-1}
        className={styles.tituloDaConfirmacao}
      >
        {guardado
          ? 'Guardado no aparelho'
          : categoria.tipo === 'DESPESA'
            ? 'Despesa lançada'
            : 'Receita lançada'}
      </h2>
      <p className={styles.resumoDaConfirmacao}>
        {formatarMoeda(dados.valor)} em {categoria.nome}, {quando}
      </p>

      {guardado ? (
        <p className={styles.mensagem}>
          Sem conexão. Será enviado quando a internet voltar.
        </p>
      ) : (
        <SaldoAntesEDepois dados={dados} />
      )}

      <div className={styles.acoesDaConfirmacao}>
        <button
          type="button"
          className={`${styles.botaoPrincipal} ${styles.semFixar}`}
          onClick={aoLancarOutra}
        >
          Lançar outra
        </button>
        <button
          type="button"
          className={styles.botaoSecundario}
          disabled={desfazendo}
          onClick={aoDesfazer}
        >
          {desfazendo ? 'Desfazendo…' : 'Desfazer'}
        </button>
      </div>
    </section>
  )
}

/**
 * Saldo do mês do lançamento, antes e depois dele. Basta uma consulta: o saldo de agora já tem
 * o lançamento, e o "antes" é ele sem o valor lançado. A conta é feita em centavos, para não
 * aparecer erro de arredondamento (0,1 + 0,2 no JavaScript dá 0,30000000000000004).
 *
 * Enquanto carrega, ou se a consulta falhar, a linha simplesmente não aparece: o lançamento já
 * deu certo, e o saldo é só um extra.
 */
function SaldoAntesEDepois({ dados }: { dados: DadosDaConfirmacao }) {
  const mes = dados.data.slice(0, 7) // "2026-11-05" → "2026-11"
  const { dados: saldo } = useSaldoDoMes(mes)
  if (saldo.situacao !== 'pronto') return null

  const depois = Math.round(saldo.saldo.saldo * 100)
  const lancado = Math.round(dados.valor * 100)
  // Despesa diminuiu o saldo; então, antes dela, ele era maior. Receita, o contrário.
  const antes =
    dados.categoria.tipo === 'DESPESA' ? depois + lancado : depois - lancado

  return (
    <dl className={styles.saldoDaConfirmacao}>
      <dt>Saldo de {formatarMes(mes).toLowerCase()}</dt>
      <dd>
        <span className={styles.saldoAntes}>{formatarMoeda(antes / 100)}</span>
        <span aria-hidden="true"> → </span>
        <span className={styles.somenteParaLeitor}> para </span>
        <strong>{formatarMoeda(depois / 100)}</strong>
      </dd>
    </dl>
  )
}
