import { useEffect, useRef, useState } from 'react'

const DURACAO_MS = 600

/** Quem pede menos movimento no sistema (ou um navegador sem matchMedia) vê o número direto. */
function movimentoReduzido(): boolean {
  return (
    typeof window.matchMedia !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Número que "conta" até o valor (#188): ao abrir o mês, o saldo sobe de 0 até o valor; ao trocar
 * de mês, vai do valor antigo ao novo. Começa rápido e freia no fim (curva "ease-out").
 *
 * `requestAnimationFrame` pede ao navegador para chamar a função no próximo quadro da tela (uns
 * 60 por segundo); cada chamada calcula quanto do tempo já passou e onde o número deve estar.
 */
export function useNumeroQueConta(alvo: number): number {
  const reduzido = movimentoReduzido()
  const [mostrado, setMostrado] = useState(0)
  const atual = useRef(0)

  useEffect(() => {
    if (reduzido) return // sem animação: o valor sai direto no return abaixo
    const inicio = atual.current
    const comeco = performance.now()
    let quadro = 0
    const passo = () => {
      const progresso = Math.min((performance.now() - comeco) / DURACAO_MS, 1)
      const suavizado = 1 - (1 - progresso) ** 3
      const valor =
        progresso === 1 ? alvo : inicio + (alvo - inicio) * suavizado
      atual.current = valor
      setMostrado(valor)
      if (progresso < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, reduzido])

  return reduzido ? alvo : mostrado
}
