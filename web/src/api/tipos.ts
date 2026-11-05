/**
 * Tipos da API usados pelo app, derivados do arquivo gerado a partir do OpenAPI
 * (esquema.d.ts, gerado com `npm run api:tipos`; ADR-0013).
 *
 * Os campos das respostas vêm como obrigatórios no próprio OpenAPI (#77), então os tipos são
 * usados como saem do gerador. O único ajuste é a `descricao` da transação: ela sempre vem, mas
 * pode ser `null`, e aqui isso fica explícito para as telas tratarem o caso.
 */
import type { components } from './esquema'

type Esquemas = components['schemas']

export type TipoCategoria = NonNullable<Esquemas['CategoriaResponse']['tipo']>

export type Categoria = Esquemas['CategoriaResponse']
export type NovaCategoria = Esquemas['CriarCategoriaRequest']
export type CategoriaEditada = Esquemas['AtualizarCategoriaRequest']

export type CategoriaResumo = Esquemas['CategoriaResumo']
export type Transacao = Omit<Esquemas['TransacaoResponse'], 'descricao'> & {
  descricao: string | null
}
export type NovaTransacao = Esquemas['CriarTransacaoRequest']
export type TransacaoEditada = Esquemas['TransacaoRequest']

export type Saldo = Esquemas['SaldoResponse']

/** Período com os dois dias incluídos, no formato da API ("2026-11-01"). */
export type Periodo = { de: string; ate: string }

export type Problema = Esquemas['Problema']
export type ErroDeCampo = Esquemas['ErroDeCampo']
