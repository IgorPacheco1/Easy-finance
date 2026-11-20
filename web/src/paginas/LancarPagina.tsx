import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ErroDaApi } from '../api/cliente.ts'
import type { TipoCategoria } from '../api/tipos.ts'
import { excluirTransacao } from '../api/transacoes.ts'
import { useCategorias } from '../categorias/useCategorias.ts'
import { Aviso, type DadosDoAviso } from '../componentes/Aviso.tsx'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina.tsx'
import { AvisoDePendentes } from '../fila/AvisoDePendentes.tsx'
import { lerFila, tirarDaFila } from '../fila/banco.ts'
import { lancarOuGuardar } from '../fila/envio.ts'
import { pedirEnvioEmSegundoPlano } from '../fila/segundoPlano.ts'
import { useFila } from '../fila/useFila.ts'
import {
  hoje as calcularHoje,
  ontem as calcularOntem,
} from '../formatacao/datas.ts'
import {
  Confirmacao,
  type DadosDaConfirmacao,
} from '../lancamento/Confirmacao.tsx'
import { DetalhesDoLancamento } from '../lancamento/DetalhesDoLancamento.tsx'
import { GradeDeCategorias } from '../lancamento/GradeDeCategorias.tsx'
import { gerarId } from '../lancamento/id.ts'
import styles from '../lancamento/Lancamento.module.css'
import { TecladoNumerico } from '../lancamento/TecladoNumerico.tsx'
import { useTecladoFisico } from '../lancamento/useTecladoFisico.ts'
import {
  validarLancamento,
  type ErrosDoLancamento,
} from '../lancamento/validacao.ts'
import {
  apagarDigito,
  digitarTecla,
  formatarDigitos,
  valorParaApi,
} from '../lancamento/valor.ts'

/**
 * Tela de lançamento rápido (#28), no jeito de uma calculadora (#187): digita o valor no teclado
 * da tela, toca na categoria e no botão. O tipo começa em Despesa e a data em Hoje. Depois de
 * lançar, uma confirmação mostra o que foi feito, com "Lançar outra" e "Desfazer".
 */
export function LancarPagina() {
  // As mais usadas primeiro (#97): a categoria de sempre aparece logo, sem procurar na lista.
  // Com cópia no aparelho, para dar para lançar sem internet (#100).
  const { estado: categorias, tentarDeNovo } = useCategorias('USO', {
    copiaNoAparelho: true,
  })
  const fila = useFila()
  const formulario = useRef<HTMLFormElement>(null)
  const visor = useRef<HTMLOutputElement>(null)

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
  const [confirmacao, setConfirmacao] = useState<DadosDaConfirmacao | null>(
    null,
  )
  const [desfazendo, setDesfazendo] = useState(false)
  const [aviso, setAviso] = useState<DadosDoAviso | null>(null)
  const fecharAviso = useCallback(() => setAviso(null), [])

  const hoje = calcularHoje()
  const ontem = calcularOntem()
  const nomeDoTipo = tipo === 'DESPESA' ? 'despesa' : 'receita'

  const digitar = (tecla: string) => setDigitos((d) => digitarTecla(d, tecla))
  const apagar = () => setDigitos(apagarDigito)

  // O teclado físico só vale com o formulário na tela (na confirmação, as teclas são dos botões)
  // e fora do envio (um Enter a mais não manda o lançamento duas vezes).
  useTecladoFisico(confirmacao === null && !enviando, {
    aoDigitar: digitar,
    aoApagar: apagar,
    aoConfirmar: () => formulario.current?.requestSubmit(),
  })

  // Voltando da confirmação, o foco vai para o valor: dá para digitar o próximo direto.
  const voltarAoValor = useRef(false)
  useEffect(() => {
    if (confirmacao === null && voltarAoValor.current) {
      voltarAoValor.current = false
      visor.current?.focus()
    }
  }, [confirmacao])

  function voltarAoFormulario() {
    voltarAoValor.current = true
    setConfirmacao(null)
  }

  function trocarTipo(novo: TipoCategoria) {
    setTipo(novo)
    setCategoriaId(null) // as categorias de despesa e de receita são diferentes
  }

  /**
   * Com conexão, exclui no servidor. Sem conexão, tira da fila do aparelho; mas, se a fila já
   * tiver sido enviada nesse meio-tempo (a internet voltou), o lançamento está no servidor e é
   * excluído lá.
   */
  async function desfazer(lancado: DadosDaConfirmacao) {
    setDesfazendo(true)
    try {
      const naFila =
        lancado.situacao === 'guardado' &&
        (await lerFila()).some((guardado) => guardado.id === lancado.id)
      if (naFila) {
        await tirarDaFila(lancado.id)
        await fila.recarregar()
      } else {
        await excluirTransacao(lancado.id)
      }
      voltarAoFormulario()
      setAviso({ mensagem: 'Lançamento desfeito.' })
    } catch (erro) {
      setAviso({
        mensagem:
          erro instanceof ErroDaApi
            ? erro.detalhe
            : 'Não foi possível desfazer o lançamento.',
      })
    } finally {
      setDesfazendo(false)
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
    const categoria =
      categorias.situacao === 'pronto'
        ? categorias.categorias.find((c) => c.id === categoriaId)
        : undefined
    if (Object.keys(errosLocais).length > 0 || !categoria) {
      return
    }

    setEnviando(true)
    try {
      const resultado = await lancarOuGuardar({
        id,
        valor: valorParaApi(digitos),
        data,
        descricao: descricao.trim() || undefined,
        categoriaId: categoria.id,
      })
      setConfirmacao({
        situacao: resultado.situacao,
        id,
        valor: valorParaApi(digitos),
        data,
        categoria,
      })
      vibrar()
      if (resultado.situacao === 'enviado') {
        // Já que há conexão, aproveita para enviar o que estava esperando no aparelho.
        if (fila.pendentes.length > 0) void fila.enviarAgora()
      } else {
        // Sem internet: ficou guardado no aparelho e vai sozinho quando a conexão voltar (#100).
        void pedirEnvioEmSegundoPlano()
        await fila.recarregar()
      }
      // Pronto para o próximo: mantém o tipo e a data, limpa o resto e gera um id novo.
      setDigitos('')
      setCategoriaId(null)
      setDescricao('')
      setId(gerarId())
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
    // Outros erros: o id continua o mesmo, então tentar de novo é seguro. (Sem conexão o
    // lançamento nem chega aqui: vai para a fila do aparelho.)
    setErroGeral(erro.detalhe)
  }

  /** O botão diz o que falta (#187), em vez de só ficar apagado sem explicar por quê. */
  const pronto = digitos !== '' && categoriaId !== null
  const textoDoBotao = enviando
    ? 'Lançando…'
    : digitos === ''
      ? 'Digite o valor'
      : categoriaId === null
        ? 'Escolha a categoria'
        : `Lançar ${nomeDoTipo}`

  return (
    <>
      <CabecalhoPagina titulo="Lançar" />
      <AvisoDePendentes fila={fila} />

      {confirmacao ? (
        <Confirmacao
          dados={confirmacao}
          hoje={hoje}
          ontem={ontem}
          desfazendo={desfazendo}
          aoLancarOutra={voltarAoFormulario}
          aoDesfazer={() => void desfazer(confirmacao)}
        />
      ) : (
        <form
          ref={formulario}
          className={styles.formulario}
          onSubmit={lancar}
          noValidate
        >
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

          <div className={styles.grupo}>
            {/*
             * <output> é "região viva": o leitor de tela anuncia o valor a cada tecla. Ele recebe
             * o foco (tabIndex -1) ao voltar da confirmação, e dali o Enter também lança.
             */}
            <output
              ref={visor}
              tabIndex={-1}
              className={
                erros.valor
                  ? `${styles.visor} ${styles.visorComErro}`
                  : styles.visor
              }
              aria-label="Valor"
              aria-describedby={erros.valor ? 'erro-valor' : undefined}
              data-enter-lanca
            >
              <span className={styles.moeda}>R$</span>{' '}
              {formatarDigitos(digitos)}
            </output>
            {erros.valor && (
              <p id="erro-valor" className={styles.erroDoCampo}>
                {erros.valor}
              </p>
            )}
          </div>

          <GradeDeCategorias
            estado={categorias}
            tipo={tipo}
            selecionada={categoriaId}
            aoEscolher={setCategoriaId}
            aoTentarDeNovo={tentarDeNovo}
            erro={erros.categoriaId}
          />

          <DetalhesDoLancamento
            data={data}
            hoje={hoje}
            ontem={ontem}
            aoMudarData={setData}
            descricao={descricao}
            aoMudarDescricao={setDescricao}
            erros={{ data: erros.data, descricao: erros.descricao }}
          />

          <TecladoNumerico aoDigitar={digitar} aoApagar={apagar} />

          {erroGeral && (
            <p className={styles.erroGeral} role="alert">
              {erroGeral}
            </p>
          )}

          <button
            type="submit"
            className={
              pronto
                ? styles.botaoPrincipal
                : `${styles.botaoPrincipal} ${styles.botaoIncompleto}`
            }
            disabled={enviando}
          >
            {textoDoBotao}
          </button>
        </form>
      )}

      {aviso && <Aviso {...aviso} aoFechar={fecharAviso} />}
    </>
  )
}

/** Uma vibração curta ao lançar, nos celulares que têm (Android). No iPhone não existe. */
function vibrar() {
  if ('vibrate' in navigator) navigator.vibrate(30)
}
