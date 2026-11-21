import { Flame, ListChecks, Tag, type LucideIcon } from 'lucide-react'
import type { CorDeCategoria } from '../categorias/aparencia.ts'
import { classeDaCor } from '../categorias/corDaCategoria.ts'
import styles from './Conta.module.css'
import type { EstadoDasEstatisticas } from './useEstatisticas.ts'

type Props = {
  dados: EstadoDasEstatisticas
  aoTentarDeNovo: () => void
}

/** Os três números do perfil (#194): dias seguidos lançando, lançamentos e categorias usadas. */
export function EstatisticasDoPerfil({ dados, aoTentarDeNovo }: Props) {
  return (
    <section
      className={styles.estatisticas}
      aria-labelledby="titulo-estatisticas"
    >
      {/* Sem título visível (os cartões falam por si, #217), mas o leitor de tela ouve. */}
      <h2 id="titulo-estatisticas" className={styles.somenteParaLeitor}>
        Seus números
      </h2>
      {dados.situacao === 'carregando' && (
        <p className={styles.texto} role="status">
          Carregando…
        </p>
      )}
      {dados.situacao === 'erro' && (
        <div className={styles.erroDasEstatisticas} role="alert">
          <p className={styles.texto}>{dados.mensagem}</p>
          <button
            type="button"
            className={styles.botaoDeTexto}
            onClick={aoTentarDeNovo}
          >
            Tentar de novo
          </button>
        </div>
      )}
      {dados.situacao === 'pronto' && (
        <dl className={styles.numeros}>
          <Numero
            icone={Flame}
            cor="laranja"
            valor={dados.estatisticas.sequenciaDeDias}
            um="dia seguido lançando"
            varios="dias seguidos lançando"
          />
          <Numero
            icone={ListChecks}
            cor="azul"
            valor={dados.estatisticas.totalDeLancamentos}
            um="lançamento"
            varios="lançamentos"
          />
          <Numero
            icone={Tag}
            cor="verde"
            valor={dados.estatisticas.totalDeCategorias}
            um="categoria usada"
            varios="categorias usadas"
          />
        </dl>
      )}
      {dados.situacao === 'pronto' &&
        dados.estatisticas.totalDeLancamentos === 0 && (
          <p className={styles.texto}>
            Seu primeiro lançamento começa a sequência.
          </p>
        )}
    </section>
  )
}

const formatoDoNumero = new Intl.NumberFormat('pt-BR')

function Numero({
  icone: Icone,
  cor,
  valor,
  um,
  varios,
}: {
  icone: LucideIcon
  cor: CorDeCategoria
  valor: number
  um: string
  varios: string
}) {
  // O texto vem antes no código (dt) e o número depois (dd): o leitor de tela lê "lançamentos, 42".
  // No visual, o número fica em cima (CSS), com o ícone acima dele.
  return (
    <div className={styles.numero}>
      <dt>{valor === 1 ? um : varios}</dt>
      <dd>
        <span className={`${styles.iconeDoNumero} ${classeDaCor(cor)}`}>
          <Icone size={16} aria-hidden="true" />
        </span>
        {formatoDoNumero.format(valor)}
      </dd>
    </div>
  )
}
