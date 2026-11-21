import { EyeOff, Smartphone, SunMoon } from 'lucide-react'
import { useState } from 'react'
import { classeDaCor } from '../categorias/corDaCategoria.ts'
import { usarConvite } from '../instalacao/convite.ts'
import { useInstalarApp } from '../instalacao/useInstalarApp.ts'
import {
  lerEsconderValores,
  salvarEsconderValores,
} from '../preferencias/esconderValores.ts'
import { lerTema, salvarTema, type Tema } from '../preferencias/tema.ts'
import styles from './Conta.module.css'
import { FolhaDeInstalar } from './FolhaDeInstalar.tsx'
import { LinhaDaConta } from './LinhaDaConta.tsx'

const TEMAS: { valor: Tema; rotulo: string }[] = [
  { valor: 'sistema', rotulo: 'Sistema' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
]

/**
 * Preferências deste aparelho (#195), numa lista com ícones (#217): o tema, "esconder valores ao
 * abrir" e instalar o app. As duas primeiras ficam só no aparelho e são apagadas ao sair da conta.
 * Funcionam sem conexão.
 *
 * O tema usa botões de opção (`radio`) de verdade, um grupo em que só um vale; as setas do
 * teclado trocam a escolha. Eles aparecem como um seletor de três partes, e a escolhida fica
 * preenchida e em negrito. "Esconder valores" é uma chave (`role="switch"`): o leitor de tela
 * anuncia "ligado" ou "desligado".
 */
export function Preferencias() {
  const [tema, setTema] = useState<Tema>(lerTema)
  const [esconder, setEsconder] = useState(lerEsconderValores)
  const instalar = useInstalarApp()
  const [explicandoIphone, setExplicandoIphone] = useState(false)

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
    <section className={styles.grupo} aria-labelledby="secao-preferencias">
      <h2 id="secao-preferencias" className={styles.tituloDoGrupo}>
        Preferências
      </h2>
      <div className={styles.lista}>
        <fieldset className={styles.linhaDoTema}>
          <legend className={styles.legendaDoTema}>
            <span
              className={`${styles.iconeDaLinha} ${classeDaCor('amarelo')}`}
            >
              <SunMoon size={20} aria-hidden="true" />
            </span>
            <span className={styles.tituloDaLinha}>Aparência</span>
          </legend>
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
        </fieldset>

        <LinhaDaConta
          icone={EyeOff}
          cor="roxo"
          titulo="Esconder valores ao abrir"
          subtitulo="Para abrir o app em público"
          ids={{ titulo: 'rotulo-esconder', subtitulo: 'dica-esconder' }}
        >
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
        </LinhaDaConta>

        {instalar && (
          <LinhaDaConta
            icone={Smartphone}
            cor="turquesa"
            titulo="Instalar o app"
            subtitulo="Abrir sem passar pelo navegador"
            aoTocar={() =>
              instalar === 'navegador'
                ? void usarConvite()
                : setExplicandoIphone(true)
            }
          />
        )}
      </div>

      {explicandoIphone && (
        <FolhaDeInstalar aoFechar={() => setExplicandoIphone(false)} />
      )}
    </section>
  )
}
