/**
 * Utilitários para extrair e gerar tarballs (.tgz) server-side
 * Usa tar v7 + zlib nativo do Node.js
 */

import { Readable, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import { createGunzip, gzipSync } from 'zlib';
import { extract as tarExtract, Header } from 'tar';
import { getFileMetadata } from './mime';

/** Metadados de um arquivo extraído */
export interface ExtractedFile {
  path: string;
  content: Buffer;
  size: number;
  mimeType: string;
  isText: boolean;
}

/**
 * Extrai arquivos de um buffer .tgz e retorna lista com metadados
 * Remove prefixo de diretório raiz se houver (ex: package/)
 */
export async function extractTgz(tgzBuffer: Buffer): Promise<ExtractedFile[]> {
  const files: ExtractedFile[] = [];

  // Usa tar.extract com onReadEntry para capturar cada arquivo
  const extractor = tarExtract({
    onReadEntry: (entry) => {
      if (entry.type !== 'File') {
        entry.resume();
        return;
      }

      const chunks: Buffer[] = [];
      entry.on('data', (chunk: Buffer) => chunks.push(chunk));
      entry.on('end', () => {
        const content = Buffer.concat(chunks);
        // Remove prefixo de diretório raiz (ex: package/SKILL.md → SKILL.md)
        let filePath = entry.path;
        const firstSlash = filePath.indexOf('/');
        if (firstSlash !== -1) {
          filePath = filePath.slice(firstSlash + 1);
        }
        if (!filePath) return;

        const metadata = getFileMetadata(filePath);
        files.push({
          path: filePath,
          content,
          size: content.length,
          ...metadata,
        });
      });
    },
  });

  const readable = Readable.from(tgzBuffer);
  const gunzip = createGunzip();

  await pipeline(readable, gunzip, extractor);
  return files;
}

/**
 * Gera um buffer .tgz a partir de uma lista de arquivos
 * Implementação simplificada usando tar header manual + gzip
 */
export function createTgzSync(
  files: Array<{ path: string; content: Buffer | string }>,
): Buffer {
  // Constrói um tar uncompressed manualmente
  const blocks: Buffer[] = [];

  for (const file of files) {
    const content = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf-8');

    const filePath = `package/${file.path}`;

    // Criar header tar (512 bytes)
    const header = createTarHeader(filePath, content.length);
    blocks.push(header);

    // Conteúdo do arquivo
    blocks.push(content);

    // Padding para múltiplo de 512
    const remainder = content.length % 512;
    if (remainder > 0) {
      blocks.push(Buffer.alloc(512 - remainder));
    }
  }

  // Dois blocos de zeros para marcar fim do arquivo tar
  blocks.push(Buffer.alloc(1024));

  const tarBuffer = Buffer.concat(blocks);
  return Buffer.from(gzipSync(tarBuffer));
}

/** Cria um header tar de 512 bytes no formato POSIX ustar */
function createTarHeader(filePath: string, size: number): Buffer {
  const header = Buffer.alloc(512);

  // name (0-99)
  header.write(filePath.slice(0, 100), 0, 100, 'utf-8');
  // mode (100-107)
  header.write('0000644\0', 100, 8, 'utf-8');
  // uid (108-115)
  header.write('0001000\0', 108, 8, 'utf-8');
  // gid (116-123)
  header.write('0001000\0', 116, 8, 'utf-8');
  // size (124-135) - octal
  header.write(size.toString(8).padStart(11, '0') + '\0', 124, 12, 'utf-8');
  // mtime (136-147)
  const mtime = Math.floor(Date.now() / 1000);
  header.write(mtime.toString(8).padStart(11, '0') + '\0', 136, 12, 'utf-8');
  // checksum placeholder (148-155) - espaços
  header.write('        ', 148, 8, 'utf-8');
  // typeflag (156) - '0' = regular file
  header.write('0', 156, 1, 'utf-8');
  // magic (257-262)
  header.write('ustar\0', 257, 6, 'utf-8');
  // version (263-264)
  header.write('00', 263, 2, 'utf-8');

  // Se o path > 100 chars, usar prefix (155-154 no header, posição 345)
  if (filePath.length > 100) {
    const prefixEnd = filePath.lastIndexOf('/', filePath.length - 101);
    if (prefixEnd !== -1) {
      const prefix = filePath.slice(0, prefixEnd);
      const name = filePath.slice(prefixEnd + 1);
      header.fill(0, 0, 100);
      header.write(name.slice(0, 100), 0, 100, 'utf-8');
      header.write(prefix.slice(0, 155), 345, 155, 'utf-8');
    }
  }

  // Calcular checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) {
    checksum += header[i];
  }
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf-8');

  return header;
}
