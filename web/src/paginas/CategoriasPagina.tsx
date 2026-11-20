import { Plus } from 'lucide-react'
import { useCallback, useState, type ReactNode } from 'react'
import type { Categoria, TipoCategoria } from '../api/tipos.ts'
import styles from '../categorias/Categorias.module.css'
import { FormularioNovaCategoria } from '../categorias/FormularioNovaCategoria.tsx'
import { LinhaDaCategoria } from '../categorias/LinhaDaCategoria.tsx'
import {
  separarPorMovimento,
  type Movimento,
} from '../categorias/movimentoDoMes.ts'
import { ordenarPorNome } from '../categorias/regras.ts'
import { useCategorias } from '../categorias/useCategorias.ts'
import { Aviso, type DadosDoAviso } from '../componentes/Aviso.tsx'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { formatarMes, mesAtual, periodoDoMes } from '../formatacao/datas.ts'
import { useResumoDoMes } from '../mes/useResumoDoMes.ts'
import { Valor } from '../mes/Valor.tsx'

/** Desenha uma categoria: em cartão (com movimento) ou em quadro (na grade). */
type FazerLinha = (
  categoria: Categoria,
  variante: 'cartao' | 'quadro',
  movimento?: Movimento,
) => ReactNode

const TIPOS: { tipo: TipoCategoria; rotulo: string }[] = [
  { tipo: 'DESPESA', rotulo: 'Despesas' },
  { tipo: 'RECEITA', rotulo: 'Receitas' },
]

/**
 * Tela de categorias (#30), redesenhada na #191: um tipo por vez (Despesas ou Receitas), com o que
 * cada categoria movimentou no mês atual. As que tiveram lançamento aparecem em cartões, com o
 * valor e uma barra comparando com a maior; as outras, numa grade menor. Tocar numa categoria abre
 * a Busca com os lançamentos dela no mês.
 *
 * Os valores vêm do resumo do mês (o mesmo do Mês), buscado à parte: se ele falhar, as
 * categorias continuam na tela, só sem os valores.
 */
export function CategoriasPagina() {
  const { estado, tentarDeNovo, alterarLista } = useCategorias()
  const mes = mesAtual()
  const resumo = useResumoDoMes(mes)
  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')
  const [criando, setCriando] = useState(false)
  const [aviso, setAviso] = useState<DadosDoAviso | null>(null)
  const fecharAviso = useCallback(() => setAviso(null), [])

  const existentes = estado.situacao === 'pronto' ? estado.categorias : []
  const doTipo = existentes.filter((c) => c.tipo === tipo)
  const periodo = periodoDoMes(mes)
  const nomeDoMes = formatarMes(mes).toLowerCase()
  const despesa = tipo === 'DESPESA'

  /** A Busca com os lançamentos da categoria no mês (ela lê o filtro do endereço, #94). */
  const enderecoDa = (categoria: Categoria) =>
    `/buscar?${new URLSearchParams({ categoriaId: categoria.id, ...periodo })}`

  function aoCriar(nova: Categoria) {
    alterarLista((lista) => [...lista, nova])
    setCriando(false)
    setTipo(nova.tipo) // mostra o tipo da categoria nova, para ela aparecer
    setAviso({ mensagem: `Categoria ${nova.nome} criada.` })
  }

  function aoAtualizar(atualizada: Categoria) {
    alterarLista((lista) =>
      lista.map((c) => (c.id === atualizada.id ? atualizada : c)),
    )
    setAviso({ mensagem: `Categoria renomeada para ${atualizada.nome}.` })
  }

  function aoExcluir(excluida: Categoria) {
    alterarLista((lista) => lista.filter((c) => c.id !== excluida.id))
    setAviso({ mensagem: `Categoria ${excluida.nome} excluída.` })
  }

  const linha: FazerLinha = (categoria, variante, movimento) => (
    <LinhaDaCategoria
      key={categoria.id}
      categoria={categoria}
      existentes={existentes}
      variante={variante}
      movimento={movimento}
      endereco={enderecoDa(categoria)}
      aoAtualizar={aoAtualizar}
      aoExcluir={aoExcluir}
    />
  )

  return (
    <>
      <div className={styles.topo}>
        <CabecalhoPagina titulo="Categorias" />
        {!criando && estado.situacao === 'pronto' && (
          <button
            type="button"
            className={styles.botaoNovo}
            onClick={() => setCriando(true)}
          >
            <Plus size={20} aria-hidden="true" />
            Nova
          </button>
        )}
      </div>

      {criando && (
        <FormularioNovaCategoria
          existentes={existentes}
          aoCriar={aoCriar}
          aoCancelar={() => setCriando(false)}
        />
      )}

      {estado.situacao === 'carregando' && (
        <p className={styles.mensagem} role="status">
          Carregando…
        </p>
      )}

      {estado.situacao === 'erro' && (
        <div className={styles.secao} role="alert">
          <p className={styles.mensagem}>{estado.mensagem}</p>
          <div className={styles.botoes}>
            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={tentarDeNovo}
            >
              Tentar de novo
            </button>
          </div>
        </div>
      )}

      {estado.situacao === 'pronto' && (
        <div className={styles.secoes}>
          <div
            className={styles.alternadorDaTela}
            role="group"
            aria-label="Tipo das categorias"
          >
            {TIPOS.map((opcao) => (
              <button
                key={opcao.tipo}
                type="button"
                className={styles.opcao}
                aria-pressed={tipo === opcao.tipo}
                onClick={() => setTipo(opcao.tipo)}
              >
                {opcao.rotulo}
              </button>
            ))}
          </div>

          {resumo.dados.situacao === 'pronto' ? (
            <ComValores
              tipo={tipo}
              nomeDoMes={nomeDoMes}
              {...separarPorMovimento(
                doTipo,
                despesa
                  ? resumo.dados.resumo.despesas
                  : resumo.dados.resumo.receitas,
              )}
              totalDoTipo={
                despesa
                  ? resumo.dados.resumo.despesas.total
                  : resumo.dados.resumo.receitas.total
              }
              quantidadeDoTipo={doTipo.length}
              linha={linha}
            />
          ) : (
            <section className={styles.secao} aria-labelledby="secao-todas">
              <h2 id="secao-todas" className={styles.tituloDaSecao}>
                {despesa ? 'Categorias de despesa' : 'Categorias de receita'}
              </h2>
              {resumo.dados.situacao === 'carregando' ? (
                <p className={styles.mensagem} role="status">
                  Carregando os valores do mês…
                </p>
              ) : (
                <div className={styles.avisoDoResumo} role="alert">
                  <p className={styles.mensagem}>
                    Não foi possível carregar os valores do mês.
                  </p>
                  <button
                    type="button"
                    className={styles.botaoSecundario}
                    onClick={resumo.tentarDeNovo}
                  >
                    Tentar de novo
                  </button>
                </div>
              )}
              <ul className={styles.grade}>
                {ordenarPorNome(doTipo).map((c) => linha(c, 'quadro'))}
              </ul>
            </section>
          )}
        </div>
      )}

      {aviso && <Aviso {...aviso} aoFechar={fecharAviso} />}
    </>
  )
}

function ComValores({
  tipo,
  nomeDoMes,
  comMovimento,
  semMovimento,
  totalDoTipo,
  quantidadeDoTipo,
  linha,
}: ReturnType<typeof separarPorMovimento> & {
  tipo: TipoCategoria
  nomeDoMes: string
  totalDoTipo: number
  quantidadeDoTipo: number
  linha: FazerLinha
}) {
  const despesa = tipo === 'DESPESA'
  return (
    <>
      <p className={styles.resumoDaTela}>
        <strong>
          <Valor valor={totalDoTipo} />
        </strong>{' '}
        {despesa ? 'gastos' : 'recebidos'} em {nomeDoMes} ·{' '}
        {comMovimento.length} de {quantidadeDoTipo}{' '}
        {despesa ? 'categorias com gasto' : 'categorias com receita'}
      </p>

      {comMovimento.length > 0 && (
        <section className={styles.secao} aria-labelledby="secao-com-movimento">
          <h2 id="secao-com-movimento" className={styles.tituloDaSecao}>
            {despesa ? 'Com gastos no mês' : 'Com receitas no mês'}
          </h2>
          <ul className={styles.cartoes}>
            {comMovimento.map(({ categoria, movimento }) =>
              linha(categoria, 'cartao', movimento),
            )}
          </ul>
        </section>
      )}

      {semMovimento.length > 0 && (
        <section className={styles.secao} aria-labelledby="secao-sem-movimento">
          <h2 id="secao-sem-movimento" className={styles.tituloDaSecao}>
            Sem movimento este mês
          </h2>
          <ul className={styles.grade}>
            {semMovimento.map((categoria) => linha(categoria, 'quadro'))}
          </ul>
        </section>
      )}
    </>
  )
}
