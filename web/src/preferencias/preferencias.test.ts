/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { apagarPreferencias } from './apagar.ts'
import {
  CHAVE_ESCONDER_VALORES,
  lerEsconderValores,
  salvarEsconderValores,
} from './esconderValores.ts'
import {
  aplicarTema,
  CHAVE_DO_TEMA,
  lerTema,
  salvarTema,
  type Tema,
} from './tema.ts'

/** Faz de conta que o sistema está no tema claro ou no escuro. */
function sistema(escuro: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (consulta: string) => ({
      matches: escuro && consulta.includes('dark'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
}

const temaNaTela = () => document.documentElement.getAttribute('data-tema')

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia')
})

describe('tema (#195)', () => {
  it('sem nada guardado, ou com um valor estranho, é "sistema"', () => {
    expect(lerTema()).toBe('sistema')
    localStorage.setItem(CHAVE_DO_TEMA, 'roxo')
    expect(lerTema()).toBe('sistema')
  })

  it('guarda a escolha e já muda a tela e a cor da barra', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)

    salvarTema('escuro')
    expect(localStorage.getItem(CHAVE_DO_TEMA)).toBe('escuro')
    expect(temaNaTela()).toBe('escuro')
    expect(meta.content).toBe('#1f1410')

    salvarTema('claro')
    expect(temaNaTela()).toBe('claro')
    expect(meta.content).toBe('#f7f1ea')
    meta.remove()
  })

  it('"sistema" não guarda nada e segue o tema do sistema', () => {
    salvarTema('escuro')
    sistema(true)

    salvarTema('sistema')

    expect(localStorage.getItem(CHAVE_DO_TEMA)).toBeNull()
    expect(temaNaTela()).toBe('escuro')
    sistema(false)
    aplicarTema()
    expect(temaNaTela()).toBe('claro')
  })

  it('o public/tema.js decide o mesmo tema que o app, em todas as combinações', () => {
    // O script que roda antes da primeira pintura (#195): lido do disco e executado aqui.
    const script = readFileSync(
      join(__dirname, '../../public/tema.js'),
      'utf-8',
    )
    const temas: Tema[] = ['sistema', 'claro', 'escuro']
    for (const escuro of [false, true]) {
      for (const tema of temas) {
        sistema(escuro)
        if (tema === 'sistema') localStorage.removeItem(CHAVE_DO_TEMA)
        else localStorage.setItem(CHAVE_DO_TEMA, tema)

        aplicarTema()
        const doApp = temaNaTela()
        document.documentElement.removeAttribute('data-tema')
        new Function(script)()

        expect(temaNaTela()).toBe(doApp)
      }
    }
  })
})

describe('esconder valores (#195)', () => {
  it('começa desligado; ligar e desligar fica guardado', () => {
    expect(lerEsconderValores()).toBe(false)
    salvarEsconderValores(true)
    expect(localStorage.getItem(CHAVE_ESCONDER_VALORES)).toBe('sim')
    expect(lerEsconderValores()).toBe(true)
    salvarEsconderValores(false)
    expect(lerEsconderValores()).toBe(false)
  })
})

describe('apagar as preferências (#195)', () => {
  it('apaga o tema e o esconder valores, e a tela volta ao tema do sistema', () => {
    salvarTema('escuro')
    salvarEsconderValores(true)
    sistema(false)

    apagarPreferencias()

    expect(lerTema()).toBe('sistema')
    expect(lerEsconderValores()).toBe(false)
    expect(temaNaTela()).toBe('claro')
  })
})
