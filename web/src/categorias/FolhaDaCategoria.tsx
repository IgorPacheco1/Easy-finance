import { useEffect, useRef, useState, type FormEvent } from 'react'
import { atualizarCategoria, criarCategoria } from '../api/categorias.ts'
import { ErroDaApi } from '../api/cliente.ts'
import type { Categoria, TipoCategoria } from '../api/tipos.ts'
import { IconeDaCategoria } from '../componentes/IconeDaCategoria.tsx'
import {
  APARENCIA_PADRAO,
  CORES_DE_CATEGORIA,
  ehCorDeCategoria,
  ehIconeDeCategoria,
  ICONES_DE_CATEGORIA,
  nomeDaCor,
  NOMES_DOS_ICONES,
  NOMES_LEGIVEIS_DOS_ICONES,
  type CorDeCategoria,
  type IconeDeCategoria,
} from './aparencia.ts'
import styles from './Categorias.module.css'
import { classeDaCor } from './corDaCategoria.ts'
import { TAMANHO_MAXIMO_DO_NOME, validarNome } from './regras.ts'

/** O que a folha faz: criar uma categoria nova ou editar uma que a pessoa criou. */
export type ModoDaFolha =
  { tipo: 'nova' } | { tipo: 'editar'; categoria: Categoria }

type Props = {
  modo: ModoDaFolha
  existentes: Categoria[]
  /** Chamada com a categoria que a API devolveu; `criada` diz se foi criação ou edição. */
  aoSalvar: (categoria: Categoria, criada: boolean) => void
  aoFechar: () => void
}

/**
 * Folha para criar ou editar uma categoria (#192): nome, tipo (só na criação; depois não muda),
 * ícone e cor, com a prévia ao vivo. No celular sobe de baixo; no computador é uma janela.
 *
 * É um `<dialog>` aberto com `showModal()`, do próprio navegador: ele deixa o resto da tela
 * inerte (o foco não sai da folha), fecha com Esc e mostra o fundo escurecido (`::backdrop`).
 * Ao fechar, o foco volta para o botão que abriu a folha.
 */
export function FolhaDaCategoria({
  modo,
  existentes,
  aoSalvar,
  aoFechar,
}: Props) {
  const editando = modo.tipo === 'editar' ? modo.categoria : null
  const folha = useRef<HTMLDialogElement>(null)
  const campoNome = useRef<HTMLInputElement>(null)

  const [nome, setNome] = useState(editando?.nome ?? '')
  const [tipo, setTipo] = useState<TipoCategoria>(editando?.tipo ?? 'DESPESA')
  const [icone, setIcone] = useState<IconeDeCategoria>(
    editando && ehIconeDeCategoria(editando.icone)
      ? editando.icone
      : APARENCIA_PADRAO.icone,
  )
  const [cor, setCor] = useState<CorDeCategoria>(
    editando && ehCorDeCategoria(editando.cor)
      ? editando.cor
      : APARENCIA_PADRAO.cor,
  )
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)

  // Abre ao aparecer na tela, com o foco no nome. Ao sair, devolve o foco para quem estava com
  // ele antes de abrir.
  useEffect(() => {
    const quemAbriu = document.activeElement
    const dialogo = folha.current
    dialogo?.showModal()
    campoNome.current?.focus()
    // Ao sair, não chama close(): o navegador avisaria com o evento "close" depois, e no
    // StrictMode (que desmonta e monta de novo) esse aviso chegaria com a folha já reaberta,
    // fechando-a sozinha (#215). Tirar o <dialog> da página já o fecha, sem o evento.
    return () => {
      if (quemAbriu instanceof HTMLElement) quemAbriu.focus()
    }
  }, [])

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const erroLocal = validarNome(nome, existentes, editando?.id)
    setErro(erroLocal)
    if (erroLocal) return

    setEnviando(true)
    try {
      const dados = { nome: nome.trim(), icone, cor }
      const salva = editando
        ? await atualizarCategoria(editando.id, dados)
        : await criarCategoria({ ...dados, tipo })
      aoSalvar(salva, !editando)
    } catch (falha) {
      setErro(
        falha instanceof ErroDaApi
          ? (falha.erroDoCampo('nome') ?? falha.detalhe)
          : 'Não foi possível salvar a categoria.',
      )
      setEnviando(false)
    }
  }

  const titulo = editando ? 'Editar categoria' : 'Nova categoria'

  return (
    // onClose: Esc ou "Cancelar" fecharam o diálogo; a tela tira a folha.
    <dialog
      ref={folha}
      className={styles.folha}
      aria-labelledby="titulo-da-folha"
      onClose={aoFechar}
    >
      <form
        className={styles.formularioDaFolha}
        onSubmit={salvar}
        noValidate
        aria-labelledby="titulo-da-folha"
      >
        <h2 id="titulo-da-folha" className={styles.tituloDaFolha}>
          {titulo}
        </h2>

        {/* Prévia ao vivo. Repete o que os campos já dizem, então o leitor de tela pula. */}
        <div className={styles.previa} aria-hidden="true">
          <IconeDaCategoria icone={icone} cor={cor} tamanho="grande" />
          <span className={styles.nome}>
            {nome.trim() || 'Nome da categoria'}
          </span>
        </div>

        <div className={styles.campoDaFolha}>
          <label htmlFor="nome-da-categoria" className={styles.rotulo}>
            Nome
          </label>
          <input
            id="nome-da-categoria"
            className={styles.campo}
            placeholder="Ex.: Pets"
            ref={campoNome}
            maxLength={TAMANHO_MAXIMO_DO_NOME}
            value={nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? 'erro-da-folha' : undefined}
          />
          {erro && (
            <p id="erro-da-folha" className={styles.erro}>
              {erro}
            </p>
          )}
        </div>

        {editando ? (
          <p className={styles.dica}>
            Tipo: {editando.tipo === 'DESPESA' ? 'despesa' : 'receita'}. O tipo
            não pode ser mudado.
          </p>
        ) : (
          <div className={styles.campoDaFolha}>
            <div className={styles.alternador} role="group" aria-label="Tipo">
              <button
                type="button"
                className={styles.opcao}
                aria-pressed={tipo === 'DESPESA'}
                onClick={() => setTipo('DESPESA')}
              >
                Despesa
              </button>
              <button
                type="button"
                className={styles.opcao}
                aria-pressed={tipo === 'RECEITA'}
                onClick={() => setTipo('RECEITA')}
              >
                Receita
              </button>
            </div>
            <p className={styles.dica}>O tipo não pode ser mudado depois.</p>
          </div>
        )}

        <fieldset className={styles.escolha}>
          <legend className={styles.rotulo}>Ícone</legend>
          <div className={styles.gradeDeIcones}>
            {NOMES_DOS_ICONES.map((nomeDoIcone) => {
              const Desenho = ICONES_DE_CATEGORIA[nomeDoIcone]
              return (
                <button
                  key={nomeDoIcone}
                  type="button"
                  className={`${styles.opcaoDeIcone} ${classeDaCor(cor)}`}
                  aria-label={NOMES_LEGIVEIS_DOS_ICONES[nomeDoIcone]}
                  aria-pressed={icone === nomeDoIcone}
                  onClick={() => setIcone(nomeDoIcone)}
                >
                  <Desenho size={22} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className={styles.escolha}>
          <legend className={styles.rotulo}>Cor</legend>
          <div className={styles.gradeDeCores}>
            {CORES_DE_CATEGORIA.map((nomeDaCorAtual) => (
              <button
                key={nomeDaCorAtual}
                type="button"
                className={`${styles.opcaoDeCor} ${classeDaCor(nomeDaCorAtual)}`}
                aria-label={nomeDaCor(nomeDaCorAtual)}
                aria-pressed={cor === nomeDaCorAtual}
                onClick={() => setCor(nomeDaCorAtual)}
              >
                <span className={styles.amostraDaCor} />
              </button>
            ))}
          </div>
        </fieldset>

        <div className={styles.botoesDaFolha}>
          <button
            type="submit"
            className={styles.botaoPrincipal}
            disabled={enviando}
          >
            {enviando ? 'Salvando…' : editando ? 'Salvar' : 'Criar categoria'}
          </button>
          <button
            type="button"
            className={styles.botaoSecundario}
            onClick={() => folha.current?.close()}
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  )
}
