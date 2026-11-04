import { useEffect } from 'react'
import styles from './Aviso.module.css'

export type DadosDoAviso = {
  mensagem: string
  /** Botão opcional no aviso (por exemplo, "Desfazer"). */
  acao?: { rotulo: string; aoClicar: () => void }
}

type Props = DadosDoAviso & {
  aoFechar: () => void
  /** Quanto tempo o aviso fica na tela, em milissegundos. */
  duracao?: number
}

/**
 * Aviso rápido que aparece acima da navegação e some sozinho. `role="status"` faz o leitor de
 * tela anunciar a mensagem sem tirar o foco do que a pessoa está fazendo.
 */
export function Aviso({ mensagem, acao, aoFechar, duracao = 6000 }: Props) {
  useEffect(() => {
    const temporizador = setTimeout(aoFechar, duracao)
    return () => clearTimeout(temporizador)
  }, [mensagem, aoFechar, duracao])

  return (
    <div className={styles.aviso} role="status">
      <span>{mensagem}</span>
      {acao && (
        <button type="button" className={styles.acao} onClick={acao.aoClicar}>
          {acao.rotulo}
        </button>
      )}
    </div>
  )
}
