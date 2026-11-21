import { describe, expect, it } from 'vitest'
import {
  apagarDigito,
  digitarTecla,
  digitosDoCampo,
  formatarDigitos,
  valorParaApi,
} from './valor.ts'

describe('valor no estilo caixa registradora', () => {
  it('os dígitos entram pela direita', () => {
    expect(formatarDigitos('5')).toBe('0,05')
    expect(formatarDigitos('52')).toBe('0,52')
    expect(formatarDigitos('5290')).toBe('52,90')
    expect(formatarDigitos('123456')).toBe('1.234,56')
  })

  it('campo vazio mostra zero', () => {
    expect(formatarDigitos('')).toBe('0,00')
  })

  it('lê só os dígitos do campo, sem zeros à esquerda', () => {
    // O usuário digitou "5" depois de "0,00": o campo fica "0,005".
    expect(digitosDoCampo('0,005', '')).toBe('5')
    expect(digitosDoCampo('0,529', '52')).toBe('529')
    expect(digitosDoCampo('abc', '52')).toBe('')
  })

  it('apagar um dígito tira o último da direita', () => {
    // "52,90" com o último caractere apagado vira "52,9".
    expect(digitosDoCampo('52,9', '5290')).toBe('529')
    expect(formatarDigitos('529')).toBe('5,29')
  })

  it('ignora o dígito que passar do limite', () => {
    expect(digitosDoCampo('9.999.999.999,999', '99999999999')).toBe(
      '99999999999',
    )
  })

  it('converte para o número que a API recebe, sem erro de arredondamento', () => {
    expect(valorParaApi('5290')).toBe(52.9)
    expect(valorParaApi('1')).toBe(0.01)
    expect(JSON.stringify(valorParaApi('99999999999'))).toBe('999999999.99')
  })
})

describe('teclado físico na tela de lançamento (#187)', () => {
  it('cada tecla entra pela direita, e "00" entra como dois zeros', () => {
    expect(digitarTecla('', '5')).toBe('5')
    expect(digitarTecla('5', '2')).toBe('52')
    expect(digitarTecla('52', '00')).toBe('5200')
  })

  it('zero no começo não conta', () => {
    expect(digitarTecla('', '0')).toBe('')
    expect(digitarTecla('', '00')).toBe('')
  })

  it('passou do limite, a tecla é ignorada', () => {
    expect(digitarTecla('12345678901', '2')).toBe('12345678901')
    expect(digitarTecla('1234567890', '00')).toBe('1234567890')
  })

  it('apagar tira o último dígito, e no vazio não faz nada', () => {
    expect(apagarDigito('1290')).toBe('129')
    expect(apagarDigito('')).toBe('')
  })
})
