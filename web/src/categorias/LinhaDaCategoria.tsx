import { Pencil, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { IconeDaCategoria } from '../componentes/IconeDaCategoria.tsx'
import { Valor } from '../mes/Valor.tsx'
import { classeDaCor } from './corDaCategoria.ts'
import type { Movimento } from './movimentoDoMes.ts'
import { atualizarCategoria, excluirCategoria } from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import type { Categoria } from '../api/tipos.ts'
import styles from './Categorias.module.css'
import { TAMANHO_MAXIMO_DO_NOME, validarNome } from './regras.ts'

type Props = {
  categoria: Categoria
  existentes: Categoria[]
  /** "cartao": com movimento no mês, com valor e barra. "quadro": sem movimento, na grade menor. */
  variante: 'cartao' | 'quadro'
  movimento?: Movimento
  /** Para onde o toque leva: a Busca filtrada pela categoria e pelo mês (#191). */
  endereco: string
  aoAtualizar: (categoria: Categoria) => void
  aoExcluir: (categoria: Categoria) => void
}

type Modo = 'vendo' | 'editando' | 'confirmandoExclusao'

/**
 * Uma categoria da tela (#191). Tocar nela abre a Busca com os lançamentos dela no mês. As criadas
 * pela pessoa levam o selo "Criada por você" e os botões de renomear e excluir, que ficam fora do
 * link: um toque nunca faz duas coisas. As do sistema não têm ações, porque a API não deixa
 * editar nem excluir.
 */
export function LinhaDaCategoria({
  categoria,
  existentes,
  variante,
  movimento,
  endereco,
  aoAtualizar,
  aoExcluir,
}: Props) {
  const [modo, setModo] = useState<Modo>('vendo')
  const [nome, setNome] = useState(categoria.nome)
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const idDoErro = `erro-categoria-${categoria.id}`

  function voltar() {
    setModo('vendo')
    setNome(categoria.nome)
    setErro(undefined)
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const erroLocal = validarNome(nome, existentes, categoria.id)
    setErro(erroLocal)
    if (erroLocal) {
      return
    }
    setEnviando(true)
    try {
      aoAtualizar(await atualizarCategoria(categoria.id, { nome: nome.trim() }))
      setModo('vendo')
    } catch (falha) {
      setErro(mensagemDoErro(falha, 'Não foi possível renomear a categoria.'))
    } finally {
      setEnviando(false)
    }
  }

  async function excluir() {
    setEnviando(true)
    try {
      await excluirCategoria(categoria.id)
      aoExcluir(categoria)
    } catch (falha) {
      // Por exemplo, 409: a categoria tem transações. A mensagem da API explica o motivo.
      setErro(mensagemDoErro(falha, 'Não foi possível excluir a categoria.'))
      setEnviando(false)
    }
  }

  // Renomeando ou confirmando a exclusão, o item ocupa a linha inteira, mesmo na grade.
  const classeEmAcao = `${styles.item} ${styles.itemEmAcao}`

  if (modo === 'editando') {
    return (
      <li className={classeEmAcao}>
        <form className={styles.formularioNaLinha} onSubmit={salvar} noValidate>
          <label htmlFor={`nome-${categoria.id}`} className={styles.rotulo}>
            Novo nome
          </label>
          <input
            id={`nome-${categoria.id}`}
            className={styles.campo}
            maxLength={TAMANHO_MAXIMO_DO_NOME}
            autoFocus
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idDoErro : undefined}
          />
          {erro && (
            <p id={idDoErro} className={styles.erro}>
              {erro}
            </p>
          )}
          <div className={styles.botoes}>
            <button
              type="submit"
              className={styles.botaoPrincipal}
              disabled={enviando}
            >
              {enviando ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              className={styles.botaoSecundario}
              onClick={voltar}
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    )
  }

  if (modo === 'confirmandoExclusao') {
    return (
      <li className={classeEmAcao}>
        {erro ? (
          <>
            <span className={styles.nome}>{categoria.nome}</span>
            <p className={styles.erro} role="alert">
              {erro}
            </p>
            <div className={styles.botoes}>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={voltar}
              >
                Entendi
              </button>
            </div>
          </>
        ) : (
          <>
            <span className={styles.nome}>Excluir {categoria.nome}?</span>
            <div className={styles.botoes}>
              <button
                type="button"
                className={styles.botaoPerigo}
                onClick={excluir}
                disabled={enviando}
              >
                {enviando ? 'Excluindo…' : 'Excluir'}
              </button>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={voltar}
              >
                Cancelar
              </button>
            </div>
          </>
        )}
      </li>
    )
  }

  return (
    <li
      className={`${variante === 'cartao' ? styles.cartao : styles.quadro} ${classeDaCor(categoria.cor)}`}
    >
      <Link to={endereco} className={styles.linkDaCategoria}>
        <IconeDaCategoria
          icone={categoria.icone}
          cor={categoria.cor}
          tamanho={variante === 'cartao' ? 'medio' : 'pequeno'}
        />
        <span className={styles.textos}>
          <span className={styles.nome}>{categoria.nome}</span>
          {movimento && (
            <span className={styles.detalhe}>
              {movimento.quantidade === 1
                ? '1 lançamento'
                : `${movimento.quantidade} lançamentos`}
            </span>
          )}
          {!categoria.sistema && (
            <span className={styles.selo}>Criada por você</span>
          )}
        </span>
        {movimento && (
          <>
            <span className={styles.valor}>
              <Valor valor={movimento.total} />
            </span>
            {/* Barra em SVG com o atributo width, sem style inline (CSP), como no Mês. */}
            <svg className={styles.trilho} aria-hidden="true">
              <rect
                className={styles.barra}
                width={`${Math.max(Math.min(movimento.parte, 100), 2)}%`}
                height="100%"
                rx="3"
              />
            </svg>
          </>
        )}
      </Link>
      {!categoria.sistema && (
        <div className={styles.acoes}>
          <button
            type="button"
            className={styles.icone}
            aria-label={`Renomear ${categoria.nome}`}
            onClick={() => setModo('editando')}
          >
            <Pencil size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.icone}
            aria-label={`Excluir ${categoria.nome}`}
            onClick={() => setModo('confirmandoExclusao')}
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  )
}

function mensagemDoErro(falha: unknown, padrao: string): string {
  if (falha instanceof ErroDaApi) {
    return falha.erroDoCampo('nome') ?? falha.detalhe
  }
  return padrao
}
