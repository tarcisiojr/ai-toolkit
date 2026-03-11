/**
 * Utilitários para detecção de MIME type e flag isText baseado na extensão do arquivo
 */

// Mapa de extensão → MIME type
const MIME_MAP: Record<string, string> = {
  // Texto / código
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.jsx': 'text/javascript',
  '.tsx': 'text/typescript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.xml': 'text/xml',
  '.sh': 'text/x-shellscript',
  '.bash': 'text/x-shellscript',
  '.py': 'text/x-python',
  '.rb': 'text/x-ruby',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.toml': 'application/toml',
  '.ini': 'text/plain',
  '.cfg': 'text/plain',
  '.env': 'text/plain',
  '.gitignore': 'text/plain',
  '.dockerignore': 'text/plain',
  '.editorconfig': 'text/plain',
  '.csv': 'text/csv',
  '.svg': 'image/svg+xml',
  '.lock': 'text/plain',
  '.log': 'text/plain',

  // Imagens
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',

  // Binários comuns
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.tgz': 'application/gzip',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
};

// Extensões consideradas texto (editáveis no portal)
const TEXT_EXTENSIONS = new Set([
  '.md', '.txt', '.json', '.yaml', '.yml', '.js', '.ts', '.jsx', '.tsx',
  '.css', '.html', '.xml', '.sh', '.bash', '.py', '.rb', '.go', '.rs',
  '.toml', '.ini', '.cfg', '.env', '.gitignore', '.dockerignore',
  '.editorconfig', '.csv', '.svg', '.lock', '.log',
]);

/** Extrai a extensão de um caminho de arquivo */
function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';

  // Tratar nomes como .gitignore (sem extensão real, mas com ponto)
  const baseName = filePath.split('/').pop() || '';
  if (baseName.startsWith('.') && baseName.indexOf('.', 1) === -1) {
    return baseName; // ex: .gitignore → .gitignore
  }

  return filePath.slice(lastDot).toLowerCase();
}

/** Detecta MIME type baseado na extensão do arquivo */
export function detectMimeType(filePath: string): string {
  const ext = getExtension(filePath);
  return MIME_MAP[ext] || 'application/octet-stream';
}

/** Verifica se o arquivo é texto (editável) baseado na extensão */
export function isTextFile(filePath: string): boolean {
  const ext = getExtension(filePath);
  return TEXT_EXTENSIONS.has(ext);
}

/** Retorna metadados de arquivo baseado no caminho */
export function getFileMetadata(filePath: string): { mimeType: string; isText: boolean } {
  return {
    mimeType: detectMimeType(filePath),
    isText: isTextFile(filePath),
  };
}
