# @tarcisiojunior/shared

Shared types, validators and constants for the [AI Toolkit](https://ai-toolkit-henna.vercel.app) ecosystem.

## Overview

This package provides the core type definitions, Zod validators and constants used across the AI Toolkit monorepo:

- **Types**: `Artifact`, `ArtifactVersion`, `User`, `Team`, `ApiResponse` and more
- **Validators**: Zod schemas for artifact manifests, publish payloads, and search queries
- **Constants**: Supported artifact types (`skill`, `mcp`, `template`, `config`, `hook`) and tool targets (`claude-code`, `opencode`, `gemini-cli`, etc.)

## Installation

```bash
npm install @tarcisiojunior/shared
```

## Usage

```typescript
import {
  type Artifact,
  type ArtifactType,
  ARTIFACT_TYPES,
  TOOL_TARGETS,
  artifactManifestSchema,
} from '@tarcisiojunior/shared';

// Validate an artifact manifest
const result = artifactManifestSchema.safeParse(manifest);

// Use type constants
console.log(ARTIFACT_TYPES); // ['skill', 'mcp', 'template', 'config', 'hook']
console.log(TOOL_TARGETS);   // ['claude-code', 'opencode', 'gemini-cli', ...]
```

## Links

- **AI Toolkit CLI**: [npmjs.com/package/aitk-cli](https://www.npmjs.com/package/aitk-cli)
- **Registry**: [ai-toolkit-henna.vercel.app](https://ai-toolkit-henna.vercel.app)
- **GitHub**: [github.com/tarcisiojr/ai-toolkit](https://github.com/tarcisiojr/ai-toolkit)

## License

MIT &copy; [tarcisiojr](https://github.com/tarcisiojr)
