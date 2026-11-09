import { useState } from 'react'
import type { TipoCategoria } from '../api/tipos.ts'
import { ordenarPorNome } from '../categorias/regras.ts'
import { useCategorias } from '../categorias/useCategorias.ts'
import { digitosDoCampo, formatarDigitos } from '../lancamento/valor.ts'
import styles from './Busca.module.css'
import { FILTRO_VAZIO, type FiltroDaBusca } from './filtroDaBusca.ts'

type Props = {
  /** O filtro em uso agora; o painel começa com ele e só muda a busca ao aplicar. */
  filtro: FiltroDaBusca
  aoAplicar: (filtro: FiltroDaBusca) => void
}

/**
 * Filtros da busca (#94): tipo, categoria, faixa de valor e período. As mudanças ficam num
 * rascunho e só valem ao tocar em "Aplicar": assim a busca não dispara a cada dígito do valor
 * ou a cada data escolhida, e a pessoa ajusta tudo antes de buscar.
 *
 * Os campos são os nativos do navegador (select e date): no celular, eles abrem a roleta e o
 * calendário do próprio sistema, que são acessíveis e familiares.
 */
export function PainelDeFiltros({ filtro, aoAplicar }: Props) {
  const [rascunho, setRascunho] = useState(filtro)
  const { estado } = useCategorias()

  function mudar(mudanca: Partial<FiltroDaBusca>) {
    setRascunho((atual) => ({ ...atual, ...mudanca }))
  }

  const categorias =
    estado.situacao === 'pronto'
      ? ordenarPorNome(
          estado.categorias.filter(
            (categoria) => !rascunho.tipo || categoria.tipo === rascunho.tipo,
          ),
        )
      : []

  function aoMudarTipo(tipo: TipoCategoria | '') {
    // Uma categoria de despesa não combina com "só receitas": a escolha de categoria é desfeita.
    const categoria =
      estado.situacao === 'pronto'
        ? estado.categorias.find((c) => c.id === rascunho.categoriaId)
        : undefined
    const continuaValida = !tipo || !categoria || categoria.tipo === tipo
    mudar({ tipo, categoriaId: continuaValida ? rascunho.categoriaId : '' })
  }

  return (
    <form
      id="painel-de-filtros"
      className={styles.painel}
      aria-label="Filtros"
      onSubmit={(evento) => {
        evento.preventDefault()
        aoAplicar(rascunho)
      }}
    >
      <div className={styles.linha}>
        <div className={styles.grupo}>
          <label htmlFor="filtro-tipo" className={styles.rotulo}>
            Tipo
          </label>
          <select
            id="filtro-tipo"
            className={styles.campo}
            value={rascunho.tipo}
            onChange={(evento) =>
              aoMudarTipo(evento.target.value as TipoCategoria | '')
            }
          >
            <option value="">Todos</option>
            <option value="DESPESA">Despesas</option>
            <option value="RECEITA">Receitas</option>
          </select>
        </div>

        <div className={styles.grupo}>
          <label htmlFor="filtro-categoria" className={styles.rotulo}>
            Categoria
          </label>
          <select
            id="filtro-categoria"
            className={styles.campo}
            value={rascunho.categoriaId}
            onChange={(evento) => mudar({ categoriaId: evento.target.value })}
          >
            <option value="">
              {estado.situacao === 'carregando' ? 'Carregando…' : 'Todas'}
            </option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.linha}>
        <CampoDeValor
          id="filtro-valor-minimo"
          rotulo="Valor mínimo"
          digitos={rascunho.valorMinimo}
          aoMudar={(valorMinimo) => mudar({ valorMinimo })}
        />
        <CampoDeValor
          id="filtro-valor-maximo"
          rotulo="Valor máximo"
          digitos={rascunho.valorMaximo}
          aoMudar={(valorMaximo) => mudar({ valorMaximo })}
        />
      </div>

      <div className={styles.linha}>
        <div className={styles.grupo}>
          <label htmlFor="filtro-de" className={styles.rotulo}>
            De
          </label>
          <input
            id="filtro-de"
            type="date"
            className={styles.campo}
            value={rascunho.de}
            max={rascunho.ate || undefined}
            onChange={(evento) => mudar({ de: evento.target.value })}
          />
        </div>
        <div className={styles.grupo}>
          <label htmlFor="filtro-ate" className={styles.rotulo}>
            Até
          </label>
          <input
            id="filtro-ate"
            type="date"
            className={styles.campo}
            value={rascunho.ate}
            min={rascunho.de || undefined}
            onChange={(evento) => mudar({ ate: evento.target.value })}
          />
        </div>
      </div>

      <div className={styles.botoes}>
        <button
          type="button"
          className={styles.botaoSecundario}
          onClick={() =>
            setRascunho({ ...FILTRO_VAZIO, descricao: rascunho.descricao })
          }
        >
          Limpar filtros
        </button>
        <button type="submit" className={styles.botaoPrincipal}>
          Aplicar
        </button>
      </div>
    </form>
  )
}

/**
 * Valor no estilo caixa registradora, como na tela de lançamento (lancamento/valor.ts). Vazio
 * quer dizer "sem limite", por isso o campo fica em branco (e não "0,00") até a pessoa digitar.
 */
function CampoDeValor({
  id,
  rotulo,
  digitos,
  aoMudar,
}: {
  id: string
  rotulo: string
  digitos: string
  aoMudar: (digitos: string) => void
}) {
  return (
    <div className={styles.grupo}>
      <label htmlFor={id} className={styles.rotulo}>
        {rotulo}
      </label>
      <input
        id={id}
        className={styles.campo}
        inputMode="numeric"
        autoComplete="off"
        placeholder="R$ 0,00"
        value={digitos ? `R$ ${formatarDigitos(digitos)}` : ''}
        onChange={(evento) =>
          aoMudar(digitosDoCampo(evento.target.value, digitos))
        }
      />
    </div>
  )
}
