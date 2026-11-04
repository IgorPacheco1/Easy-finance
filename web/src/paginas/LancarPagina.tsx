import { useCallback, useRef, useState, type FormEvent } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import type { TipoCategoria } from '../api/tipos.ts'
import { criarTransacao, excluirTransacao } from '../api/transacoes.ts'
import { Aviso, type DadosDoAviso } from '../componentes/Aviso.tsx'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { CampoValor } from '../lancamento/CampoValor.tsx'
import {
  hoje as calcularHoje,
  ontem as calcularOntem,
} from '../formatacao/datas.ts'
import { EscolhaDeCategoria } from '../lancamento/EscolhaDeCategoria.tsx'
import { EscolhaDeData } from '../lancamento/EscolhaDeData.tsx'
import { gerarId } from '../lancamento/id.ts'
import styles from '../lancamento/Lancamento.module.css'
import { useCategorias } from '../categorias/useCategorias.ts'
import {
  TAMANHO_MAXIMO_DA_DESCRICAO,
  validarLancamento,
  type ErrosDoLancamento,
} from '../lancamento/validacao.ts'
import { formatarMoeda } from '../formatacao/moeda.ts'
import { valorParaApi } from '../lancamento/valor.ts'

/**
 * Tela de lançamento rápido (#28). Depois de digitar o valor: um toque na categoria e um no
 * botão. O tipo começa em Despesa e a data em Hoje.
 */
export function LancarPagina() {
  const { estado: categorias, tentarDeNovo } = useCategorias()
  const campoValor = useRef<HTMLInputElement>(null)

  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')
  const [digitos, setDigitos] = useState('')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [data, setData] = useState(() => calcularHoje())
  const [descricao, setDescricao] = useState('')
  /**
   * Id deste lançamento, gerado no aparelho. Ele só muda depois de um envio bem-sucedido:
   * se o envio falhar e a pessoa tentar de novo, vai o mesmo id, e a API não duplica (#19).
   */
  const [id, setId] = useState(() => gerarId())

  const [erros, setErros] = useState<ErrosDoLancamento>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<DadosDoAviso | null>(null)
  const fecharAviso = useCallback(() => setAviso(null), [])

  const hoje = calcularHoje()
  const ontem = calcularOntem()
  const nomeDoTipo = tipo === 'DESPESA' ? 'despesa' : 'receita'

  function trocarTipo(novo: TipoCategoria) {
    setTipo(novo)
    setCategoriaId(null) // as categorias de despesa e de receita são diferentes
  }

  async function desfazer(idLancado: string) {
    setAviso(null)
    try {
      await excluirTransacao(idLancado)
      setAviso({ mensagem: 'Lançamento desfeito.' })
    } catch (erro) {
      setAviso({
        mensagem:
          erro instanceof ErroDaApi
            ? erro.detalhe
            : 'Não foi possível desfazer o lançamento.',
      })
    }
  }

  async function lancar(evento: FormEvent<HTMLFormElement>) {
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
      const transacao = await criarTransacao({
        id,
        valor: valorParaApi(digitos),
        data,
        descricao: descricao.trim() || undefined,
        categoriaId,
      })
      setAviso({
        mensagem: `${tipo === 'DESPESA' ? 'Despesa' : 'Receita'} de ${formatarMoeda(transacao.valor)} lançada.`,
        acao: { rotulo: 'Desfazer', aoClicar: () => desfazer(transacao.id) },
      })
      // Pronto para o próximo: mantém o tipo e a data, limpa o resto e gera um id novo.
      setDigitos('')
      setCategoriaId(null)
      setDescricao('')
      setId(gerarId())
      campoValor.current?.focus()
    } catch (erro) {
      tratarErro(erro)
    } finally {
      setEnviando(false)
    }
  }

  function tratarErro(erro: unknown) {
    if (!(erro instanceof ErroDaApi)) {
      setErroGeral('Algo deu errado. Tente de novo.')
      return
    }
    if (erro.erros.length > 0) {
      // A API recusou algum campo: a mensagem dela aparece embaixo do campo certo.
      setErros({
        valor: erro.erroDoCampo('valor'),
        categoriaId: erro.erroDoCampo('categoriaId'),
        data: erro.erroDoCampo('data'),
        descricao: erro.erroDoCampo('descricao'),
      })
      return
    }
    if (erro.status === 409) {
      // O mesmo id já foi gravado com outros dados (por exemplo, um envio anterior chegou ao
      // servidor e depois o valor foi mudado). Um id novo deixa lançar estes dados.
      setId(gerarId())
      setErroGeral(
        'Um lançamento anterior com outros dados já foi registrado. Confira na tela do Mês antes de lançar de novo.',
      )
      return
    }
    // Inclusive sem conexão (status 0): o id continua o mesmo, então tentar de novo é seguro.
    setErroGeral(erro.detalhe)
  }

  return (
    <>
      <CabecalhoPagina titulo="Lançar" />

      <form className={styles.formulario} onSubmit={lancar} noValidate>
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
          ref={campoValor}
          digitos={digitos}
          aoMudar={setDigitos}
          erro={erros.valor}
        />

        <EscolhaDeCategoria
          estado={categorias}
          tipo={tipo}
          selecionada={categoriaId}
          aoEscolher={setCategoriaId}
          aoTentarDeNovo={tentarDeNovo}
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
            aria-describedby={erros.descricao ? 'erro-descricao' : undefined}
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
          {enviando ? 'Lançando…' : `Lançar ${nomeDoTipo}`}
        </button>
      </form>

      {aviso && <Aviso {...aviso} aoFechar={fecharAviso} />}
    </>
  )
}
