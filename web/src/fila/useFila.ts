import { useCallback, useEffect, useState } from 'react'
import { gerarId } from '../lancamento/id.ts'
import {
  guardarNaFila,
  lerFila,
  tirarDaFila,
  type LancamentoNaFila,
} from './banco.ts'
import { enviarFila } from './envio.ts'
import { pedirEnvioEmSegundoPlano } from './segundoPlano.ts'

/**
 * A fila de lançamentos vista pela tela (#100, ADR-0019): quantos estão pendentes, quais o
 * servidor recusou, e as ações "Enviar agora", "Descartar" e "Lançar de novo".
 *
 * Envia a fila sozinho quando a tela abre e quando a conexão volta (evento `online`). Quando o
 * service worker avisa que enviou em segundo plano, a lista só é relida.
 *
 * `aoEnviar` é chamado quando algum lançamento foi confirmado pelo servidor, para a tela
 * recarregar os dados (por exemplo, o saldo do mês).
 */
/** Lê a fila sem quebrar a tela se o aparelho não tiver IndexedDB (navegador muito restrito). */
async function lerFilaComSeguranca(): Promise<LancamentoNaFila[]> {
  try {
    return await lerFila()
  } catch {
    return []
  }
}

/** Envia a fila e devolve como ela ficou, e quantos lançamentos foram confirmados agora. */
async function enviarELer(): Promise<{
  fila: LancamentoNaFila[]
  enviados: number
}> {
  let enviados = 0
  try {
    enviados = (await enviarFila()).enviados
  } catch {
    // Falha ao ler o banco: a fila continua lá para a próxima tentativa.
  }
  return { fila: await lerFilaComSeguranca(), enviados }
}

export function useFila(aoEnviar?: () => void) {
  const [fila, setFila] = useState<LancamentoNaFila[]>([])
  const [enviando, setEnviando] = useState(false)

  const recarregar = useCallback(async () => {
    setFila(await lerFilaComSeguranca())
  }, [])

  /** "Enviar agora": envia, com o botão mostrando "Enviando…". */
  const enviarAgora = useCallback(async () => {
    setEnviando(true)
    const resultado = await enviarELer()
    setFila(resultado.fila)
    setEnviando(false)
    if (resultado.enviados > 0) aoEnviar?.()
  }, [aoEnviar])

  useEffect(() => {
    let ativo = true
    const sincronizar = () =>
      enviarELer().then((resultado) => {
        if (!ativo) return
        setFila(resultado.fila)
        if (resultado.enviados > 0) aoEnviar?.()
      })

    // Ao abrir a tela...
    void sincronizar()
    // ...e quando a conexão volta.
    window.addEventListener('online', sincronizar)

    // O service worker enviou a fila em segundo plano: só relê a fila.
    const aoReceberMensagem = (evento: MessageEvent) => {
      if (evento.data?.type !== 'FILA_ENVIADA') return
      void lerFilaComSeguranca().then((lida) => {
        if (!ativo) return
        setFila(lida)
        if (evento.data.resultado?.enviados > 0) aoEnviar?.()
      })
    }
    navigator.serviceWorker?.addEventListener('message', aoReceberMensagem)

    return () => {
      ativo = false
      window.removeEventListener('online', sincronizar)
      navigator.serviceWorker?.removeEventListener('message', aoReceberMensagem)
    }
    // Roda ao abrir a tela. Quem usa este hook passa um `aoEnviar` estável (com useCallback);
    // senão a fila seria enviada de novo a cada desenho.
  }, [aoEnviar])

  /** Desiste de um lançamento recusado: ele sai do aparelho e não é enviado. */
  const descartar = useCallback(
    async (id: string) => {
      await tirarDaFila(id)
      await recarregar()
    },
    [recarregar],
  )

  /**
   * Para um lançamento que foi excluído em outro aparelho (410): manda os mesmos dados de novo,
   * com um id NOVO. O id antigo está bloqueado no servidor (#98).
   */
  const lancarDeNovo = useCallback(
    async (lancamento: LancamentoNaFila) => {
      await tirarDaFila(lancamento.id)
      await guardarNaFila({ ...lancamento.corpo, id: gerarId() })
      void pedirEnvioEmSegundoPlano()
      await enviarAgora()
    },
    [enviarAgora],
  )

  return {
    pendentes: fila.filter((l) => l.situacao === 'pendente'),
    recusados: fila.filter((l) => l.situacao === 'recusado'),
    enviando,
    enviarAgora,
    recarregar,
    descartar,
    lancarDeNovo,
  }
}
