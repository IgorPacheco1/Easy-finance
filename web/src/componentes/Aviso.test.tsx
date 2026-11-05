import { act, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Aviso } from './Aviso.tsx'

/**
 * O Aviso é a caixinha do topo da tela ("Despesa de R$ 12,90 lançada." com "Desfazer", ou
 * "Nova versão do app disponível." com "Atualizar"). Regras que estes testes garantem:
 *   1. some sozinho depois de 6 segundos;
 *   2. com duracao={null}, não some sozinho (aviso de versão nova, #31);
 *   3. o botão do aviso faz a ação.
 */
describe('Aviso', () => {
  // Relógio falso: em vez de esperar 6 segundos de verdade, o teste "pula" o tempo com
  // vi.advanceTimersByTime(). Assim o teste roda em milissegundos.
  beforeEach(() => vi.useFakeTimers())
  // Volta o relógio de verdade depois de cada teste, para não afetar os outros arquivos.
  afterEach(() => vi.useRealTimers())

  it('mostra a mensagem para quem vê e para o leitor de tela', () => {
    // Preparar: desenha o aviso. aoFechar é obrigatório; aqui ele não importa.
    render(<Aviso mensagem="Despesa lançada." aoFechar={() => {}} />)

    // Conferir: role="status" é o que faz o leitor de tela anunciar a mensagem. Procurar pelo
    // papel confere as duas coisas ao mesmo tempo: o texto e a acessibilidade.
    expect(screen.getByRole('status')).toHaveTextContent('Despesa lançada.')
  })

  it('fecha sozinho depois de 6 segundos', () => {
    // vi.fn() cria um "espião": uma função que não faz nada, mas anota quando foi chamada.
    const aoFechar = vi.fn()
    render(<Aviso mensagem="Despesa lançada." aoFechar={aoFechar} />)

    // Agir: pula 5,999 segundos. O act() avisa o React de que algo aconteceu fora de um clique,
    // para ele terminar de atualizar a tela antes da conferência.
    act(() => vi.advanceTimersByTime(5999))
    // Conferir: 1 milissegundo antes do prazo, o aviso ainda NÃO pediu para fechar.
    expect(aoFechar).not.toHaveBeenCalled()

    // Agir: pula o milissegundo que faltava, chegando aos 6 segundos.
    act(() => vi.advanceTimersByTime(1))
    // Conferir: agora pediu para fechar, e uma vez só.
    expect(aoFechar).toHaveBeenCalledTimes(1)
  })

  it('com duracao={null} não fecha sozinho (aviso de versão nova)', () => {
    const aoFechar = vi.fn()
    render(
      <Aviso
        mensagem="Nova versão do app disponível."
        aoFechar={aoFechar}
        duracao={null}
      />,
    )

    // Agir: pula 1 minuto, bem mais que os 6 segundos normais.
    act(() => vi.advanceTimersByTime(60_000))

    // Conferir: nunca pediu para fechar e continua na tela.
    expect(aoFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('o botão do aviso faz a ação', async () => {
    // O userEvent simula o toque com pequenas esperas entre os passos; com o relógio falso essas
    // esperas nunca terminariam. Por isso este teste usa o relógio de verdade.
    vi.useRealTimers()
    const aoClicar = vi.fn()
    render(
      <Aviso
        mensagem="Despesa lançada."
        aoFechar={() => {}}
        acao={{ rotulo: 'Desfazer', aoClicar }}
      />,
    )

    // Agir: toca no botão, procurando pelo texto que a pessoa vê nele.
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer' }))

    // Conferir: a ação foi chamada uma vez (um toque, uma ação).
    expect(aoClicar).toHaveBeenCalledTimes(1)
  })
})
