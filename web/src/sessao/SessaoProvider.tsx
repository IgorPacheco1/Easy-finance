import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api/auth.ts'
import { definirAoPerderASessao, ErroDaApi } from '../api/cliente.ts'
import { apagarPreferencias } from '../preferencias/apagar.ts'
import type { Credenciais, NovoCadastro, Usuario } from '../api/tipos.ts'
import {
  apagarDadosDoAparelho,
  lerUsuarioDoAparelho,
  prepararParaOUsuario,
} from '../fila/banco.ts'
import {
  ContextoDaSessao,
  type EstadoDaSessao,
  type Sessao,
} from './contexto.ts'

/** Quanto esperar o servidor ao abrir o app antes de usar o último usuário do aparelho. */
const TEMPO_LIMITE_DA_CONFERENCIA_MS = 8_000

/**
 * Guarda no aparelho quem entrou e apaga os dados de outra conta, se havia. Se o aparelho não
 * deixar gravar (navegador restrito), o app segue sem a cópia local.
 */
async function prepararAparelho(usuario: Usuario): Promise<number> {
  try {
    const { descartados, trocouDePessoa } = await prepararParaOUsuario(usuario)
    // As preferências da outra pessoa (tema, esconder valores, #195) também não ficam.
    if (trocouDePessoa) apagarPreferencias()
    return descartados
  } catch {
    return 0
  }
}

/**
 * Dono do estado da sessão (ADR-0027). Ao abrir, pergunta `GET /eu`:
 * - 200: logado;
 * - 401: vai para o login;
 * - sem conexão: abre como o último usuário que entrou neste aparelho, se houver (dá para
 *   lançar offline), e confere de novo quando a conexão volta; se não houver, mostra o login.
 *
 * Um 401 no meio do uso (a sessão venceu) também leva ao login, pelo gancho do cliente HTTP.
 */
export function SessaoProvider({
  children,
  estadoInicial = { situacao: 'carregando' },
}: {
  children: ReactNode
  /** Estado de partida. Os testes de tela usam para abrir já logado, sem esperar a conferência. */
  estadoInicial?: EstadoDaSessao
}) {
  const [estado, setEstadoNaTela] = useState<EstadoDaSessao>(estadoInicial)
  const [descartados, setDescartadosNaTela] = useState(0)

  // Respostas do servidor e do IndexedDB chegam depois de um `await`; se o app já foi
  // desmontado (um teste que terminou, por exemplo), mexer no estado é erro. Por isso todo
  // acesso ao estado passa por aqui.
  const montado = useRef(false)
  const setEstado = useCallback(
    (novo: EstadoDaSessao | ((atual: EstadoDaSessao) => EstadoDaSessao)) => {
      if (montado.current) setEstadoNaTela(novo)
    },
    [],
  )
  const setDescartados = useCallback((quantos: number) => {
    if (montado.current) setDescartadosNaTela(quantos)
  }, [])

  const conferir = useCallback(async () => {
    try {
      const usuario = await api.buscarUsuarioAtual(
        TEMPO_LIMITE_DA_CONFERENCIA_MS,
      )
      const apagados = await prepararAparelho(usuario)
      if (apagados > 0) setDescartados(apagados)
      setEstado({ situacao: 'logado', usuario, confirmada: true })
    } catch (erro) {
      if (erro instanceof ErroDaApi && erro.status === 401) {
        // O gancho do cliente HTTP pode ter chegado antes e já ter guardado o motivo: não apaga.
        setEstado((atual) =>
          atual.situacao === 'anonimo'
            ? atual
            : atual.situacao === 'logado'
              ? { situacao: 'anonimo', motivo: 'expirou' }
              : { situacao: 'anonimo' },
        )
        return
      }
      // Sem conexão, ou servidor fora do ar: não dá para saber. Usa o último usuário do aparelho.
      const lembrado = await lerUsuarioDoAparelho().catch(() => undefined)
      setEstado((atual) => {
        if (atual.situacao === 'logado') return atual
        return lembrado
          ? { situacao: 'logado', usuario: lembrado, confirmada: false }
          : { situacao: 'anonimo', semConexao: true }
      })
    }
  }, [setEstado, setDescartados])

  useEffect(() => {
    montado.current = true
    // Uma sessão que o servidor derrubou no meio do uso: volta para o login, explicando.
    definirAoPerderASessao(() =>
      setEstado((atual) =>
        atual.situacao === 'logado'
          ? { situacao: 'anonimo', motivo: 'expirou' }
          : atual,
      ),
    )
    // A conferência é assíncrona: o estado só muda depois da resposta do servidor (sincroniza com algo de fora do React).
    // oxlint-disable-next-line react/set-state-in-effect
    void conferir()
    // Voltou a conexão: confere a sessão de quem abriu o app offline.
    window.addEventListener('online', conferir)
    return () => {
      montado.current = false
      definirAoPerderASessao(undefined)
      window.removeEventListener('online', conferir)
    }
  }, [conferir, setEstado])

  const entrar = useCallback(
    async (credenciais: Credenciais) => {
      const usuario = await api.entrar(credenciais)
      const apagados = await prepararAparelho(usuario)
      if (apagados > 0) setDescartados(apagados)
      setEstado({ situacao: 'logado', usuario, confirmada: true })
    },
    [setEstado, setDescartados],
  )

  const cadastrar = useCallback(
    async (dados: NovoCadastro) => {
      const usuario = await api.cadastrar(dados)
      const apagados = await prepararAparelho(usuario)
      if (apagados > 0) setDescartados(apagados)
      setEstado({ situacao: 'logado', usuario, confirmada: true })
    },
    [setEstado, setDescartados],
  )

  const sair = useCallback(async () => {
    await api.sair()
    await apagarDadosDoAparelho().catch(() => {})
    apagarPreferencias()
    setEstado({ situacao: 'anonimo', motivo: 'saiu' })
  }, [setEstado])

  const aoExcluirConta = useCallback(async () => {
    await apagarDadosDoAparelho().catch(() => {})
    apagarPreferencias()
    setEstado({ situacao: 'anonimo', motivo: 'excluida' })
  }, [setEstado])

  // Nome ou avatar mudaram (#194): a tela inteira passa a mostrar o novo, sem buscar de novo.
  const atualizarUsuario = useCallback(
    (usuario: Usuario) =>
      setEstado((atual) =>
        atual.situacao === 'logado' ? { ...atual, usuario } : atual,
      ),
    [setEstado],
  )

  const dispensarAvisoDeDescarte = useCallback(
    () => setDescartados(0),
    [setDescartados],
  )

  const sessao = useMemo<Sessao>(
    () => ({
      estado,
      entrar,
      cadastrar,
      sair,
      aoExcluirConta,
      atualizarUsuario,
      descartados,
      dispensarAvisoDeDescarte,
    }),
    [
      estado,
      entrar,
      cadastrar,
      sair,
      aoExcluirConta,
      atualizarUsuario,
      descartados,
      dispensarAvisoDeDescarte,
    ],
  )

  return (
    <ContextoDaSessao.Provider value={sessao}>
      {children}
    </ContextoDaSessao.Provider>
  )
}
