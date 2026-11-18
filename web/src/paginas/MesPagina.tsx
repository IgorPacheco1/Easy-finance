import { useCallback } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CarregarMais } from '../componentes/CarregarMais.tsx'
import { AvisoDePendentes } from '../fila/AvisoDePendentes.tsx'
import { useFila } from '../fila/useFila.ts'
import {
  formatarMes,
  mesAtual,
  mesValido,
  type Mes,
} from '../formatacao/datas.ts'
import { CartaoDoSaldo } from '../mes/CartaoDoSaldo.tsx'
import { ListaDoMes } from '../mes/ListaDoMes.tsx'
import { ResumoPorCategoria } from '../mes/ResumoPorCategoria.tsx'
import styles from '../mes/Mes.module.css'
import { SeletorDeMes } from '../mes/SeletorDeMes.tsx'
import { useResumoDoMes } from '../mes/useResumoDoMes.ts'
import { useSaldoDoMes } from '../mes/useSaldoDoMes.ts'
import { useTransacoesDoMes } from '../mes/useTransacoesDoMes.ts'

/**
 * Tela do mês (#29): saldo em destaque, resumo por categoria (#96) e transações agrupadas por
 * dia. As transações chegam em páginas e a próxima é carregada ao rolar até o fim da lista (#92).
 * Saldo, resumo e transações carregam cada um no seu tempo, com o próprio erro e o próprio
 * "Tentar de novo" (#153): uma parte que falha não esconde as outras.
 *
 * O mês fica no endereço (/mes?m=2026-10). Assim o "voltar" do celular volta para o mês que
 * estava aberto antes, e recarregar a página não perde o mês. Sem `m` (ou com um valor
 * inválido), mostra o mês atual.
 */
export function MesPagina() {
  const [parametros, setParametros] = useSearchParams()
  const m = parametros.get('m')
  const mes: Mes = mesValido(m) ? m : mesAtual()
  const { dados, tentarDeNovo, carregarMais } = useTransacoesDoMes(mes)
  const saldo = useSaldoDoMes(mes)
  const resumo = useResumoDoMes(mes)
  const recarregarSaldo = saldo.tentarDeNovo
  const recarregarResumo = resumo.tentarDeNovo
  // Quando algum lançamento guardado no aparelho chega ao servidor, o mês é buscado de novo.
  const aoEnviarDaFila = useCallback(() => {
    tentarDeNovo()
    recarregarSaldo()
    recarregarResumo()
  }, [tentarDeNovo, recarregarSaldo, recarregarResumo])
  const fila = useFila(aoEnviarDaFila)
  const temLancamentos =
    dados.situacao === 'pronto' && dados.transacoes.length > 0

  return (
    <>
      <SeletorDeMes mes={mes} aoMudar={(novo) => setParametros({ m: novo })} />
      <AvisoDePendentes fila={fila} />
      <div className={styles.colunas}>
        {/* No computador, saldo e resumo ficam numa coluna à esquerda, parados, e a lista ao
            lado (#161). No celular as duas "colunas" somem e tudo fica um embaixo do outro. */}
        <div className={styles.colunaDoSaldo}>
          <CartaoDoSaldo
            dados={saldo.dados}
            aoTentarDeNovo={saldo.tentarDeNovo}
          />
          {temLancamentos && (
            <ResumoPorCategoria
              dados={resumo.dados}
              aoTentarDeNovo={resumo.tentarDeNovo}
            />
          )}
        </div>

        <div className={styles.colunaDaLista}>
          {dados.situacao === 'carregando' && (
            <p className={styles.mensagem} role="status">
              Carregando lançamentos…
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

          {dados.situacao === 'pronto' && !temLancamentos && (
            <div className={styles.vazio}>
              <p className={styles.mensagem}>
                Nenhum lançamento em {formatarMes(mes).toLowerCase()}.
              </p>
              <Link to="/" className={styles.botaoSecundario}>
                Lançar agora
              </Link>
            </div>
          )}

          {dados.situacao === 'pronto' && temLancamentos && (
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
        </div>
      </div>
    </>
  )
}
