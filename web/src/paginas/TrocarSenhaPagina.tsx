import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import styles from '../conta/Conta.module.css'
import { TrocarSenha } from '../conta/TrocarSenha.tsx'

/** Trocar a senha, numa tela própria (#194), em vez de ocupar a tela Conta. */
export function TrocarSenhaPagina() {
  return (
    <>
      <Link to="/conta" className={styles.voltar}>
        <ChevronLeft size={20} aria-hidden="true" />
        Voltar para a Conta
      </Link>
      <CabecalhoPagina titulo="Trocar senha" />
      <TrocarSenha />
    </>
  )
}
