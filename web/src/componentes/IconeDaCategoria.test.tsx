import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { violacoesDeAcessibilidade } from '../testes/acessibilidade.ts'
import { IconeDaCategoria } from './IconeDaCategoria.tsx'

describe('IconeDaCategoria (#184)', () => {
  it('desenha o ícone na cor da categoria, escondido do leitor de tela', () => {
    const { container } = render(
      <IconeDaCategoria icone="shopping-cart" cor="verde" />,
    )
    const icone = container.firstElementChild as HTMLElement

    expect(icone.dataset.icone).toBe('shopping-cart')
    expect(icone.dataset.cor).toBe('verde')
    expect(icone).toHaveAttribute('aria-hidden', 'true')
    expect(icone.querySelector('svg')).not.toBeNull()
  })

  it('usa a aparência padrão quando o ícone ou a cor não existem', () => {
    const { container } = render(
      <IconeDaCategoria icone="foguete" cor="#ff0000" />,
    )
    const icone = container.firstElementChild as HTMLElement

    expect(icone.dataset.icone).toBe('circle-ellipsis')
    expect(icone.dataset.cor).toBe('cinza')
  })

  it('passa no axe ao lado do nome da categoria', async () => {
    const { container } = render(
      <p>
        <IconeDaCategoria icone="house" cor="coral" tamanho="pequeno" /> Moradia
      </p>,
    )
    expect(await violacoesDeAcessibilidade(container)).toEqual([])
  })
})
