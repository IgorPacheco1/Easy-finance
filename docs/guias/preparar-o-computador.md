# Preparar o computador

Este guia é para a **primeira vez** que o Easy Finance vai rodar num computador. Ele instala os
programas necessários e cria o arquivo de configuração. Depois disso, para rodar o projeto no dia
a dia, siga a seção [Como rodar](../../README.md#como-rodar) do README.

> Escrito para Windows (o computador do autor). No macOS e no Linux, os programas são os mesmos;
> só muda o jeito de instalar (veja "Para entender melhor", no fim).

## O que vai ser instalado

| Programa | Para quê | Versão |
|---|---|---|
| **Git** | Baixar o código e registrar as mudanças | qualquer recente |
| **JDK 21** | Rodar o backend (Java) | 21 (LTS) |
| **Docker Desktop** | Rodar o banco (PostgreSQL) e os testes do backend | qualquer recente |
| **Node.js 26** | Rodar o app (front-end) | 26 (LTS), a de [`web/.nvmrc`](../../web/.nvmrc) |
| **IntelliJ IDEA** (opcional) | Editar o código e rodar o backend com um clique | Community serve |

O Maven não precisa ser instalado: o projeto já traz o `mvnw` (Maven Wrapper), que baixa a versão
certa sozinho na primeira vez.

---

## Passo a passo

Abra o **PowerShell** (menu Iniciar → digite "PowerShell" → **Windows PowerShell**). Depois de
cada instalação, **feche e abra o PowerShell de novo**, para ele enxergar o programa novo.

**1. Instale os programas.** Rode um comando por vez; se o Windows perguntar se o programa pode
fazer alterações, clique em **Sim**.

```powershell
winget install Git.Git
winget install EclipseAdoptium.Temurin.21.JDK
winget install Docker.DockerDesktop
winget install OpenJS.NodeJS.LTS
```

**2. Confira as versões.** Feche e abra o PowerShell e rode:

```powershell
git --version
java -version
node -v
docker --version
```

O `java -version` deve mostrar **21** e o `node -v` deve começar com **v26**. Se o Node mostrar
outra versão, veja "Deu errado?" abaixo.

**3. Abra o Docker Desktop** (menu Iniciar → **Docker Desktop**). Na primeira vez ele pede para
aceitar os termos e pode pedir para reiniciar o computador. Espere aparecer **Engine running** no
canto de baixo da janela. O Docker precisa estar aberto sempre que for rodar o banco ou os
testes do backend.

**4. Baixe o projeto.** Escolha uma pasta (por exemplo `IdeaProjects`) e rode:

```powershell
cd $HOME\IdeaProjects
git clone https://github.com/IgorPacheco1/Easy-finance.git
cd Easy-finance
```

**5. Crie o `.env`.** Ele guarda a senha do banco local e **nunca vai para o Git**:

```powershell
Copy-Item .env.example .env
notepad .env
```

No Bloco de Notas, troque `troque-esta-senha` por uma senha sua, salve (**Ctrl+S**) e feche.

> Escolha a senha **antes** de subir o banco pela primeira vez. Se mudar depois, o banco
> continua com a senha antiga (ver "Deu errado?" no README).

**6. Instale as dependências do app:**

```powershell
cd web
npm install
cd ..
```

**7. (Opcional) Configure o IntelliJ.** **File → Open** → escolha a pasta `Easy-finance`. Depois,
na barra de cima, **Run → Edit Configurations...** → `EasyFinanceApplication`:

- **Active profiles:** `dev`
- **Working directory:** a pasta `backend` do projeto (por exemplo
  `C:\Users\<você>\IdeaProjects\Easy-finance\backend`)

Clique em **OK**. A partir daí, o backend sobe com o ▶ ao lado do nome.

**Pronto.** Agora siga [Como rodar](../../README.md#como-rodar): banco → backend → app.

---

## Deu errado?

| O que aconteceu | O que fazer |
|---|---|
| `winget` não é reconhecido | Atualize o **Instalador de Aplicativo** pela Microsoft Store, ou baixe os programas pelos sites oficiais (links no fim). |
| O comando não é reconhecido logo depois de instalar (`java`, `node`, `docker`) | Feche e abra o PowerShell (ou o IntelliJ) de novo. |
| `node -v` mostra outra versão (ex.: `v24`) | Desinstale o Node antigo em **Configurações → Aplicativos** e instale o 26 pelo site oficial. Quem precisa de várias versões pode usar o **nvm-windows**. |
| `java -version` mostra outra versão | Em **Configurações → Sistema → Sobre → Configurações avançadas do sistema → Variáveis de Ambiente**, confira se `JAVA_HOME` aponta para a pasta do JDK 21. No IntelliJ: **File → Project Structure → SDK** = 21. |
| Docker Desktop pede o WSL 2 | Aceite a instalação que ele oferece e reinicie o computador. |
| `git clone` pede usuário e senha | O repositório é público; confira se o endereço está certo. |

---

## Para entender melhor (opcional)

### Por que cada programa

- **JDK 21:** o backend é Java 21 (ADR-0002). O JDK traz o compilador e a máquina virtual Java.
- **Docker:** em vez de instalar o PostgreSQL direto no Windows, ele roda num container, igual
  em qualquer computador (`compose.yaml`). Os testes do backend usam o Testcontainers, que também
  precisa do Docker para subir um PostgreSQL descartável.
- **Node.js 26:** o app (Vite, React, TypeScript) é construído e testado com o Node. A versão fica
  fixada no `web/.nvmrc` e no `package.json` (`engines`), e o CI usa a mesma.
- **`.env`:** guarda segredos do ambiente local fora do código. O repositório só tem o
  `.env.example`, sem senha de verdade.

### macOS e Linux

Os mesmos programas: JDK 21 (por exemplo Temurin), Docker Desktop (ou Docker Engine no Linux),
Node.js 26 (pelo site oficial ou com o `nvm`) e Git. Os comandos do projeto são os do README,
trocando a sintaxe do PowerShell pela do terminal (`cp .env.example .env`,
`SPRING_PROFILES_ACTIVE=dev ./mvnw spring-boot:run`).

### Sites oficiais

- JDK 21 (Temurin): <https://adoptium.net/>
- Docker Desktop: <https://www.docker.com/products/docker-desktop/>
- Node.js: <https://nodejs.org/>
- Git: <https://git-scm.com/>
- IntelliJ IDEA: <https://www.jetbrains.com/idea/>
