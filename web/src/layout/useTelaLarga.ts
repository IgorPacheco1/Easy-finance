import { useSyncExternalStore } from 'react'

/**
 * A partir desta largura (em px) o app usa o layout do computador: navegação lateral em vez da
 * barra inferior (#161). Abaixo dela, celulares e tablets em pé ficam com o layout do celular.
 * É o mesmo valor documentado em docs/design-system.md.
 */
export const LARGURA_DO_COMPUTADOR = 900

const CONSULTA = `(min-width: ${LARGURA_DO_COMPUTADOR}px)`

/** O jsdom dos testes (e navegadores muito antigos) não tem matchMedia: aí vale o layout do celular. */
function consulta(): MediaQueryList | null {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia(CONSULTA)
    : null
}

function inscrever(aoMudar: () => void) {
  const lista = consulta()
  lista?.addEventListener('change', aoMudar)
  return () => lista?.removeEventListener('change', aoMudar)
}

function telaLarga(): boolean {
  return consulta()?.matches ?? false
}

/**
 * Diz se a tela é larga como a de um computador, e atualiza quando muda (janela redimensionada,
 * tablet girado). O `useSyncExternalStore` é o jeito do React de ler um valor que vem de fora dele
 * (aqui, o navegador) e redesenhar quando esse valor muda.
 */
export function useTelaLarga(): boolean {
  return useSyncExternalStore(inscrever, telaLarga)
}
