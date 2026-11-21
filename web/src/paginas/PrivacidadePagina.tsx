import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import styles from '../conta/Conta.module.css'
import { DadosEPrivacidade } from '../conta/DadosEPrivacidade.tsx'
import { ExcluirConta } from '../conta/ExcluirConta.tsx'
import { useSessao } from '../sessao/useSessao.ts'

/**
 * "Seus dados e privacidade" numa tela própria (#217): o que o app guarda e, no fim e discreto,
 * excluir a conta. Excluir fala com o servidor, então só aparece com a sessão confirmada.
 */
export function PrivacidadePagina() {
  const { estado } = useSessao()
  return (
    <>
      <Link to="/conta" className={styles.voltar}>
        <ChevronLeft size={20} aria-hidden="true" />
        Voltar para a Conta
      </Link>
      <CabecalhoPagina titulo="Seus dados e privacidade" />
      <DadosEPrivacidade />
      {estado.situacao === 'logado' && estado.confirmada && <ExcluirConta />}
    </>
  )
}
