export { ApiClient, createApiClient } from './core/api-client.js';
export { getConfig, saveConfig, type CliConfig } from './core/config.js';
export { getAuth, saveAuth, clearAuth, isAuthenticated, requireAuth } from './core/auth.js';
export {
  readManifest,
  writeManifest,
  createDefaultManifest,
  addArtifactToManifest,
  removeArtifactFromManifest,
} from './core/manifest.js';
export { logger } from './utils/logger.js';
export { BaseInstaller, type InstallResult } from './installers/base-installer.js';
export { SkillInstaller } from './installers/skill-installer.js';
