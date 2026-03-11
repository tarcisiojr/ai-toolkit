/**
 * Utilitários para gerenciar arquivos de artefatos no Supabase Storage
 * Copia arquivos entre versões e aplica alterações (changes overlay)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getFileMetadata } from './mime';

/** Limites de tamanho */
export const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB por arquivo
export const VERSION_SIZE_LIMIT = 50 * 1024 * 1024; // 50MB por versão

/** Caminho base no storage para arquivos de uma versão */
export function versionStoragePath(
  scope: string,
  name: string,
  version: string,
): string {
  return `public/${scope}/${name}/${version}`;
}

/** Caminho do tarball no storage */
export function tarballStoragePath(
  scope: string,
  name: string,
  version: string,
): string {
  return `public/${scope}/${name}/${version}.tgz`;
}

/** Registro de arquivo para a tabela version_files */
export interface VersionFileRecord {
  file_path: string;
  file_size: number;
  mime_type: string;
  is_text: boolean;
  storage_path: string;
}

/**
 * Faz upload de arquivos individuais para o Storage e retorna registros
 * para inserir na tabela version_files
 */
export async function uploadFilesToStorage(
  supabase: SupabaseClient,
  scope: string,
  name: string,
  version: string,
  files: Array<{ path: string; content: Buffer; size: number; mimeType: string }>,
): Promise<VersionFileRecord[]> {
  const basePath = versionStoragePath(scope, name, version);
  const records: VersionFileRecord[] = [];

  for (const file of files) {
    const storagePath = `${basePath}/${file.path}`;

    const { error } = await supabase.storage
      .from('artifact-files')
      .upload(storagePath, file.content, {
        contentType: file.mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro ao fazer upload de "${file.path}": ${error.message}`);
    }

    const metadata = getFileMetadata(file.path);
    records.push({
      file_path: file.path,
      file_size: file.size,
      mime_type: file.mimeType,
      is_text: metadata.isText,
      storage_path: storagePath,
    });
  }

  return records;
}

/**
 * Copia arquivos de uma versão para outra no Storage, aplicando alterações
 * @param changes - mapa de filePath → novo conteúdo (string). Se valor é null, o arquivo é removido
 */
export async function copyVersionFiles(
  supabase: SupabaseClient,
  scope: string,
  name: string,
  baseVersion: string,
  newVersion: string,
  changes: Record<string, string | null>,
): Promise<{
  records: VersionFileRecord[];
  allFiles: Array<{ path: string; content: Buffer }>;
}> {
  // Buscar lista de arquivos da versão base
  const basePath = versionStoragePath(scope, name, baseVersion);
  const newBasePath = versionStoragePath(scope, name, newVersion);

  // Listar arquivos da versão base via tabela version_files
  const { data: baseFiles, error: listError } = await supabase
    .from('version_files')
    .select('file_path, storage_path, mime_type, file_size, is_text')
    .eq('version_id', baseVersion);

  if (listError || !baseFiles) {
    throw new Error(`Erro ao listar arquivos da versão base: ${listError?.message}`);
  }

  const records: VersionFileRecord[] = [];
  const allFiles: Array<{ path: string; content: Buffer }> = [];

  for (const baseFile of baseFiles) {
    const filePath = baseFile.file_path;

    // Se o arquivo foi marcado para remoção, pular
    if (changes[filePath] === null) continue;

    let content: Buffer;
    let mimeType = baseFile.mime_type;
    let fileSize: number;

    if (filePath in changes) {
      // Arquivo foi editado — usar novo conteúdo
      content = Buffer.from(changes[filePath]!, 'utf-8');
      fileSize = content.length;
    } else {
      // Copiar conteúdo da versão base
      const { data, error } = await supabase.storage
        .from('artifact-files')
        .download(baseFile.storage_path);

      if (error || !data) {
        throw new Error(`Erro ao baixar arquivo "${filePath}": ${error?.message}`);
      }

      content = Buffer.from(await data.arrayBuffer());
      fileSize = content.length;
    }

    // Upload para a nova versão
    const storagePath = `${newBasePath}/${filePath}`;
    const { error: uploadError } = await supabase.storage
      .from('artifact-files')
      .upload(storagePath, content, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao copiar "${filePath}": ${uploadError.message}`);
    }

    const metadata = getFileMetadata(filePath);
    records.push({
      file_path: filePath,
      file_size: fileSize,
      mime_type: mimeType,
      is_text: metadata.isText,
      storage_path: storagePath,
    });

    allFiles.push({ path: filePath, content });
  }

  // Adicionar arquivos novos (que não existiam na base)
  for (const [filePath, newContent] of Object.entries(changes)) {
    if (newContent === null) continue;
    // Se já processamos acima, pular
    if (baseFiles.some((f) => f.file_path === filePath)) continue;

    const content = Buffer.from(newContent, 'utf-8');
    const metadata = getFileMetadata(filePath);
    const storagePath = `${newBasePath}/${filePath}`;

    const { error: uploadError } = await supabase.storage
      .from('artifact-files')
      .upload(storagePath, content, {
        contentType: metadata.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao criar "${filePath}": ${uploadError.message}`);
    }

    records.push({
      file_path: filePath,
      file_size: content.length,
      mime_type: metadata.mimeType,
      is_text: metadata.isText,
      storage_path: storagePath,
    });

    allFiles.push({ path: filePath, content });
  }

  return { records, allFiles };
}

/**
 * Valida limites de tamanho de arquivos
 * Retorna mensagem de erro ou null se válido
 */
export function validateFileSizes(
  files: Array<{ path: string; size: number }>,
): string | null {
  let totalSize = 0;

  for (const file of files) {
    if (file.size > FILE_SIZE_LIMIT) {
      return `Arquivo "${file.path}" excede o limite de 5MB (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }
    totalSize += file.size;
  }

  if (totalSize > VERSION_SIZE_LIMIT) {
    return `Total de arquivos excede o limite de 50MB (${(totalSize / 1024 / 1024).toFixed(1)}MB)`;
  }

  return null;
}
