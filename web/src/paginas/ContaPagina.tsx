import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { ExcluirConta } from '../conta/ExcluirConta.tsx'
import { SairDaConta } from '../conta/SairDaConta.tsx'
import { TrocarSenha } from '../conta/TrocarSenha.tsx'
import styles from '../conta/Conta.module.css'
import { useSessao } from '../sessao/useSessao.ts'

/** "Minha conta": quem está logado, sair, trocar a senha e excluir a conta. */
export function ContaPagina() {
  const { estado } = useSessao()
  // A rota é protegida, então aqui sempre há alguém; a conferência é para o TypeScript.
  if (estado.situacao !== 'logado') return null

  return (
    <>
      <CabecalhoPagina titulo="Conta" />
      <div className={styles.identidade}>
        <p className={styles.texto}>Você entrou como</p>
        <p className={styles.email}>{estado.usuario.email}</p>
      </div>
      {!estado.confirmada && (
        <p className={styles.texto} role="status">
          Sem conexão: sua sessão será conferida quando a internet voltar. Os
          lançamentos ficam guardados no aparelho até lá.
        </p>
      )}
      <SairDaConta />
      {/* Trocar a senha e excluir a conta falam com o servidor: só aparecem com a sessão confirmada. */}
      {estado.confirmada && (
        <>
          <TrocarSenha />
          <ExcluirConta />
        </>
      )}
    </>
  )
}
