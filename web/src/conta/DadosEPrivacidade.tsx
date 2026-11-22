import styles from './Conta.module.css'

/**
 * "Seus dados e privacidade" (#194): um texto curto sobre o que o app guarda. Desde a #217 é uma
 * tela própria (`/conta/privacidade`), com "Excluir minha conta" no fim. A política completa
 * (LGPD) é do M7.
 */
export function DadosEPrivacidade() {
  return (
    <div className={styles.textoDosDetalhes}>
      <p>
        O Easy Finance guarda só o que você informa: seu nome, seu e-mail, a
        senha (de um jeito que nem nós conseguimos ler), suas categorias e seus
        lançamentos.
      </p>
      <p>
        Não pedimos foto, CPF nem dados de banco, e seus dados não são vendidos
        nem usados para anúncio. Neste aparelho ficam só as suas preferências,
        uma cópia das suas categorias e os lançamentos que ainda não foram
        enviados (para lançar sem internet), e tudo isso é apagado quando você
        sai.
      </p>
      <p>Excluir a conta apaga tudo de uma vez, sem volta.</p>
    </div>
  )
}
