import { useEffect, useRef } from 'react'

type Acoes = {
  aoDigitar: (tecla: string) => void
  aoApagar: () => void
  aoConfirmar: () => void
}

/**
 * No computador, o teclado físico também digita o valor (#187): números, Backspace e Enter.
 *
 * - Escrevendo num campo (a descrição, a data), as teclas são do campo, e não do valor.
 * - Ctrl, Alt e Cmd ficam com os atalhos do navegador (Ctrl+1 troca de aba, por exemplo).
 * - O Enter só lança com o foco no valor, no teclado da tela ou nas categorias (marcados com
 *   `data-enter-lanca`) ou fora de qualquer botão. Nos outros botões ele faz o normal: quem usa
 *   Tab e aperta Enter em "Receita" quer trocar o tipo, e não lançar.
 *
 * As ações ficam num ref para o "ouvinte" do teclado ser registrado uma vez só e, mesmo assim,
 * chamar sempre a versão mais nova delas.
 */
export function useTecladoFisico(ativo: boolean, acoes: Acoes) {
  const acoesAtuais = useRef(acoes)
  useEffect(() => {
    acoesAtuais.current = acoes
  })

  useEffect(() => {
    if (!ativo) return
    function aoApertar(evento: KeyboardEvent) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return
      const alvo = evento.target instanceof Element ? evento.target : null
      if (alvo?.closest('input, textarea, select, [contenteditable="true"]')) {
        return
      }
      if (/^[0-9]$/.test(evento.key)) {
        evento.preventDefault()
        acoesAtuais.current.aoDigitar(evento.key)
      } else if (evento.key === 'Backspace') {
        evento.preventDefault()
        acoesAtuais.current.aoApagar()
      } else if (evento.key === 'Enter' && enterLanca(alvo)) {
        evento.preventDefault() // senão o botão em foco também seria "clicado"
        acoesAtuais.current.aoConfirmar()
      }
    }
    window.addEventListener('keydown', aoApertar)
    return () => window.removeEventListener('keydown', aoApertar)
  }, [ativo])
}

function enterLanca(alvo: Element | null): boolean {
  if (!alvo || alvo.closest('[data-enter-lanca]')) return true
  return !alvo.closest('button, a')
}
