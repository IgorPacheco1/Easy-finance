import axe from 'axe-core'

// O axe tenta desenhar num canvas para conferir ícones de fonte; o jsdom não tem canvas e
// escreveria "Not implemented" na saída dos testes. Sem canvas, o axe só pula essa conferência.
HTMLCanvasElement.prototype.getContext = () => null

/**
 * Roda o axe-core (#154) no que está desenhado na tela e devolve as violações de acessibilidade,
 * uma por texto: a regra, o impacto, o que ela pede, o link da explicação e os elementos.
 * Uso: `expect(await violacoesDeAcessibilidade()).toEqual([])`. Se falhar, a diferença mostra
 * exatamente o que quebrou.
 *
 * O jsdom não calcula estilos de verdade, então o contraste de cores fica de fora: ele é
 * conferido nos tokens do design system. O axe também não substitui o teste com teclado, zoom e
 * leitor de tela (checklist no CONTRIBUTING.md).
 */
export async function violacoesDeAcessibilidade(
  elemento: Element = document.body,
): Promise<string[]> {
  const resultado = await axe.run(elemento, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: false } },
  })
  return resultado.violations.map((violacao) =>
    [
      `${violacao.id} (${violacao.impact}): ${violacao.help}`,
      `  ${violacao.helpUrl}`,
      ...violacao.nodes.map((no) => `  - ${no.target.join(' ')}`),
    ].join('\n'),
  )
}
