# Ícones do app

Logo e ícones do Easy Finance: a silhueta de uma carteira com o fecho recortado, em cacau escuro
(`#1F1410`) sobre o caramelo da marca (`#E0A458`). Decisão no
[ADR-0029](../../docs/adr/0029-identidade-visual.md). O caramelo é só da marca: não entra na
interface do app.

| Arquivo                | Para quê                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icone.svg`            | Origem do ícone comum (cantos arredondados). Também é o `public/favicon.svg` e o símbolo do componente `src/componentes/Logo.tsx`.                                      |
| `icone-mascaravel.svg` | Origem do ícone "mascarável": fundo até a borda e a carteira dentro da área segura (80% central), porque o Android e o iPhone recortam o ícone no formato que quiserem. |

## Como regerar os PNGs

Depois de mudar um SVG, rode na pasta `web/` (usa o [sharp-cli](https://www.npmjs.com/package/sharp-cli)
pelo `npx`, sem instalar nada no projeto):

```bash
npx -y sharp-cli@6.1.0 -i icones/icone.svg -o public/pwa-512x512.png resize 512 512
npx -y sharp-cli@6.1.0 -i icones/icone.svg -o public/pwa-192x192.png resize 192 192
npx -y sharp-cli@6.1.0 -i icones/icone-mascaravel.svg -o public/maskable-icon-512x512.png resize 512 512
npx -y sharp-cli@6.1.0 -i icones/icone-mascaravel.svg -o public/apple-touch-icon-180x180.png resize 180 180
```

E copie o `icones/icone.svg` para `public/favicon.svg`. Se o desenho mudar, atualize também o
`src/componentes/Logo.tsx`, que tem o mesmo símbolo em linha.

**Conferir:** a carteira inteira dentro do círculo central em <https://maskable.app/editor>
(abra o `maskable-icon-512x512.png`), e o ícone instalado no Android e no iPhone, em papel de
parede claro e escuro.

Os SVGs ficam sem metadados de editor: só as formas, com poucos bytes.
