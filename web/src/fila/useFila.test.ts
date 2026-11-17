import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardarNaFila } from './banco.ts'
import { useFila } from './useFila.ts'

/**
 * O jsdom não tem service worker. Um EventTarget no lugar de `navigator.serviceWorker` deixa o
 * teste mandar a mensagem que o service worker manda depois do Background Sync (ADR-0019).
 */
let serviceWorkerFalso: EventTarget

function mensagemDoServiceWorker(data: unknown) {
  act(() => {
    serviceWorkerFalso.dispatchEvent(new MessageEvent('message', { data }))
  })
}

describe('useFila: aviso do service worker (#100)', () => {
  beforeEach(() => {
    serviceWorkerFalso = new EventTarget()
    Object.defineProperty(navigator, 'serviceWorker', {
      value: serviceWorkerFalso,
      configurable: true,
    })
  })

  afterEach(() => {
    // Volta ao jsdom puro (sem service worker), como os outros testes esperam.
    Reflect.deleteProperty(navigator, 'serviceWorker')
  })

  it('quando o service worker envia em segundo plano, relê a fila e avisa a tela', async () => {
    const aoEnviar = vi.fn()
    const { result } = renderHook(() => useFila(aoEnviar))
    await waitFor(() => expect(result.current.pendentes).toHaveLength(0))

    // Enquanto isso, a fila mudou no aparelho (por exemplo, por outra aba).
    await guardarNaFila({
      id: 'a',
      valor: 5,
      data: '2026-11-05',
      categoriaId: 'c',
    })
    mensagemDoServiceWorker({
      type: 'FILA_ENVIADA',
      resultado: { enviados: 1 },
    })

    await waitFor(() => expect(result.current.pendentes).toHaveLength(1))
    expect(aoEnviar).toHaveBeenCalledOnce()
  })

  it('sem nada enviado, só relê a fila, sem avisar', async () => {
    const aoEnviar = vi.fn()
    const { result } = renderHook(() => useFila(aoEnviar))
    await waitFor(() => expect(result.current.pendentes).toHaveLength(0))
    await guardarNaFila({
      id: 'a',
      valor: 5,
      data: '2026-11-05',
      categoriaId: 'c',
    })

    mensagemDoServiceWorker({
      type: 'FILA_ENVIADA',
      resultado: { enviados: 0 },
    })

    await waitFor(() => expect(result.current.pendentes).toHaveLength(1))
    expect(aoEnviar).not.toHaveBeenCalled()
  })

  it('ignora mensagens que não são do envio da fila', async () => {
    const aoEnviar = vi.fn()
    const { result } = renderHook(() => useFila(aoEnviar))
    await waitFor(() => expect(result.current.pendentes).toHaveLength(0))
    await guardarNaFila({
      id: 'a',
      valor: 5,
      data: '2026-11-05',
      categoriaId: 'c',
    })

    mensagemDoServiceWorker({ type: 'OUTRA_COISA' })

    // A fila não foi relida: continua como estava na tela.
    await new Promise((resolver) => setTimeout(resolver, 50))
    expect(result.current.pendentes).toHaveLength(0)
    expect(aoEnviar).not.toHaveBeenCalled()
  })

  it('para de ouvir o service worker ao sair da tela', async () => {
    const remover = vi.spyOn(serviceWorkerFalso, 'removeEventListener')
    const { result, unmount } = renderHook(() => useFila())
    await waitFor(() => expect(result.current.pendentes).toHaveLength(0))

    unmount()

    expect(remover).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
