import { CloudOff } from 'lucide-react'
import { formatarData } from '../formatacao/datas.ts'
import { formatarMoeda } from '../formatacao/moeda.ts'
import type { LancamentoNaFila } from './banco.ts'
import styles from './Fila.module.css'
import type { useFila } from './useFila.ts'

type Props = {
  fila: ReturnType<typeof useFila>
}

/** "R$ 52,90 de 05/11/2026 (feira)": o suficiente para a pessoa reconhecer o lançamento. */
function descrever(lancamento: LancamentoNaFila): string {
  const { valor, data, descricao } = lancamento.corpo
  const texto = `${formatarMoeda(valor)} de ${formatarData(data)}`
  return descricao ? `${texto} (${descricao})` : texto
}

/**
 * Aviso dos lançamentos guardados no aparelho (#100, ADR-0019), nas telas de lançamento e do
 * mês. Os pendentes não entram na lista nem no saldo: o saldo é sempre o confirmado pelo
 * servidor. Por isso o aviso existe, para ninguém achar que o lançamento sumiu.
 *
 * Os recusados aparecem um a um, com a decisão que só a pessoa pode tomar.
 */
export function AvisoDePendentes({ fila }: Props) {
  const {
    pendentes,
    recusados,
    enviando,
    enviarAgora,
    descartar,
    lancarDeNovo,
  } = fila

  if (pendentes.length === 0 && recusados.length === 0) return null

  return (
    <section className={styles.aviso} aria-label="Lançamentos no aparelho">
      {pendentes.length > 0 && (
        <div className={styles.linha}>
          <CloudOff size={20} aria-hidden="true" className={styles.icone} />
          <p className={styles.texto} role="status">
            {pendentes.length === 1
              ? '1 lançamento aguardando envio.'
              : `${pendentes.length} lançamentos aguardando envio.`}
          </p>
          <button
            type="button"
            className={styles.botao}
            onClick={() => void enviarAgora()}
            disabled={enviando}
          >
            {enviando ? 'Enviando…' : 'Enviar agora'}
          </button>
        </div>
      )}

      {recusados.map((lancamento) => (
        <div key={lancamento.id} className={styles.recusado} role="alert">
          <p className={styles.texto}>
            {lancamento.motivo === 'excluida'
              ? `O lançamento de ${descrever(lancamento)} não foi enviado: ele já tinha sido excluído em outro aparelho.`
              : `O lançamento de ${descrever(lancamento)} foi recusado: ${lancamento.mensagem ?? 'dados inválidos.'}`}
          </p>
          <div className={styles.botoes}>
            <button
              type="button"
              className={styles.botao}
              onClick={() => void descartar(lancamento.id)}
            >
              Descartar
            </button>
            {lancamento.motivo === 'excluida' && (
              <button
                type="button"
                className={styles.botaoPrincipal}
                onClick={() => void lancarDeNovo(lancamento)}
              >
                Lançar de novo
              </button>
            )}
          </div>
        </div>
      ))}
    </section>
  )
}
