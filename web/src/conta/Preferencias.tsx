import { useState } from 'react'
import {
  lerEsconderValores,
  salvarEsconderValores,
} from '../preferencias/esconderValores.ts'
import { lerTema, salvarTema, type Tema } from '../preferencias/tema.ts'
import styles from './Conta.module.css'

const TEMAS: { valor: Tema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
]

/**
 * Preferências deste aparelho (#195): o tema e "esconder valores ao abrir o Mês". Ficam só no
 * aparelho (outro celular tem as próprias) e são apagadas ao sair da conta. Funcionam sem conexão.
 *
 * O tema usa botões de opção (`radio`) de verdade, um grupo em que só um vale; as setas do
 * teclado trocam a escolha. "Esconder valores" é uma chave (`role="switch"`): o leitor de tela
 * anuncia "ligado" ou "desligado".
 */
export function Preferencias() {
  const [tema, setTema] = useState<Tema>(lerTema)
  const [esconder, setEsconder] = useState(lerEsconderValores)

  function escolherTema(novo: Tema) {
    setTema(novo)
    salvarTema(novo)
  }

  function alternarEsconder() {
    const novo = !esconder
    setEsconder(novo)
    salvarEsconderValores(novo)
  }

  return (
    <section className={styles.secao} aria-labelledby="secao-preferencias">
      <h2 id="secao-preferencias" className={styles.titulo}>
        Preferências
      </h2>
      <p className={styles.texto}>Valem só para este aparelho.</p>

      <fieldset className={styles.grupoDeOpcoes}>
        <legend className={styles.rotuloDaPreferencia}>Aparência</legend>
        <div className={styles.opcoesDoTema}>
          {TEMAS.map(({ valor, rotulo }) => (
            <label key={valor} className={styles.opcaoDoTema}>
              <input
                type="radio"
                name="tema"
                value={valor}
                checked={tema === valor}
                onChange={() => escolherTema(valor)}
              />
              {rotulo}
            </label>
          ))}
        </div>
        <p className={styles.texto}>
          &quot;Sistema&quot; segue o tema do celular ou do computador.
        </p>
      </fieldset>

      <div className={styles.linhaDaChave}>
        <span id="rotulo-esconder" className={styles.rotuloDaPreferencia}>
          Esconder valores ao abrir o Mês
        </span>
        <button
          type="button"
          role="switch"
          className={styles.chave}
          aria-checked={esconder}
          aria-labelledby="rotulo-esconder"
          aria-describedby="dica-esconder"
          onClick={alternarEsconder}
        >
          <span className={styles.bolinhaDaChave} />
        </button>
      </div>
      <p id="dica-esconder" className={styles.texto}>
        O Mês abre com &quot;R$ •••••&quot;; o olho mostra os valores.
      </p>
    </section>
  )
}
