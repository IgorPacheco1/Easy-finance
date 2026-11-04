import { Link } from 'react-router'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'

/** Endereço que não existe no app (por exemplo, um link antigo ou digitado errado). */
export function PaginaNaoEncontrada() {
  return (
    <>
      <CabecalhoPagina
        titulo="Página não encontrada"
        descricao="Esse endereço não existe no app."
      />
      <Link to="/">Voltar para o lançamento</Link>
    </>
  )
}
