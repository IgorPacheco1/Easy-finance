import { useSyncExternalStore } from 'react'
import {
  conviteGuardado,
  foiInstaladoAgora,
  observarConvite,
} from './convite.ts'

/**
 * Como instalar o app neste aparelho (#217):
 *
 * - `navegador`: Chrome ou Edge guardaram o convite; tocar em "Instalar o app" abre a janela de
 *   instalação do próprio navegador (Android e computador).
 * - `iphone`: no iPhone e no iPad não há convite; o app explica o caminho pelo botão Compartilhar.
 * - `null`: já instalado (aberto pelo ícone, sem a barra do navegador) ou num navegador que não
 *   instala (Firefox no computador, por exemplo). A linha não aparece.
 */
export type ModoDeInstalar = 'navegador' | 'iphone' | null

export function modoDeInstalar(): ModoDeInstalar {
  if (foiInstaladoAgora() || abertoComoApp()) return null
  if (conviteGuardado()) return 'navegador'
  if (ehIphoneOuIpad()) return 'iphone'
  return null
}

export function useInstalarApp(): ModoDeInstalar {
  return useSyncExternalStore(observarConvite, modoDeInstalar)
}

/** Aberto pelo ícone da tela de início: sem a barra do navegador. */
function abertoComoApp(): boolean {
  const naoPadrao = navigator as Navigator & { standalone?: boolean }
  return (
    naoPadrao.standalone === true ||
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches)
  )
}

/** O iPad novo se apresenta como Mac; o que o diferencia é a tela de toque. */
function ehIphoneOuIpad(): boolean {
  return (
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}
