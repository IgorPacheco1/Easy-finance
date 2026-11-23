import { Info, KeyRound, ShieldCheck } from 'lucide-react'
import type { Usuario } from '../api/tipos.ts'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { CartaoDoPerfil } from '../conta/CartaoDoPerfil.tsx'
import styles from '../conta/Conta.module.css'
import { EstatisticasDoPerfil } from '../conta/EstatisticasDoPerfil.tsx'
import { LinhaDaConta } from '../conta/LinhaDaConta.tsx'
import { Preferencias } from '../conta/Preferencias.tsx'
import { SairDaConta } from '../conta/SairDaConta.tsx'
import { useEstatisticas } from '../conta/useEstatisticas.ts'
import { useSessao } from '../sessao/useSessao.ts'

/**
 * "Conta" como perfil (#194), no layout do protótipo (#217): o cartão com avatar, nome e e-mail,
 * os números da pessoa, listas com ícones (preferências do aparelho, segurança e privacidade,
 * sobre o app) e o botão de sair. Excluir a conta fica dentro de "Seus dados e privacidade".
 */
export function ContaPagina() {
  const { estado, atualizarUsuario } = useSessao()
  // A rota é protegida, então aqui sempre há alguém; a conferência é para o TypeScript.
  if (estado.situacao !== 'logado') return null

  return (
    <>
      <CabecalhoPagina titulo="Conta" />
      <div className={styles.conta}>
        {estado.confirmada ? (
          <PerfilConfirmado
            aoMudar={atualizarUsuario}
            usuario={estado.usuario}
          />
        ) : (
          <>
            <CartaoDoPerfil
              usuario={estado.usuario}
              podeEditar={false}
              aoMudar={atualizarUsuario}
            />
            <p className={styles.texto} role="status">
              Sem conexão: sua sessão será conferida quando a internet voltar.
              Os lançamentos ficam guardados no aparelho até lá.
            </p>
          </>
        )}

        {/* Preferências são só do aparelho: funcionam até sem conexão (#195). */}
        <Preferencias />

        <section className={styles.grupo} aria-labelledby="secao-seguranca">
          <h2 id="secao-seguranca" className={styles.tituloDoGrupo}>
            Segurança e privacidade
          </h2>
          <div className={styles.lista}>
            {/* Trocar a senha fala com o servidor: só com a sessão confirmada. */}
            {estado.confirmada && (
              <LinhaDaConta
                icone={KeyRound}
                cor="azul"
                titulo="Trocar senha"
                para="/conta/senha"
              />
            )}
            <LinhaDaConta
              icone={ShieldCheck}
              cor="verde"
              titulo="Seus dados e privacidade"
              subtitulo="Como o app protege suas finanças"
              para="/conta/privacidade"
            />
          </div>
        </section>

        <section className={styles.lista} aria-label="Sobre o Guardá">
          <LinhaDaConta
            icone={Info}
            cor="cinza"
            titulo="Sobre o Guardá"
            subtitulo={`Versão ${__VERSAO_DO_APP__}`}
          />
        </section>

        <SairDaConta />
      </div>
    </>
  )
}

/** A parte que fala com o servidor: o perfil editável e as estatísticas. */
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
    </>
  )
}
