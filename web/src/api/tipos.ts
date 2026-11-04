/**
 * Tipos da API usados pelo app, derivados do arquivo gerado a partir do OpenAPI
 * (esquema.d.ts, gerado com `npm run api:tipos`; ADR-0013).
 *
 * Por que este arquivo existe em vez de usar o esquema direto: no OpenAPI do backend, os
 * campos das RESPOSTAS aparecem como opcionais (`id?: string`), porque os records de resposta
 * não estão marcados como obrigatórios. A API sempre envia esses campos, então aqui eles viram
 * obrigatórios com `Required<...>`. A exceção é a `descricao` da transação, que pode vir `null`.
 */
import type { components } from './esquema'

type Esquemas = components['schemas']

export type TipoCategoria = NonNullable<Esquemas['CategoriaResponse']['tipo']>

export type Categoria = Required<Esquemas['CategoriaResponse']>
export type NovaCategoria = Esquemas['CriarCategoriaRequest']
export type CategoriaEditada = Esquemas['AtualizarCategoriaRequest']

export type CategoriaResumo = Required<Esquemas['CategoriaResumo']>
export type Transacao = Required<
  Omit<Esquemas['TransacaoResponse'], 'descricao' | 'categoria'>
> & {
  descricao: string | null
  categoria: CategoriaResumo
}
export type NovaTransacao = Esquemas['CriarTransacaoRequest']
export type TransacaoEditada = Esquemas['TransacaoRequest']

export type Saldo = Required<Esquemas['SaldoResponse']>

/** Período com os dois dias incluídos, no formato da API ("2026-11-01"). */
export type Periodo = { de: string; ate: string }

export type Problema = Esquemas['Problema']
export type ErroDeCampo = Required<Esquemas['ErroDeCampo']>
