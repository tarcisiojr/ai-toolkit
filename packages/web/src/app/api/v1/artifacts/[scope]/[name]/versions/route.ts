import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, apiSuccess, apiError } from '@/lib/api/auth';
import {
  extractTgz,
  createTgzSync,
  uploadFilesToStorage,
  copyVersionFiles,
  validateFileSizes,
  tarballStoragePath,
  getFileMetadata,
  FILE_SIZE_LIMIT,
} from '@/lib/artifacts';

type Params = { params: Promise<{ scope: string; name: string }> };

/** GET /api/v1/artifacts/:scope/:name/versions — Listar versoes */
export async function GET(request: NextRequest, { params }: Params) {
  const { scope, name } = await params;
  const supabase = await createClient();

  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    return apiError('ARTIFACT_NOT_FOUND', `Artefato "${scope}/${name}" nao encontrado`, 404);
  }

  const { data: versions, error } = await supabase
    .from('artifact_versions')
    .select('*')
    .eq('artifact_id', artifact.id)
    .eq('is_yanked', false)
    .order('version_major', { ascending: false })
    .order('version_minor', { ascending: false })
    .order('version_patch', { ascending: false });

  if (error) {
    return apiError('DB_ERROR', error.message, 500);
  }

  return apiSuccess(versions);
}

/** POST /api/v1/artifacts/:scope/:name/versions — Publicar nova versao */
export async function POST(request: NextRequest, { params }: Params) {
  const authResult = await requireAuth(request);
  if (authResult instanceof Response) return authResult;

  const { scope, name } = await params;
  const supabase = await createClient();

  // Buscar artefato
  const { data: artifact } = await supabase
    .from('artifacts')
    .select('id, owner_user_id, owner_team_id')
    .eq('scope', scope)
    .eq('name', name)
    .single();

  if (!artifact) {
    return apiError('ARTIFACT_NOT_FOUND', `Artefato "${scope}/${name}" nao encontrado`, 404);
  }

  // Detectar tipo de request: JSON (edição inline) ou FormData (upload)
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return handleInlineEdit(request, supabase, artifact, scope, name, authResult.userId);
  }

  return handleFormDataUpload(request, supabase, artifact, scope, name, authResult.userId);
}

/**
 * Modo A — Upload via FormData (.tgz do CLI ou files[] do portal)
 */
async function handleFormDataUpload(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof createClient>>,
  artifact: { id: string },
  scope: string,
  name: string,
  userId: string,
) {
  const formData = await request.formData();
  const version = formData.get('version') as string;
  const changelog = formData.get('changelog') as string | null;
  const readme = formData.get('readme') as string | null;
  const metadata = formData.get('metadata') as string | null;
  const dependencies = formData.get('dependencies') as string | null;

  // Detectar se é upload de .tgz (CLI) ou arquivos individuais (portal)
  const tgzFile = formData.get('file') as File | null;
  const individualFiles = formData.getAll('files[]') as File[];

  if (!version) {
    return apiError('VALIDATION_ERROR', 'Campo obrigatório: version', 400);
  }

  if (!tgzFile && individualFiles.length === 0) {
    return apiError('VALIDATION_ERROR', 'Envie um .tgz (campo "file") ou arquivos individuais (campo "files[]")', 400);
  }

  // Validar semver
  const semverMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.]+)?$/);
  if (!semverMatch) {
    return apiError('VALIDATION_ERROR', 'Versão deve seguir semver (ex: 1.0.0)', 400);
  }

  const [, major, minor, patch, prerelease] = semverMatch;

  if (tgzFile) {
    // ── Fluxo CLI: upload de .tgz ──
    return handleTgzUpload(
      supabase, artifact, scope, name, version,
      { major, minor, patch, prerelease },
      tgzFile, changelog, readme, metadata, dependencies, userId,
    );
  } else {
    // ── Fluxo Portal: upload de arquivos individuais ──
    return handleFilesUpload(
      supabase, artifact, scope, name, version,
      { major, minor, patch, prerelease },
      individualFiles, changelog, readme, metadata, dependencies, userId,
    );
  }
}

/**
 * Upload de .tgz (CLI) — extrai arquivos individuais e popula version_files
 */
async function handleTgzUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  artifact: { id: string },
  scope: string,
  name: string,
  version: string,
  semver: { major: string; minor: string; patch: string; prerelease: string | undefined },
  tgzFile: File,
  changelog: string | null,
  readme: string | null,
  metadata: string | null,
  dependencies: string | null,
  userId: string,
) {
  const fileBuffer = Buffer.from(await tgzFile.arrayBuffer());

  // Upload do .tgz
  const storagePath = tarballStoragePath(scope, name, version);
  const { error: uploadError } = await supabase.storage
    .from('artifact-files')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/gzip',
      upsert: false,
    });

  if (uploadError) {
    return apiError('UPLOAD_ERROR', uploadError.message, 500);
  }

  // Calcular checksum SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(fileBuffer));
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Inserir versão no banco
  const { data: versionData, error: versionError } = await supabase
    .from('artifact_versions')
    .insert({
      artifact_id: artifact.id,
      version,
      version_major: parseInt(semver.major),
      version_minor: parseInt(semver.minor),
      version_patch: parseInt(semver.patch),
      prerelease: semver.prerelease?.slice(1) || null,
      changelog,
      readme,
      storage_path: storagePath,
      file_size: tgzFile.size,
      checksum: `sha256-${checksum}`,
      metadata: metadata ? JSON.parse(metadata) : {},
      dependencies: dependencies ? JSON.parse(dependencies) : [],
      published_by: userId,
    })
    .select()
    .single();

  if (versionError) {
    if (versionError.code === '23505') {
      return apiError('VERSION_EXISTS', `Versão ${version} já existe`, 409);
    }
    return apiError('DB_ERROR', versionError.message, 500);
  }

  // Extrair arquivos do .tgz e fazer upload individual + popular version_files
  try {
    const extractedFiles = await extractTgz(fileBuffer);

    // Validar tamanhos
    const sizeError = validateFileSizes(extractedFiles.map((f) => ({ path: f.path, size: f.size })));
    if (sizeError) {
      // Versão já criada, mas sem arquivos individuais — não é crítico
      console.warn(`Aviso de tamanho ao extrair: ${sizeError}`);
    }

    // Upload dos arquivos individuais
    const fileRecords = await uploadFilesToStorage(
      supabase, scope, name, version,
      extractedFiles.map((f) => ({
        path: f.path,
        content: f.content,
        size: f.size,
        mimeType: f.mimeType,
      })),
    );

    // Popular tabela version_files
    if (fileRecords.length > 0) {
      await supabase.from('version_files').insert(
        fileRecords.map((r) => ({
          version_id: versionData.id,
          ...r,
        })),
      );
    }
  } catch (err) {
    // Extração não-crítica — o .tgz e a versão já foram criados
    console.error('Erro ao extrair arquivos do .tgz:', err);
  }

  // Atualizar latest_version
  await supabase
    .from('artifacts')
    .update({ latest_version: version })
    .eq('id', artifact.id);

  return apiSuccess(versionData);
}

/**
 * Upload de arquivos individuais (portal) — gera .tgz e popula version_files
 */
async function handleFilesUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  artifact: { id: string },
  scope: string,
  name: string,
  version: string,
  semver: { major: string; minor: string; patch: string; prerelease: string | undefined },
  files: File[],
  changelog: string | null,
  readme: string | null,
  metadata: string | null,
  dependencies: string | null,
  userId: string,
) {
  // Ler conteúdo de todos os arquivos
  const fileEntries: Array<{
    path: string;
    content: Buffer;
    size: number;
    mimeType: string;
  }> = [];

  for (const file of files) {
    // O nome do arquivo pode incluir caminho relativo via webkitRelativePath
    const filePath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const content = Buffer.from(await file.arrayBuffer());

    // Validar tamanho individual
    if (content.length > FILE_SIZE_LIMIT) {
      return apiError(
        'FILE_TOO_LARGE',
        `Arquivo "${filePath}" excede o limite de 5MB`,
        413,
      );
    }

    const meta = getFileMetadata(filePath);
    fileEntries.push({
      path: filePath,
      content,
      size: content.length,
      mimeType: meta.mimeType,
    });
  }

  // Validar tamanho total
  const sizeError = validateFileSizes(fileEntries.map((f) => ({ path: f.path, size: f.size })));
  if (sizeError) {
    return apiError('VERSION_TOO_LARGE', sizeError, 413);
  }

  // Gerar .tgz
  const tgzBuffer = createTgzSync(
    fileEntries.map((f) => ({ path: f.path, content: f.content })),
  );

  // Upload do .tgz
  const tgzPath = tarballStoragePath(scope, name, version);
  const { error: tgzUploadError } = await supabase.storage
    .from('artifact-files')
    .upload(tgzPath, tgzBuffer, {
      contentType: 'application/gzip',
      upsert: false,
    });

  if (tgzUploadError) {
    return apiError('UPLOAD_ERROR', tgzUploadError.message, 500);
  }

  // Calcular checksum do .tgz
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(tgzBuffer));
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Inserir versão no banco
  const { data: versionData, error: versionError } = await supabase
    .from('artifact_versions')
    .insert({
      artifact_id: artifact.id,
      version,
      version_major: parseInt(semver.major),
      version_minor: parseInt(semver.minor),
      version_patch: parseInt(semver.patch),
      prerelease: semver.prerelease?.slice(1) || null,
      changelog,
      readme,
      storage_path: tgzPath,
      file_size: tgzBuffer.length,
      checksum: `sha256-${checksum}`,
      metadata: metadata ? JSON.parse(metadata) : {},
      dependencies: dependencies ? JSON.parse(dependencies) : [],
      published_by: userId,
    })
    .select()
    .single();

  if (versionError) {
    if (versionError.code === '23505') {
      return apiError('VERSION_EXISTS', `Versão ${version} já existe`, 409);
    }
    return apiError('DB_ERROR', versionError.message, 500);
  }

  // Upload dos arquivos individuais + popular version_files
  const fileRecords = await uploadFilesToStorage(supabase, scope, name, version, fileEntries);

  if (fileRecords.length > 0) {
    await supabase.from('version_files').insert(
      fileRecords.map((r) => ({
        version_id: versionData.id,
        ...r,
      })),
    );
  }

  // Atualizar latest_version
  await supabase
    .from('artifacts')
    .update({ latest_version: version })
    .eq('id', artifact.id);

  return apiSuccess(versionData);
}

/**
 * Modo B — Edição inline com baseVersion + changes (JSON)
 */
async function handleInlineEdit(
  request: NextRequest,
  supabase: Awaited<ReturnType<typeof createClient>>,
  artifact: { id: string },
  scope: string,
  name: string,
  userId: string,
) {
  const body = await request.json();
  const { version, baseVersion, changes, changelog } = body as {
    version: string;
    baseVersion: string;
    changes: Record<string, string | null>;
    changelog: string;
  };

  if (!version || !baseVersion || !changes) {
    return apiError('VALIDATION_ERROR', 'Campos obrigatórios: version, baseVersion, changes', 400);
  }

  // Validar semver
  const semverMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(-[a-zA-Z0-9.]+)?$/);
  if (!semverMatch) {
    return apiError('VALIDATION_ERROR', 'Versão deve seguir semver (ex: 1.0.0)', 400);
  }

  const [, major, minor, patch, prerelease] = semverMatch;

  // Buscar versão base
  const { data: baseVersionData } = await supabase
    .from('artifact_versions')
    .select('id')
    .eq('artifact_id', artifact.id)
    .eq('version', baseVersion)
    .single();

  if (!baseVersionData) {
    return apiError('VERSION_NOT_FOUND', `Versão base ${baseVersion} não encontrada`, 404);
  }

  // Copiar arquivos da versão base aplicando alterações
  let copyResult;
  try {
    // Para copyVersionFiles, precisamos passar o version_id da base
    // Ajustar: buscar version_files pela version_id
    const { data: baseFiles } = await supabase
      .from('version_files')
      .select('*')
      .eq('version_id', baseVersionData.id);

    if (!baseFiles || baseFiles.length === 0) {
      return apiError('NO_FILES', 'Versão base não possui arquivos indexados', 400);
    }

    copyResult = await copyVersionFilesFromRecords(
      supabase, scope, name, version, baseFiles, changes,
    );
  } catch (err) {
    return apiError('COPY_ERROR', `Erro ao copiar arquivos: ${(err as Error).message}`, 500);
  }

  // Gerar .tgz com todos os arquivos da nova versão
  const tgzBuffer = createTgzSync(copyResult.allFiles);

  // Upload do .tgz
  const tgzPath = tarballStoragePath(scope, name, version);
  const { error: tgzUploadError } = await supabase.storage
    .from('artifact-files')
    .upload(tgzPath, tgzBuffer, {
      contentType: 'application/gzip',
      upsert: false,
    });

  if (tgzUploadError) {
    return apiError('UPLOAD_ERROR', tgzUploadError.message, 500);
  }

  // Calcular checksum
  const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(tgzBuffer));
  const checksum = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Inserir versão
  const { data: versionData, error: versionError } = await supabase
    .from('artifact_versions')
    .insert({
      artifact_id: artifact.id,
      version,
      version_major: parseInt(major),
      version_minor: parseInt(minor),
      version_patch: parseInt(patch),
      prerelease: prerelease?.slice(1) || null,
      changelog: changelog || null,
      storage_path: tgzPath,
      file_size: tgzBuffer.length,
      checksum: `sha256-${checksum}`,
      published_by: userId,
    })
    .select()
    .single();

  if (versionError) {
    if (versionError.code === '23505') {
      return apiError('VERSION_EXISTS', `Versão ${version} já existe`, 409);
    }
    return apiError('DB_ERROR', versionError.message, 500);
  }

  // Popular version_files
  if (copyResult.records.length > 0) {
    await supabase.from('version_files').insert(
      copyResult.records.map((r) => ({
        version_id: versionData.id,
        ...r,
      })),
    );
  }

  // Atualizar latest_version
  await supabase
    .from('artifacts')
    .update({ latest_version: version })
    .eq('id', artifact.id);

  return apiSuccess(versionData);
}

/**
 * Copia arquivos a partir de registros de version_files, aplicando changes
 */
async function copyVersionFilesFromRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  scope: string,
  name: string,
  newVersion: string,
  baseFiles: Array<{
    file_path: string;
    storage_path: string;
    mime_type: string;
    file_size: number;
    is_text: boolean;
  }>,
  changes: Record<string, string | null>,
) {
  const basePath = `public/${scope}/${name}/${newVersion}`;
  const records: Array<{
    file_path: string;
    file_size: number;
    mime_type: string;
    is_text: boolean;
    storage_path: string;
  }> = [];
  const allFiles: Array<{ path: string; content: Buffer }> = [];

  for (const baseFile of baseFiles) {
    const filePath = baseFile.file_path;

    // Arquivo removido
    if (changes[filePath] === null) continue;

    let content: Buffer;
    let fileSize: number;

    if (filePath in changes) {
      // Arquivo editado
      content = Buffer.from(changes[filePath]!, 'utf-8');
      fileSize = content.length;
    } else {
      // Copiar da versão base
      const { data, error } = await supabase.storage
        .from('artifact-files')
        .download(baseFile.storage_path);

      if (error || !data) {
        throw new Error(`Erro ao baixar "${filePath}": ${error?.message}`);
      }

      content = Buffer.from(await data.arrayBuffer());
      fileSize = content.length;
    }

    const storagePath = `${basePath}/${filePath}`;
    const { error: uploadError } = await supabase.storage
      .from('artifact-files')
      .upload(storagePath, content, {
        contentType: baseFile.mime_type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao copiar "${filePath}": ${uploadError.message}`);
    }

    records.push({
      file_path: filePath,
      file_size: fileSize,
      mime_type: baseFile.mime_type,
      is_text: baseFile.is_text,
      storage_path: storagePath,
    });

    allFiles.push({ path: filePath, content });
  }

  // Arquivos novos (não existiam na base)
  for (const [filePath, newContent] of Object.entries(changes)) {
    if (newContent === null) continue;
    if (baseFiles.some((f) => f.file_path === filePath)) continue;

    const content = Buffer.from(newContent, 'utf-8');
    const meta = getFileMetadata(filePath);
    const storagePath = `${basePath}/${filePath}`;

    const { error: uploadError } = await supabase.storage
      .from('artifact-files')
      .upload(storagePath, content, {
        contentType: meta.mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao criar "${filePath}": ${uploadError.message}`);
    }

    records.push({
      file_path: filePath,
      file_size: content.length,
      mime_type: meta.mimeType,
      is_text: meta.isText,
      storage_path: storagePath,
    });

    allFiles.push({ path: filePath, content });
  }

  return { records, allFiles };
}
