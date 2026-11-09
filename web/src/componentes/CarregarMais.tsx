import { useEffect, useRef } from 'react'
import styles from './CarregarMais.module.css'

type Propriedades = {
  /** Busca a próxima página. Pode ser chamada mais de uma vez: quem chama ignora repetições. */
  aoCarregar: () => void
  carregando: boolean
  /** Mensagem do último erro; com ela, o botão vira "Tentar de novo" e a carga automática para. */
  erro: string | null
}

/**
 * Fim de uma lista paginada (#92): carrega a próxima página sozinho quando aparece na tela, que
 * é a rolagem infinita, e também mostra um botão, para quem navega pelo teclado ou leitor de tela.
 *
 * Para saber quando o fim da lista apareceu, usa o IntersectionObserver do navegador, que avisa
 * quando um elemento entra na área visível. É melhor do que ouvir cada movimento da rolagem: o
 * navegador só chama o app quando interessa. O `rootMargin` de 200px dispara um pouco antes do
 * fim, para a próxima página já estar chegando quando a pessoa termina de rolar.
 */
export function CarregarMais({ aoCarregar, carregando, erro }: Propriedades) {
  const fim = useRef<HTMLDivElement>(null)
  const automatico = !carregando && erro === null

  useEffect(() => {
    const elemento = fim.current
    // Sem o observador (navegador muito antigo, ou os testes com jsdom), fica só o botão.
    if (!automatico || !elemento || typeof IntersectionObserver === 'undefined')
      return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) aoCarregar()
      },
      { rootMargin: '200px' },
    )
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [automatico, aoCarregar])

  return (
    <div ref={fim} className={styles.fim}>
      {erro && (
        <p className={styles.erro} role="alert">
          {erro}
        </p>
      )}
      <button
        type="button"
        className={styles.botao}
        onClick={aoCarregar}
        disabled={carregando}
      >
        {carregando ? 'Carregando…' : erro ? 'Tentar de novo' : 'Carregar mais'}
      </button>
    </div>
  )
}
