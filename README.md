# AI Toolkit

> The package registry for AI coding tool artifacts.

AI Toolkit is an open-source package manager for sharing and installing **skills**, **MCP servers**, **templates**, **configs**, and **hooks** across AI coding tools like Claude Code, OpenCode, Gemini CLI, and more.

## Features

- **5 artifact types**: Skills, MCP Servers, Templates, Configs, Hooks
- **CLI-first**: Publish and install artifacts from the terminal
- **Multi-tool support**: Works with Claude Code, OpenCode, Gemini CLI, and others
- **Teams & access control**: Public, private, and team-scoped artifacts
- **Semantic versioning**: Automatic version resolution with semver ranges
- **Full-text search**: Find artifacts by name, keywords, or description

## Quick Start

```bash
# Search for artifacts
npx aitk-cli search code-review

# Install an artifact
npx aitk-cli install @user/skill-name

# Authenticate
npx aitk-cli login

# Publish your own artifact
npx aitk-cli publish
```

## Artifact Types

| Type | Description | Install Path |
|------|-------------|--------------|
| **Skill** | SKILL.md instructions for AI assistants | `.claude/skills/<name>/` |
| **MCP** | MCP server configurations | Merged into `.claude/settings.json` |
| **Config** | Configuration files for AI tools | `.claude/` or tool-specific path |
| **Hook** | Automation scripts for AI tool events | `.claude/hooks/<name>/` |
| **Template** | Pre-configured artifact bundles | Multiple paths |

## Architecture

AI Toolkit is a monorepo with 3 packages:

```
ai-toolkit/
├── packages/
│   ├── web/          # Next.js 15 (frontend + REST API)
│   ├── cli/          # Commander.js CLI (aitk)
│   └── shared/       # Shared types and validators (Zod)
├── openspec/         # OpenSpec specifications
├── turbo.json        # Turborepo config
└── vercel.json       # Vercel deployment config
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend + API | Next.js 15 (App Router) |
| Database + Auth + Storage | Supabase (PostgreSQL) |
| Hosting | Vercel |
| CLI | Commander.js + chalk + ora |
| Monorepo | Turborepo |
| Validation | Zod |
| Language | TypeScript (fullstack) |

## CLI Commands

| Command | Description |
|---------|-------------|
| `aitk login` | Authenticate via GitHub OAuth |
| `aitk logout` | Remove stored credentials |
| `aitk search <query>` | Search the artifact registry |
| `aitk install <scope/name>` | Install an artifact |
| `aitk publish` | Publish an artifact |
| `aitk list` | List installed artifacts |
| `aitk status` | Check for updates |

## API

REST API available at `/api/v1/`:

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/artifacts` | List public artifacts |
| `GET` | `/artifacts/search?q=` | Full-text search |
| `POST` | `/artifacts` | Create artifact |
| `GET` | `/artifacts/:scope/:name` | Artifact details |
| `POST` | `/artifacts/:scope/:name/versions` | Publish version |
| `GET` | `/artifacts/:scope/:name/versions/:v/download` | Download tarball |
| `POST` | `/auth/cli-token` | Generate CLI token |
| `GET` | `/auth/verify` | Verify token |

## Development

```bash
# Install dependencies
npm install

# Run all dev servers
npx turbo run dev

# Build all packages
npx turbo run build

# Lint and type-check
npx turbo run lint type-check

# Run tests
npx turbo run test
```

### Publishing an Artifact

Create an `aitk-artifact.json` in your artifact directory:

```json
{
  "scope": "your-username",
  "name": "my-skill",
  "version": "1.0.0",
  "type": "skill",
  "description": "A useful skill for AI assistants",
  "keywords": ["productivity", "code-review"],
  "toolTargets": ["claude-code"],
  "files": ["SKILL.md"]
}
```

Then run:

```bash
aitk publish
```

## License

MIT

---

<details>
<summary>Leia em Portugues</summary>

# AI Toolkit

> O registry de artefatos para AI coding tools.

AI Toolkit e um gerenciador de pacotes open-source para compartilhar e instalar **skills**, **MCP servers**, **templates**, **configs** e **hooks** entre ferramentas de IA como Claude Code, OpenCode, Gemini CLI e outras.

## Funcionalidades

- **5 tipos de artefatos**: Skills, MCP Servers, Templates, Configs, Hooks
- **CLI-first**: Publique e instale artefatos pelo terminal
- **Multi-ferramenta**: Funciona com Claude Code, OpenCode, Gemini CLI e outros
- **Equipes e controle de acesso**: Artefatos publicos, privados e por equipe
- **Versionamento semantico**: Resolucao automatica de versoes com semver
- **Busca full-text**: Encontre artefatos por nome, keywords ou descricao

## Inicio Rapido

```bash
# Buscar artefatos
npx aitk-cli search code-review

# Instalar um artefato
npx aitk-cli install @user/skill-name

# Autenticar
npx aitk-cli login

# Publicar seu artefato
npx aitk-cli publish
```

## Tipos de Artefatos

| Tipo | Descricao | Caminho de Instalacao |
|------|-----------|----------------------|
| **Skill** | Instrucoes SKILL.md para assistentes de IA | `.claude/skills/<name>/` |
| **MCP** | Configuracoes de servidores MCP | Merge no `.claude/settings.json` |
| **Config** | Arquivos de configuracao para ferramentas de IA | `.claude/` ou caminho da ferramenta |
| **Hook** | Scripts de automacao para eventos de IA | `.claude/hooks/<name>/` |
| **Template** | Conjuntos pre-configurados de artefatos | Multiplos caminhos |

## Arquitetura

AI Toolkit e um monorepo com 3 pacotes:

```
ai-toolkit/
├── packages/
│   ├── web/          # Next.js 15 (frontend + API REST)
│   ├── cli/          # CLI Commander.js (aitk)
│   └── shared/       # Tipos e validadores compartilhados (Zod)
├── openspec/         # Especificacoes OpenSpec
├── turbo.json        # Configuracao Turborepo
└── vercel.json       # Configuracao de deploy Vercel
```

### Stack Tecnologica

| Componente | Tecnologia |
|------------|------------|
| Frontend + API | Next.js 15 (App Router) |
| Banco + Auth + Storage | Supabase (PostgreSQL) |
| Hosting | Vercel |
| CLI | Commander.js + chalk + ora |
| Monorepo | Turborepo |
| Validacao | Zod |
| Linguagem | TypeScript (fullstack) |

## Comandos do CLI

| Comando | Descricao |
|---------|-----------|
| `aitk login` | Autenticar via GitHub OAuth |
| `aitk logout` | Remover credenciais |
| `aitk search <query>` | Buscar no registry |
| `aitk install <scope/name>` | Instalar artefato |
| `aitk publish` | Publicar artefato |
| `aitk list` | Listar artefatos instalados |
| `aitk status` | Verificar atualizacoes |

## Desenvolvimento

```bash
# Instalar dependencias
npm install

# Iniciar servidores de desenvolvimento
npx turbo run dev

# Build de todos os pacotes
npx turbo run build

# Lint e verificacao de tipos
npx turbo run lint type-check

# Executar testes
npx turbo run test
```

### Publicando um Artefato

Crie um `aitk-artifact.json` no diretorio do seu artefato:

```json
{
  "scope": "seu-username",
  "name": "minha-skill",
  "version": "1.0.0",
  "type": "skill",
  "description": "Uma skill util para assistentes de IA",
  "keywords": ["produtividade", "code-review"],
  "toolTargets": ["claude-code"],
  "files": ["SKILL.md"]
}
```

Depois execute:

```bash
aitk publish
```

## Licenca

MIT

</details>
