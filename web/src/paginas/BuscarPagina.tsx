import { SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import styles from '../busca/Busca.module.css'
import {
  FILTRO_VAZIO,
  lerDoEndereco,
  paraEndereco,
  periodoIncompleto,
  quantosFiltros,
  type FiltroDaBusca,
} from '../busca/filtroDaBusca.ts'
import { PainelDeFiltros } from '../busca/PainelDeFiltros.tsx'
import { useBusca } from '../busca/useBusca.ts'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { CarregarMais } from '../componentes/CarregarMais.tsx'
import { ListaDoMes } from '../mes/ListaDoMes.tsx'
import estilosDoMes from '../mes/Mes.module.css'

/** Quanto esperar depois da última tecla para buscar: não sai um pedido a cada letra. */
export const ESPERA_DA_DIGITACAO_MS = 500

/**
 * Tela de busca (#94): encontra lançamentos de qualquer época pelo texto da descrição e pelos
 * filtros (tipo, categoria, faixa de valor e período), com rolagem infinita.
 *
 * A busca fica no endereço (/buscar?descricao=uber&tipo=DESPESA), como o mês na tela do mês:
 * voltar, recarregar ou abrir o endereço de novo mostra a mesma busca. Sem nada preenchido, a
 * tela lista todos os lançamentos, do mais recente para o mais antigo.
 */
export function BuscarPagina() {
  const [parametros, setParametros] = useSearchParams()
  const filtro = lerDoEndereco(parametros)
  // A busca em forma de texto, normalizada: a mesma busca sempre dá o mesmo texto.
  const consulta = new URLSearchParams(paraEndereco(filtro)).toString()
  const { dados, tentarDeNovo, carregarMais } = useBusca(consulta)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  // O campo de texto muda a cada tecla; o endereço (e a busca) só depois da pausa. Se o endereço
  // mudar por outro caminho (voltar, "Limpar busca"), o campo acompanha. Ajustar o estado durante
  // a renderização, comparando com o valor anterior, é o jeito que a documentação do React indica
  // para isso, em vez de um useEffect.
  const [texto, setTexto] = useState(filtro.descricao)
  const [descricaoAnterior, setDescricaoAnterior] = useState(filtro.descricao)
  if (filtro.descricao !== descricaoAnterior) {
    setDescricaoAnterior(filtro.descricao)
    setTexto(filtro.descricao)
  }

  useEffect(() => {
    const atual = lerDoEndereco(new URLSearchParams(consulta))
    if (texto.trim() === atual.descricao.trim()) return
    const espera = setTimeout(() => {
      // replace: digitar não enche o histórico; o "voltar" sai da busca, e não letra por letra.
      setParametros(paraEndereco({ ...atual, descricao: texto }), {
        replace: true,
      })
    }, ESPERA_DA_DIGITACAO_MS)
    return () => clearTimeout(espera)
  }, [texto, consulta, setParametros])

  function aplicar(novo: FiltroDaBusca) {
    setParametros(paraEndereco({ ...novo, descricao: texto }))
    setFiltrosAbertos(false)
  }

  const filtrosAtivos = quantosFiltros(filtro)
  const temBusca = filtrosAtivos > 0 || filtro.descricao !== ''

  return (
    <>
      <CabecalhoPagina titulo="Buscar" />

      <form
        role="search"
        className={styles.barra}
        onSubmit={(evento) => evento.preventDefault()}
      >
        <input
          type="search"
          className={styles.campoDeBusca}
          aria-label="Buscar na descrição"
          placeholder="Buscar na descrição"
          enterKeyHint="search"
          maxLength={255}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
        />
        <button
          type="button"
          className={styles.botaoFiltros}
          aria-label={
            filtrosAtivos > 0 ? `Filtros (${filtrosAtivos} ativos)` : 'Filtros'
          }
          aria-expanded={filtrosAbertos}
          aria-controls="painel-de-filtros"
          onClick={() => setFiltrosAbertos((aberto) => !aberto)}
        >
          <SlidersHorizontal size={18} aria-hidden="true" />
          Filtros
          {filtrosAtivos > 0 && (
            <span className={styles.contador}>{filtrosAtivos}</span>
          )}
        </button>
      </form>

      {filtrosAbertos && (
        <PainelDeFiltros filtro={filtro} aoAplicar={aplicar} />
      )}

      {periodoIncompleto(filtro) && (
        <p className={styles.aviso}>
          Escolha as duas datas para filtrar por período.
        </p>
      )}

      {dados.situacao === 'carregando' && (
        <p className={estilosDoMes.mensagem} role="status">
          Buscando…
        </p>
      )}

      {dados.situacao === 'erro' && (
        <div className={estilosDoMes.vazio} role="alert">
          <p className={estilosDoMes.mensagem}>{dados.mensagem}</p>
          <button
            type="button"
            className={estilosDoMes.botaoSecundario}
            onClick={tentarDeNovo}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {dados.situacao === 'pronto' &&
        (dados.transacoes.length === 0 ? (
          <div className={estilosDoMes.vazio}>
            {temBusca ? (
              <>
                <p className={estilosDoMes.mensagem}>
                  Nenhum lançamento encontrado.
                </p>
                <button
                  type="button"
                  className={estilosDoMes.botaoSecundario}
                  onClick={() => setParametros(paraEndereco(FILTRO_VAZIO))}
                >
                  Limpar busca
                </button>
              </>
            ) : (
              <>
                <p className={estilosDoMes.mensagem}>
                  Nenhum lançamento ainda.
                </p>
                <Link to="/" className={estilosDoMes.botaoSecundario}>
                  Lançar agora
                </Link>
              </>
            )}
          </div>
        ) : (
          <>
            <ListaDoMes transacoes={dados.transacoes} />
            {dados.temMais ? (
              <CarregarMais
                aoCarregar={carregarMais}
                carregando={dados.carregandoMais}
                erro={dados.erroAoCarregarMais}
              />
            ) : (
              <p className={styles.fimDaLista}>Fim dos resultados.</p>
            )}
          </>
        ))}
    </>
  )
}
