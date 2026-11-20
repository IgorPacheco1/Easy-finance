/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CORES_DE_CATEGORIA } from '../categorias/aparencia.ts'

// Lido do disco: nos testes o Vitest troca todo arquivo .css (até com `?raw`) por um texto vazio.
// O caminho usa `__dirname` (que o Vitest fornece): `new URL('./tema.css', import.meta.url)` é
// reescrito pelo Vite como endereço de arquivo do site, e o `readFileSync` não aceita.
const tema = readFileSync(join(__dirname, 'tema.css'), 'utf-8')

/**
 * Contraste das cores das categorias (#184, ADR-0031), lido do próprio `tema.css`: se alguém
 * mudar um tom, este teste diz na hora se ele ainda dá para enxergar.
 *
 * As cores das categorias aparecem em ícones e gráficos (barras, rosca), que pedem **3:1**
 * (WCAG 2.1, critério 1.4.11) sobre o fundo e sobre a superfície dos cartões. O axe não confere
 * isso nos testes, porque o jsdom não calcula estilos.
 */
const MINIMO = 3

const inicioDoEscuro = tema.indexOf(":root[data-tema='escuro']")
const TEMAS = {
  claro: tema.slice(0, inicioDoEscuro),
  escuro: tema.slice(inicioDoEscuro),
}

function cor(bloco: string, variavel: string): string {
  const achado = new RegExp(`--${variavel}:\\s*(#[0-9a-fA-F]{6})`).exec(bloco)
  if (!achado) throw new Error(`--${variavel} não encontrada no tema`)
  return achado[1]
}

/** Luminância relativa (WCAG 2.1). */
function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const canal = Number.parseInt(hex.slice(i, i + 2), 16) / 255
    return canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (clara + 0.05) / (escura + 0.05)
}

describe.each(Object.entries(TEMAS))(
  'cores das categorias no tema %s',
  (_nome, bloco) => {
    const fundo = cor(bloco, 'cor-fundo')
    const superficie = cor(bloco, 'cor-superficie')

    it.each(CORES_DE_CATEGORIA)(
      '%s tem 3:1 sobre o fundo e a superfície',
      (nome) => {
        const tom = cor(bloco, `categoria-${nome}`)
        expect(contraste(tom, fundo)).toBeGreaterThanOrEqual(MINIMO)
        expect(contraste(tom, superficie)).toBeGreaterThanOrEqual(MINIMO)
      },
    )
  },
)
