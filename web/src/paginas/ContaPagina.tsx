import { ChevronRight, KeyRound } from 'lucide-react'
import { Link } from 'react-router'
import type { Usuario } from '../api/tipos.ts'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { CartaoDoPerfil } from '../conta/CartaoDoPerfil.tsx'
import styles from '../conta/Conta.module.css'
import { DadosEPrivacidade } from '../conta/DadosEPrivacidade.tsx'
import { EstatisticasDoPerfil } from '../conta/EstatisticasDoPerfil.tsx'
import { ExcluirConta } from '../conta/ExcluirConta.tsx'
import { Preferencias } from '../conta/Preferencias.tsx'
import { SairDaConta } from '../conta/SairDaConta.tsx'
import { useEstatisticas } from '../conta/useEstatisticas.ts'
import { useSessao } from '../sessao/useSessao.ts'

/**
 * "Conta" como perfil (#194): o cartão com avatar, nome e e-mail, os números da pessoa, segurança
 * e privacidade, as preferências do aparelho (#195), sobre o app, sair e, por último e discreto,
 * excluir a conta.
 */
export function ContaPagina() {
  const { estado, atualizarUsuario } = useSessao()
  // A rota é protegida, então aqui sempre há alguém; a conferência é para o TypeScript.
  if (estado.situacao !== 'logado') return null

  return (
    <>
      <CabecalhoPagina titulo="Conta" />
      {estado.confirmada ? (
        <PerfilConfirmado aoMudar={atualizarUsuario} usuario={estado.usuario} />
      ) : (
        <>
          <CartaoDoPerfil
            usuario={estado.usuario}
            podeEditar={false}
            aoMudar={atualizarUsuario}
          />
          <p className={styles.texto} role="status">
            Sem conexão: sua sessão será conferida quando a internet voltar. Os
            lançamentos ficam guardados no aparelho até lá.
          </p>
        </>
      )}

      {/* Preferências são só do aparelho: funcionam até sem conexão (#195). */}
      <Preferencias />

      <section className={styles.secao} aria-labelledby="secao-sobre">
        <h2 id="secao-sobre" className={styles.titulo}>
          Sobre o Easy Finance
        </h2>
        <p className={styles.texto}>Versão {__VERSAO_DO_APP__}</p>
      </section>

      <SairDaConta />
      {/* Excluir a conta fala com o servidor: só aparece com a sessão confirmada. */}
      {estado.confirmada && <ExcluirConta />}
    </>
  )
}

/** A parte que fala com o servidor: estatísticas, editar o perfil e trocar a senha. */
function PerfilConfirmado({
  usuario,
  aoMudar,
}: {
  usuario: Usuario
  aoMudar: (usuario: Usuario) => void
}) {
  const estatisticas = useEstatisticas()
  return (
    <>
      <CartaoDoPerfil
        usuario={usuario}
        desde={
          estatisticas.dados.situacao === 'pronto'
            ? estatisticas.dados.estatisticas.desde
            : undefined
        }
        podeEditar
        aoMudar={aoMudar}
      />
      <EstatisticasDoPerfil
        dados={estatisticas.dados}
        aoTentarDeNovo={estatisticas.tentarDeNovo}
      />
      <section className={styles.secao} aria-labelledby="secao-seguranca">
        <h2 id="secao-seguranca" className={styles.titulo}>
          Segurança e privacidade
        </h2>
        <Link to="/conta/senha" className={styles.linhaDeLink}>
          <KeyRound size={20} aria-hidden="true" />
          <span>Trocar senha</span>
          <ChevronRight size={20} aria-hidden="true" />
        </Link>
        <DadosEPrivacidade />
      </section>
    </>
  )
}
