import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { contarNaFila } from '../fila/banco.ts'
import formulario from '../componentes/Formulario.module.css'
import { mensagemDeFalha } from '../sessao/mensagens.ts'
import { useSessao } from '../sessao/useSessao.ts'
import styles from './Conta.module.css'

/**
 * Botão de sair. Sair apaga os dados deste aparelho (ADR-0027); se ainda há lançamentos que não
 * foram enviados, eles se perderiam, então a pessoa escolhe: cancelar (e esperar a conexão) ou
 * sair mesmo assim.
 */
export function SairDaConta() {
  const { sair } = useSessao()
  const [pendentes, setPendentes] = useState(0)
  const [perguntando, setPerguntando] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [falha, setFalha] = useState<string>()

  async function executar() {
    setSaindo(true)
    setFalha(undefined)
    try {
      await sair()
    } catch (erro) {
      setFalha(mensagemDeFalha(erro))
      setSaindo(false)
      setPerguntando(false)
    }
  }

  async function aoClicarEmSair() {
    const naFila = await contarNaFila().catch(() => 0)
    if (naFila > 0) {
      setPendentes(naFila)
      setPerguntando(true)
      return
    }
    await executar()
  }

  // O aviso de que os dados do aparelho são apagados só aparece quando faz diferença: quando há
  // lançamentos ainda não enviados (#217; antes era um texto fixo no cartão "Sair").
  return (
    <div className={styles.sair}>
      {perguntando && (
        <div role="alert">
          <p className={formulario.erro}>
            {pendentes === 1
              ? 'Há 1 lançamento que ainda não foi enviado.'
              : `Há ${pendentes} lançamentos que ainda não foram enviados.`}{' '}
            Se sair agora,{' '}
            {pendentes === 1 ? 'ele será perdido' : 'eles serão perdidos'}.
          </p>
        </div>
      )}
      {falha && (
        <p className={formulario.erro} role="alert">
          {falha}
        </p>
      )}
      {perguntando ? (
        <div className={formulario.botoes}>
          <button
            type="button"
            className={formulario.botaoSecundario}
            onClick={() => setPerguntando(false)}
            disabled={saindo}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={formulario.botaoPerigo}
            onClick={executar}
            disabled={saindo}
          >
            Sair mesmo
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.botaoSair}
          onClick={aoClicarEmSair}
          disabled={saindo}
        >
          <LogOut size={20} aria-hidden="true" />
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      )}
    </div>
  )
}
