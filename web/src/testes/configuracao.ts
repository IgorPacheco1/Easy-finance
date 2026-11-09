import '@testing-library/jest-dom/vitest'
// IndexedDB falso (o jsdom não tem um): a fila do lançamento offline usa o IndexedDB (#100).
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { apagarBancoDosTestes } from '../fila/banco.ts'
import { servidor } from './servidor.ts'

// Liga o servidor falso antes dos testes. Pedido sem resposta combinada vira erro: assim um
// teste nunca chama uma API de verdade sem querer.
beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
// Desfaz as respostas combinadas em cada teste, para um não interferir no outro.
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())
// Apaga da tela falsa o que o teste anterior desenhou, para cada teste começar do zero.
afterEach(() => cleanup())
// Apaga o banco do aparelho (fila e categorias guardadas), para um teste não herdar a fila do outro.
afterEach(() => apagarBancoDosTestes())
