/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Lidos do disco, como no contraste.test.ts: nos testes o Vitest troca todo .css por texto vazio.
const SRC = join(__dirname, '..')

function arquivosCss(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = join(pasta, item.name)
    if (item.isDirectory()) return arquivosCss(caminho)
    return item.name.endsWith('.css') ? [caminho] : []
  })
}

const CSS = arquivosCss(SRC).map((caminho) => ({
  caminho: caminho.slice(SRC.length + 1),
  texto: readFileSync(caminho, 'utf-8'),
}))

/**
 * Movimento do app (#196): toda animação e transição usa as durações e a curva do tema.css. Assim
 * o app se mexe de um jeito só, nada passa de 0,8 s, e mudar uma duração muda o app inteiro.
 */
describe('movimento (#196)', () => {
  it('toda animação e transição usa --duracao-* e a --curva-padrao', () => {
    const fora = CSS.flatMap(({ caminho, texto }) =>
      [...texto.matchAll(/^\s*(animation|transition):\s*([^;]+);/gm)]
        .filter(
          ([, , valor]) =>
            !/var\(--duracao-(rapida|media|longa)\)/.test(valor) ||
            !valor.includes('var(--curva-padrao)') ||
            /\d+m?s\b/.test(valor),
        )
        .map(([linha]) => `${caminho}: ${linha.trim()}`),
    )
    expect(fora).toEqual([])
  })

  it('as durações do tema não passam de 0,8 s', () => {
    const tema = CSS.find((arquivo) => arquivo.caminho.endsWith('tema.css'))!
    const duracoes = [
      ...tema.texto.matchAll(/--duracao-[a-z]+:\s*(\d+)ms/g),
    ].map(([, ms]) => Number(ms))
    expect(duracoes).toHaveLength(3)
    expect(Math.max(...duracoes)).toBeLessThanOrEqual(800)
  })

  it('"reduzir movimento" desliga animações e transições de tudo', () => {
    const index = CSS.find((arquivo) => arquivo.caminho === 'index.css')!.texto
    const regra = index.slice(
      index.indexOf('@media (prefers-reduced-motion: reduce)'),
    )
    expect(regra).toContain('animation-duration: 0.01ms !important')
    expect(regra).toContain('transition-duration: 0.01ms !important')
  })
})
