import { ErroDaApi } from '../api/cliente.ts'

/**
 * Texto para mostrar quando entrar, criar conta ou outra ação da conta falha. O `detalhe` que o
 * servidor manda já vem em português e pronto para a pessoa ler (401, 409, 429...); só a falta
 * de conexão (status 0) é escrita aqui.
 */
export function mensagemDeFalha(erro: unknown): string {
  if (erro instanceof ErroDaApi) {
    if (erro.status === 0) {
      return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    }
    return erro.detalhe
  }
  return 'Algo deu errado. Tente de novo.'
}
