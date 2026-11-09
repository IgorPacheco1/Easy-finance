/**
 * Tipos da API usados pelo app, derivados do arquivo gerado a partir do OpenAPI
 * (esquema.d.ts, gerado com `npm run api:tipos`; ADR-0013).
 *
 * Os campos das respostas vêm como obrigatórios no próprio OpenAPI (#77), inclusive a
 * `descricao` da transação como `string | null`. Por isso os tipos são usados como saem do
 * gerador; este arquivo só dá nomes curtos a eles.
 */
import type { components } from './esquema'

type Esquemas = components['schemas']

export type TipoCategoria = NonNullable<Esquemas['CategoriaResponse']['tipo']>

export type Categoria = Esquemas['CategoriaResponse']
export type NovaCategoria = Esquemas['CriarCategoriaRequest']
export type CategoriaEditada = Esquemas['AtualizarCategoriaRequest']

export type CategoriaResumo = Esquemas['CategoriaResumo']
export type Transacao = Esquemas['TransacaoResponse']
export type NovaTransacao = Esquemas['CriarTransacaoRequest']
export type TransacaoEditada = Esquemas['TransacaoRequest']
/** Uma página da listagem de transações (#92): itens, número da página e se tem mais. */
export type PaginaDeTransacoes = Esquemas['PaginaResponseTransacaoResponse']

export type Saldo = Esquemas['SaldoResponse']

/** Resumo por categoria do período (#95): receitas e despesas, cada uma com as suas categorias. */
export type Resumo = Esquemas['ResumoResponse']
export type ResumoDoTipo = Esquemas['ResumoDoTipo']
export type ResumoDaCategoria = Esquemas['ResumoDaCategoria']

/** Período com os dois dias incluídos, no formato da API ("2026-11-01"). */
export type Periodo = { de: string; ate: string }

export type Problema = Esquemas['Problema']
export type ErroDeCampo = Esquemas['ErroDeCampo']
