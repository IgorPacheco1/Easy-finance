import { Link, useSearchParams } from 'react-router'
import { CarregarMais } from '../componentes/CarregarMais.tsx'
import {
  formatarMes,
  mesAtual,
  mesValido,
  type Mes,
} from '../formatacao/datas.ts'
import { CartaoDoSaldo } from '../mes/CartaoDoSaldo.tsx'
import { ListaDoMes } from '../mes/ListaDoMes.tsx'
import styles from '../mes/Mes.module.css'
import { SeletorDeMes } from '../mes/SeletorDeMes.tsx'
import { useDadosDoMes } from '../mes/useDadosDoMes.ts'

/**
 * Tela do mês (#29): saldo em destaque e transações agrupadas por dia. As transações chegam
 * em páginas e a próxima é carregada ao rolar até o fim da lista (#92).
 *
 * O mês fica no endereço (/mes?m=2026-10). Assim o "voltar" do celular volta para o mês que
 * estava aberto antes, e recarregar a página não perde o mês. Sem `m` (ou com um valor
 * inválido), mostra o mês atual.
 */
export function MesPagina() {
  const [parametros, setParametros] = useSearchParams()
  const m = parametros.get('m')
  const mes: Mes = mesValido(m) ? m : mesAtual()
  const { dados, tentarDeNovo, carregarMais } = useDadosDoMes(mes)

  return (
    <>
      <SeletorDeMes mes={mes} aoMudar={(novo) => setParametros({ m: novo })} />

      {dados.situacao === 'carregando' && (
        <p className={styles.mensagem} role="status">
          Carregando…
        </p>
      )}

      {dados.situacao === 'erro' && (
        <div className={styles.vazio} role="alert">
          <p className={styles.mensagem}>{dados.mensagem}</p>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={tentarDeNovo}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {dados.situacao === 'pronto' && (
        <>
          <CartaoDoSaldo saldo={dados.saldo} />
          {dados.transacoes.length === 0 ? (
            <div className={styles.vazio}>
              <p className={styles.mensagem}>
                Nenhum lançamento em {formatarMes(mes).toLowerCase()}.
              </p>
              <Link to="/" className={styles.botaoSecundario}>
                Lançar agora
              </Link>
            </div>
          ) : (
            <>
              <ListaDoMes transacoes={dados.transacoes} />
              {dados.temMais && (
                <CarregarMais
                  aoCarregar={carregarMais}
                  carregando={dados.carregandoMais}
                  erro={dados.erroAoCarregarMais}
                />
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
