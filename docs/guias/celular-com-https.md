# Abrir o app no celular

Este guia mostra como abrir o Easy Finance no seu celular enquanto ele ainda roda no seu
computador. Leva uns 15 minutos na primeira vez; depois, é só o último passo.

> Testado no iPhone 13 (iOS 27.0.1). Resultado no fim da página.

## Antes de começar

- O celular e o computador precisam estar **no mesmo Wi-Fi**, de preferência o de casa.
- O app ainda não tem login. Enquanto ele estiver aberto, qualquer pessoa no mesmo Wi-Fi pode
  usá-lo. Por isso: **só em casa, só com dados de teste**, e feche quando terminar.

---

## Parte 1: preparar o computador (só uma vez)

**1. Instale o programa que cria o certificado.** No terminal do IntelliJ:

```powershell
winget install FiloSottile.mkcert
```

Feche e abra o IntelliJ de novo. Depois rode:

```powershell
mkcert -install
```

Vai aparecer um aviso do Windows perguntando se pode instalar um certificado. Clique em **Sim**.

**2. Descubra o endereço do computador na rede.** Rode `ipconfig` e procure o bloco
**"Adaptador de Rede sem Fio Wi-Fi"**. Anote o número da linha **Endereço IPv4**, por exemplo
`192.168.1.7`.

> Ignore os blocos com **"vEthernet"** no nome (são do Docker e do WSL). O celular não chega
> nesses endereços.

**3. Crie o certificado.** Entre na pasta `web` e rode o comando abaixo, trocando
`192.168.1.7` pelo seu número. Copie o comando inteiro, **nesta ordem**:

```powershell
cd web
mkdir certificados
mkcert -key-file certificados/chave.pem -cert-file certificados/certificado.pem localhost 127.0.0.1 192.168.1.7
```

Deve aparecer **"Created a new certificate"**.

**4. Avise o app que o certificado existe.** Ainda dentro de `web`:

```powershell
Set-Content .env.local "HTTPS_CERTIFICADO=certificados/certificado.pem`nHTTPS_CHAVE=certificados/chave.pem"
```

---

## Parte 2: preparar o iPhone (só uma vez)

**5. Pegue o arquivo para o celular.** No terminal:

```powershell
Copy-Item "$(mkcert -CAROOT)\rootCA.pem" "$HOME\Desktop\rootCA.crt"
```

Aparece o arquivo **`rootCA.crt`** na Área de Trabalho. Mande ele para o seu iPhone (por
e-mail, WhatsApp ou outro app) e toque nele no iPhone. Aparece **"Perfil baixado"**.

> ⚠️ Só o `rootCA.crt` vai para o celular. Na pasta do mkcert existe também um arquivo
> **`rootCA-key.pem`**: esse **nunca** sai do computador e nunca deve ser enviado a ninguém.

**6. Instale o perfil.** **Ajustes** → toque em **Perfil Baixado** (no topo) → **Instalar** →
digite o código do iPhone → **Instalar** → **Instalar** → **OK**.

**7. Ative a confiança.** **Ajustes** → **Geral** → **Sobre** → role até o fim →
**Ajustes de Confiança de Certificados** → ligue a chave do **mkcert** → **Continuar**.

---

## Parte 3: abrir o app (toda vez)

**8.** No computador, ligue o banco (Docker) e o backend (▶ no IntelliJ).

**9.** No terminal, dentro de `web`:

```powershell
npm run dev:celular
```

Se o Windows perguntar sobre o firewall, marque só **Redes privadas** e clique em
**Permitir acesso**.

**10.** No iPhone, abra o **Safari** e digite o endereço que aparece na linha **Network** do
terminal, por exemplo **https://192.168.1.7:5173**. O app abre com o **cadeado** 🔒.

Para fechar: aperte **Ctrl+C** no terminal.

> Para **instalar** o app na tela inicial, veja [Instalar o app](instalar-o-app.md).

---

## Deu errado?

| O que aconteceu | O que fazer |
|---|---|
| `"certificados/chave.pem" is not a valid hostname` | O comando do passo 3 está fora de ordem. Copie de novo, inteiro, do jeito que está aqui. |
| `O sistema não pode encontrar o caminho especificado` | O terminal não está na pasta `web`. Rode `cd web` antes. |
| No iPhone: "Esta conexão não é privada" | Faltou o passo 7 (ativar a confiança). |
| No iPhone: a página não carrega | Confira se os dois estão no mesmo Wi-Fi, se o número é o do bloco **Wi-Fi** do `ipconfig` e se o terminal mostra `npm run dev:celular` rodando. |
| O número do computador mudou | O roteador às vezes troca o número. Repita os passos 2 e 3 com o número novo. |

## Como desfazer

- **iPhone:** **Ajustes** → **Geral** → **VPN e Gerenciamento de Dispositivos** → **mkcert** →
  **Remover Perfil**. O iPhone volta a ser como antes.
- **Computador:** rode `mkcert -uninstall`, apague a pasta `web/certificados` e o arquivo
  `web/.env.local`.

O perfil não muda nada no funcionamento do celular: ele só faz o iPhone confiar no certificado
criado no seu computador. Pode instalar e remover quantas vezes quiser.

## Android

Os passos 1 a 4 e 8 a 10 são iguais. Para o passo 5 a 7: mande o `rootCA.crt` para o celular e
instale em **Configurações** → **Segurança** → **Criptografia e credenciais** →
**Instalar um certificado** → **Certificado de CA** (o caminho muda um pouco conforme a marca).

---

## Para entender melhor (opcional)

### Por que precisa de tudo isso

Para o celular **instalar o app na tela inicial** e guardar o app para abrir rápido, o navegador
exige um endereço seguro, com **https** e cadeado. No computador, o endereço `localhost` já
conta como seguro. Mas no celular o app é aberto pelo número do computador na rede, e aí o
navegador só aceita se houver um certificado em que ele confie. O mkcert cria esse certificado
e uma "autoridade" que o assina; instalando essa autoridade no celular, ele passa a confiar.

### Opções que foram comparadas (#32)

| Opção | Por que sim ou não |
|---|---|
| **Certificado local (mkcert)** | **Escolhida.** Funciona no iPhone e no Android e não expõe nada fora da rede de casa. |
| Cabo USB + Chrome | Também seguro e sem certificado, mas só funciona no Android. Boa alternativa para Android (`chrome://inspect` → *Port forwarding* da porta 5173). |
| Túnel para a internet (Cloudflare Tunnel, ngrok) | **Não usar até o login existir (M5):** deixaria o app e os dados abertos para qualquer pessoa na internet. |
| Publicar o site (Vercel, Netlify) | Não serve agora: o backend só vai para a internet no M6. |

### Cuidados de segurança

- A chave `rootCA-key.pem` permite criar certificados de qualquer site que os seus aparelhos
  aceitariam. Por isso ela nunca sai do computador.
- Os certificados e o `.env.local` estão no `.gitignore` e nunca vão para o Git.
- Quando não estiver testando, dá para remover o perfil do celular (ver "Como desfazer").

## Resultado do teste

Teste da #32, em 04/11/2026:

| Item | Resultado |
|---|---|
| Aparelho | iPhone 13, iOS 27.0.1, Safari |
| Computador | Windows, Wi-Fi de casa, Docker instalado |
| Certificado aceito (cadeado, sem aviso) | ✅ |
| App funcionando pelo celular (lançar, mês, categorias, com o backend real) | ✅ |
| Tempo para lançar um gasto (meta da #28) | Não cronometrado |

Problemas encontrados no caminho, já incluídos em "Deu errado?": o comando do mkcert com as
opções fora de ordem, o terminal fora da pasta `web` e o número de um adaptador virtual
(`vEthernet`) no lugar do Wi-Fi.

Ainda não testado: Android. A instalação na tela inicial como app está no guia
[Instalar o app](instalar-o-app.md) (#31).
