/**
 * Gera o id (UUID v4) do lançamento no aparelho, para a criação idempotente (#19): se o envio
 * falhar e for repetido com o mesmo id, a API não duplica o lançamento.
 *
 * `crypto.randomUUID()` só existe em contexto seguro (HTTPS ou localhost). Abrindo o app pelo
 * IP da rede local (http://192.168...), ele não existe; aí o id é montado com
 * `crypto.getRandomValues()`, que funciona em qualquer contexto e também é aleatório de verdade.
 */
export function gerarId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
