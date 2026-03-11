<p align="center">
  <img src="https://aitk.dev/logo.svg" alt="AI Toolkit" width="80" />
</p>

<h1 align="center">aitoolkit</h1>

<p align="center">
  <strong>Package manager for AI coding tools</strong>
  <br />
  Install and share skills, MCPs, templates, configs and hooks for
  <br />
  Claude Code &bull; OpenCode &bull; Gemini CLI &bull; Cursor &bull; Windsurf
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/aitoolkit"><img src="https://img.shields.io/npm/v/aitoolkit.svg?style=flat-square&color=00d4ff" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/aitoolkit"><img src="https://img.shields.io/npm/dm/aitoolkit.svg?style=flat-square&color=00ff88" alt="npm downloads" /></a>
  <a href="https://github.com/tarcisiojr/ai-toolkit/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="license" /></a>
</p>

---

## Quick Start

```bash
# Install a skill with npx (no install needed)
npx aitoolkit search "code review"
npx aitoolkit install official/code-review

# Or install globally
npm install -g aitoolkit
aitk search "memory"
aitk install official/memory-bank
```

## What is AI Toolkit?

AI Toolkit is a **package manager for AI coding tool artifacts**. Think of it as npm, but for the prompts, skills, MCP servers, templates, and configurations that power your AI coding assistants.

### Supported artifact types

| Type | Description |
|------|-------------|
| **skill** | Reusable prompts and workflows (slash commands) |
| **mcp** | Model Context Protocol server configurations |
| **template** | Project starter templates and boilerplates |
| **config** | Tool configuration files and settings |
| **hook** | Git hooks, pre/post-commit scripts |

### Supported tools

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic)
- [OpenCode](https://github.com/opencode-ai/opencode)
- [Gemini CLI](https://github.com/google-gemini/gemini-cli)
- Cursor, Windsurf, and more

## Commands

### Registry

```bash
aitk search <query>              # Search the registry
aitk install <scope>/<name>      # Install an artifact
aitk update [scope/name]         # Update installed artifacts
aitk remove <scope>/<name>       # Remove an artifact
aitk publish                     # Publish your artifact
```

### Project

```bash
aitk init                        # Initialize a new project
aitk init <scope>/<template>     # Initialize from a template
aitk list                        # List installed artifacts
aitk status                      # Check for available updates
aitk sync                        # Sync artifacts with the registry
aitk config                      # Manage CLI configuration
```

### Teams

```bash
aitk team create <slug>          # Create a team
aitk team list                   # List your teams
aitk team add-member <slug> <user>  # Add a team member
```

### Authentication

```bash
aitk login                       # Authenticate with the registry
aitk logout                      # Remove local credentials
```

## Configuration

The CLI stores its configuration in `~/.aitk/`:

```
~/.aitk/
  auth.json      # Authentication credentials
  config.json    # CLI settings (registry URL, default tool)
```

## CI/CD Integration

Publish artifacts automatically with GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to AI Toolkit
on:
  release:
    types: [published]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: tarcisiojr/ai-toolkit/.github/actions/aitk-publish@main
        with:
          api-token: ${{ secrets.AITK_API_TOKEN }}
```

## Shell Completions

```bash
# Bash
eval "$(aitk completions bash)"

# Zsh
eval "$(aitk completions zsh)"

# Fish
aitk completions fish | source
```

## Links

- **Registry**: [aitk.dev](https://aitk.dev)
- **Documentation**: [aitk.dev/docs](https://aitk.dev/docs)
- **GitHub**: [github.com/tarcisiojr/ai-toolkit](https://github.com/tarcisiojr/ai-toolkit)
- **Issues**: [github.com/tarcisiojr/ai-toolkit/issues](https://github.com/tarcisiojr/ai-toolkit/issues)

## License

MIT &copy; [tarcisiojr](https://github.com/tarcisiojr)
