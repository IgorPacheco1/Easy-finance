import type { HTMLInputAutoCompleteAttribute } from 'react'
import styles from './Formulario.module.css'

type Props = {
  id: string
  rotulo: string
  tipo?: 'text' | 'email' | 'password'
  valor: string
  aoMudar: (valor: string) => void
  /** Mensagem de erro deste campo; some quando o campo é corrigido (a tela limpa o estado). */
  erro?: string
  dica?: string
  autoComplete?: HTMLInputAutoCompleteAttribute
  autoFocus?: boolean
}

/**
 * Um campo de formulário com rótulo, dica e erro, ligados ao campo para o leitor de tela
 * (`aria-describedby`, `aria-invalid`). Usado nas telas de entrar, criar conta e conta.
 */
export function CampoDeTexto({
  id,
  rotulo,
  tipo = 'text',
  valor,
  aoMudar,
  erro,
  dica,
  autoComplete,
  autoFocus,
}: Props) {
  const descricoes = [dica && `${id}-dica`, erro && `${id}-erro`]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.campoComRotulo}>
      <label htmlFor={id} className={styles.rotulo}>
        {rotulo}
      </label>
      <input
        id={id}
        className={styles.campo}
        type={tipo}
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        // Sem corretor nem maiúscula automática em e-mail e senha.
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricoes || undefined}
      />
      {dica && (
        <p id={`${id}-dica`} className={styles.dica}>
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} className={styles.erro}>
          {erro}
        </p>
      )}
    </div>
  )
}
