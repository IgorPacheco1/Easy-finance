import { ChevronLeft } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { ErroDaApi } from '../api/cliente.ts'
import type { TipoCategoria } from '../api/tipos.ts'
import {
  atualizarTransacao,
  buscarTransacao,
  excluirTransacao,
} from '../api/transacoes.ts'
import { useCategorias } from '../categorias/useCategorias.ts'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import formulario from '../componentes/Formulario.module.css'
import {
  hoje as calcularHoje,
  ontem as calcularOntem,
} from '../formatacao/datas.ts'
import { CampoValor } from '../lancamento/CampoValor.tsx'
import editar from '../lancamento/Editar.module.css'
import { EscolhaDeCategoria } from '../lancamento/EscolhaDeCategoria.tsx'
import { EscolhaDeData } from '../lancamento/EscolhaDeData.tsx'
import styles from '../lancamento/Lancamento.module.css'
import {
  TAMANHO_MAXIMO_DA_DESCRICAO,
  validarLancamento,
  type ErrosDoLancamento,
} from '../lancamento/validacao.ts'
import { valorParaApi } from '../lancamento/valor.ts'

/** Editar e excluir mexem direto no servidor: sem internet, não dá (a fila do aparelho só cria, ADR-0019). */
export const MENSAGEM_SEM_CONEXAO =
  'Sem conexão. Para editar ou excluir um lançamento é preciso estar com internet.'

type Carga =
  | { situacao: 'carregando' }
  | { situacao: 'pronto' }
  | { situacao: 'naoEncontrado' }
  | { situacao: 'erro'; mensagem: string }

/** Estado que a lista do Mês e a da Busca mandam junto com o link, para voltar ao mesmo lugar. */
type EstadoRecebido = { voltarPara?: string } | null

/** Valor da API (52.9) para os dígitos do campo de valor ("5290"). */
function digitosDoValor(valor: number): string {
  return Math.round(valor * 100).toString()
}

/**
 * Editar ou excluir um lançamento (#101). Abre já preenchida com os dados do servidor e reaproveita
 * os campos da tela de lançamento. Depois de salvar ou excluir, volta para a lista de onde a
 * pessoa veio (Mês ou Busca) com um aviso.
 */
export function EditarLancamentoPagina() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const estadoRecebido = useLocation().state as EstadoRecebido
  const { estado: categorias, tentarDeNovo: recarregarCategorias } =
    useCategorias()

  const [carga, setCarga] = useState<Carga>({ situacao: 'carregando' })
  const [tentativa, setTentativa] = useState(0)

  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')
  const [digitos, setDigitos] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')

  const [erros, setErros] = useState<ErrosDoLancamento>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const botaoCancelarExclusao = useRef<HTMLButtonElement>(null)

  const hoje = calcularHoje()
  const ontem = calcularOntem()

  useEffect(() => {
    let ativo = true
    buscarTransacao(id)
      .then((transacao) => {
        if (!ativo) return
        setTipo(transacao.categoria.tipo)
        setDigitos(digitosDoValor(transacao.valor))
        setCategoriaId(transacao.categoria.id)
        setData(transacao.data)
        setDescricao(transacao.descricao ?? '')
        setCarga({ situacao: 'pronto' })
      })
      .catch((erro: unknown) => {
        if (!ativo) return
        setCarga(cargaDoErro(erro))
      })
    return () => {
      ativo = false
    }
  }, [id, tentativa])

  // Ao abrir a confirmação, o foco vai para "Cancelar": um Enter sem querer não apaga nada.
  useEffect(() => {
    if (confirmandoExclusao) botaoCancelarExclusao.current?.focus()
  }, [confirmandoExclusao])

  function tentarDeNovo() {
    setCarga({ situacao: 'carregando' })
    setTentativa((n) => n + 1)
  }

  /** Para onde voltar: a lista de onde veio ou, se abriu direto pelo endereço, o mês do lançamento. */
  function voltarComAviso(aviso: string) {
    const destino = estadoRecebido?.voltarPara ?? `/mes?m=${data.slice(0, 7)}`
    // `replace`: o "voltar" do celular não reabre um lançamento que acabou de ser salvo ou excluído.
    void navegar(destino, { replace: true, state: { aviso } })
  }

  function trocarTipo(novo: TipoCategoria) {
    setTipo(novo)
    setCategoriaId(null) // as categorias de despesa e de receita são diferentes
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroGeral(null)

    const errosLocais = validarLancamento(
      { digitos, categoriaId, data, descricao },
      hoje,
    )
    setErros(errosLocais)
    if (Object.keys(errosLocais).length > 0 || !categoriaId) {
      return
    }

    setEnviando(true)
    try {
      await atualizarTransacao(id, {
        valor: valorParaApi(digitos),
        data,
        descricao: descricao.trim() || undefined,
        categoriaId,
      })
      voltarComAviso('Lançamento salvo.')
    } catch (erro) {
      tratarErro(erro)
      setEnviando(false)
    }
  }

  async function excluir() {
    setErroGeral(null)
    setEnviando(true)
    try {
      await excluirTransacao(id)
      voltarComAviso('Lançamento excluído.')
    } catch (erro) {
      setConfirmandoExclusao(false)
      tratarErro(erro)
      setEnviando(false)
    }
  }

  function tratarErro(erro: unknown) {
    if (erro instanceof ErroDaApi && erro.erros.length > 0) {
      // A API recusou algum campo: a mensagem dela aparece embaixo do campo certo.
      setErros({
        valor: erro.erroDoCampo('valor'),
        categoriaId: erro.erroDoCampo('categoriaId'),
        data: erro.erroDoCampo('data'),
        descricao: erro.erroDoCampo('descricao'),
      })
      return
    }
    const carga = cargaDoErro(erro)
    if (carga.situacao === 'naoEncontrado') {
      // Foi excluído em outro aparelho enquanto esta tela estava aberta.
      setCarga(carga)
    } else if (carga.situacao === 'erro') {
      setErroGeral(carga.mensagem)
    }
  }

  return (
    <>
      <Link to={estadoRecebido?.voltarPara ?? '/mes'} className={editar.voltar}>
        <ChevronLeft aria-hidden="true" size={20} />
        Voltar
      </Link>
      <CabecalhoPagina titulo="Editar lançamento" />

      {carga.situacao === 'carregando' && (
        <p className={styles.mensagem}>Carregando o lançamento…</p>
      )}

      {carga.situacao === 'naoEncontrado' && (
        <div className={editar.estado}>
          <p>Lançamento não encontrado. Ele pode ter sido excluído.</p>
          <Link to="/mes">Ir para o mês</Link>
        </div>
      )}

      {carga.situacao === 'erro' && (
        <div className={editar.estado}>
          <p role="alert">{carga.mensagem}</p>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={tentarDeNovo}
          >
            Tentar de novo
          </button>
        </div>
      )}

      {carga.situacao === 'pronto' && (
        <>
          <form className={styles.formulario} onSubmit={salvar} noValidate>
            <div
              className={styles.alternador}
              role="group"
              aria-label="Tipo do lançamento"
            >
              <button
                type="button"
                className={styles.opcaoDoAlternador}
                aria-pressed={tipo === 'DESPESA'}
                onClick={() => trocarTipo('DESPESA')}
              >
                Despesa
              </button>
              <button
                type="button"
                className={styles.opcaoDoAlternador}
                aria-pressed={tipo === 'RECEITA'}
                onClick={() => trocarTipo('RECEITA')}
              >
                Receita
              </button>
            </div>

            <CampoValor
              digitos={digitos}
              aoMudar={setDigitos}
              erro={erros.valor}
            />

            <EscolhaDeCategoria
              estado={categorias}
              tipo={tipo}
              selecionada={categoriaId}
              aoEscolher={setCategoriaId}
              aoTentarDeNovo={recarregarCategorias}
              erro={erros.categoriaId}
            />

            <EscolhaDeData
              data={data}
              hoje={hoje}
              ontem={ontem}
              aoMudar={setData}
              erro={erros.data}
            />

            <div className={styles.grupo}>
              <label htmlFor="descricao" className={styles.rotulo}>
                Descrição (opcional)
              </label>
              <input
                id="descricao"
                className={styles.campo}
                placeholder="Ex.: feira do sábado"
                maxLength={TAMANHO_MAXIMO_DA_DESCRICAO}
                value={descricao}
                onChange={(evento) => setDescricao(evento.target.value)}
                aria-invalid={erros.descricao ? true : undefined}
                aria-describedby={
                  erros.descricao ? 'erro-descricao' : undefined
                }
              />
              {erros.descricao && (
                <p id="erro-descricao" className={styles.erroDoCampo}>
                  {erros.descricao}
                </p>
              )}
            </div>

            {erroGeral && (
              <p className={styles.erroGeral} role="alert">
                {erroGeral}
              </p>
            )}

            <button
              type="submit"
              className={styles.botaoPrincipal}
              disabled={enviando}
            >
              {enviando && !confirmandoExclusao
                ? 'Salvando…'
                : 'Salvar alterações'}
            </button>
          </form>

          <section className={editar.exclusao} aria-label="Excluir lançamento">
            {confirmandoExclusao ? (
              <>
                <p className={editar.pergunta}>
                  Excluir este lançamento? Não dá para desfazer.
                </p>
                <div className={formulario.botoes}>
                  <button
                    ref={botaoCancelarExclusao}
                    type="button"
                    className={formulario.botaoSecundario}
                    onClick={() => setConfirmandoExclusao(false)}
                    disabled={enviando}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={formulario.botaoPerigo}
                    onClick={() => void excluir()}
                    disabled={enviando}
                  >
                    {enviando ? 'Excluindo…' : 'Excluir'}
                  </button>
                </div>
              </>
            ) : (
              <div className={formulario.botoes}>
                <button
                  type="button"
                  className={formulario.botaoPerigo}
                  onClick={() => setConfirmandoExclusao(true)}
                  disabled={enviando}
                >
                  Excluir lançamento
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  )
}

/** O que a tela mostra quando falha falar com a API. */
function cargaDoErro(erro: unknown): Carga {
  if (erro instanceof ErroDaApi) {
    // 404: não existe ou é de outra pessoa; a API não diferencia, de propósito (ADR-0026).
    if (erro.status === 404) return { situacao: 'naoEncontrado' }
    if (erro.status === 0)
      return { situacao: 'erro', mensagem: MENSAGEM_SEM_CONEXAO }
    return { situacao: 'erro', mensagem: erro.detalhe }
  }
  return { situacao: 'erro', mensagem: 'Algo deu errado. Tente de novo.' }
}
