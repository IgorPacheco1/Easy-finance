/*
 * Tema do app antes da primeira pintura da tela (#195). Roda no <head>, antes do CSS desenhar
 * qualquer coisa: lê a preferência guardada no aparelho e põe data-tema="claro" ou "escuro" no
 * <html>. Assim o app não "pisca" no tema errado ao abrir.
 *
 * É um arquivo à parte (e não um script escrito dentro do index.html) porque a CSP estrita do M7
 * bloqueia scripts escritos na própria página. A mesma regra está em src/preferencias/tema.ts:
 * se uma mudar, a outra muda junto (um teste confere as duas).
 */
;(function () {
  var CHAVE = 'easy-finance:tema'
  var consulta = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

  function escolhido() {
    try {
      var valor = window.localStorage.getItem(CHAVE)
      return valor === 'claro' || valor === 'escuro' ? valor : 'sistema'
    } catch {
      return 'sistema'
    }
  }

  function aplicar() {
    var tema = escolhido()
    var escuro =
      tema === 'escuro' ||
      (tema === 'sistema' && !!consulta && consulta.matches)
    document.documentElement.setAttribute(
      'data-tema',
      escuro ? 'escuro' : 'claro',
    )
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', escuro ? '#1f1410' : '#f7f1ea')
  }

  aplicar()
  // No modo "Sistema", acompanha o tema do sistema se ele mudar com o app aberto.
  if (consulta && consulta.addEventListener)
    consulta.addEventListener('change', aplicar)
})()
