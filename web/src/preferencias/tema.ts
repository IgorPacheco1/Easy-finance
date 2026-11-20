/**
 * Tema do app (#195): "sistema" (segue o do celular ou computador), "claro" ou "escuro". Fica no
 * aparelho (localStorage), porque precisa ser lido antes da primeira pintura da tela (public/tema.js),
 * e o IndexedDB só responde depois. Apagado ao sair da conta, como o resto do aparelho (ADR-0027).
 *
 * A regra de qual tema vale é a mesma do public/tema.js: um teste confere as duas.
 */
export type Tema = 'sistema' | 'claro' | 'escuro'

export const CHAVE_DO_TEMA = 'easy-finance:tema'

const COR_DA_BARRA = { claro: '#f7f1ea', escuro: '#1f1410' } as const

/** O tema guardado. Sem nada guardado, valor estranho ou sem acesso ao localStorage: "sistema". */
export function lerTema(): Tema {
  try {
    const valor = window.localStorage.getItem(CHAVE_DO_TEMA)
    return valor === 'claro' || valor === 'escuro' ? valor : 'sistema'
  } catch {
    return 'sistema'
  }
}

/** Guarda o tema e já aplica na tela. */
export function salvarTema(tema: Tema): void {
  try {
    if (tema === 'sistema') window.localStorage.removeItem(CHAVE_DO_TEMA)
    else window.localStorage.setItem(CHAVE_DO_TEMA, tema)
  } catch {
    // Sem localStorage (modo privado em alguns navegadores): o tema vale só até fechar o app.
  }
  aplicarTema(tema)
}

/** Põe data-tema="claro" ou "escuro" no <html> e ajusta a cor da barra do navegador. */
export function aplicarTema(tema: Tema = lerTema()): void {
  const sistemaEscuro =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const escuro = tema === 'escuro' || (tema === 'sistema' && sistemaEscuro)
  document.documentElement.setAttribute(
    'data-tema',
    escuro ? 'escuro' : 'claro',
  )
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', COR_DA_BARRA[escuro ? 'escuro' : 'claro'])
}
