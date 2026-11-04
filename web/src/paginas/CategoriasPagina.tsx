import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { Categoria, TipoCategoria } from '../api/tipos.ts'
import styles from '../categorias/Categorias.module.css'
import { FormularioNovaCategoria } from '../categorias/FormularioNovaCategoria.tsx'
import { LinhaDaCategoria } from '../categorias/LinhaDaCategoria.tsx'
import { ordenarPorNome } from '../categorias/regras.ts'
import { useCategorias } from '../categorias/useCategorias.ts'
import { Aviso, type DadosDoAviso } from '../componentes/Aviso.tsx'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'

const SECOES: { tipo: TipoCategoria; titulo: string }[] = [
  { tipo: 'DESPESA', titulo: 'Despesas' },
  { tipo: 'RECEITA', titulo: 'Receitas' },
]

/**
 * Tela de categorias (#30): todas as categorias, separadas em despesas e receitas. As do
 * sistema aparecem como "Padrão"; as personalizadas podem ser criadas, renomeadas e excluídas
 * aqui mesmo, sem trocar de tela.
 */
export function CategoriasPagina() {
  const { estado, tentarDeNovo, alterarLista } = useCategorias()
  const [criando, setCriando] = useState(false)
  const [aviso, setAviso] = useState<DadosDoAviso | null>(null)
  const fecharAviso = useCallback(() => setAviso(null), [])

  const existentes = estado.situacao === 'pronto' ? estado.categorias : []

  function aoCriar(nova: Categoria) {
    alterarLista((lista) => [...lista, nova])
    setCriando(false)
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
          {SECOES.map(({ tipo, titulo }) => (
            <section
              key={tipo}
              className={styles.secao}
              aria-labelledby={`secao-${tipo}`}
            >
              <h2 id={`secao-${tipo}`} className={styles.tituloDaSecao}>
                {titulo}
              </h2>
              <ul className={styles.lista}>
                {ordenarPorNome(existentes.filter((c) => c.tipo === tipo)).map(
                  (categoria) => (
                    <LinhaDaCategoria
                      key={categoria.id}
                      categoria={categoria}
                      existentes={existentes}
                      aoAtualizar={aoAtualizar}
                      aoExcluir={aoExcluir}
                    />
                  ),
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      {aviso && <Aviso {...aviso} aoFechar={fecharAviso} />}
    </>
  )
}
