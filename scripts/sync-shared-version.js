#!/usr/bin/env node
// scripts/sync-shared-version.js
// Sincroniza a versão de @tarcisiojunior/shared referenciada em packages/cli/package.json
// com a versão atual declarada em packages/shared/package.json.
//
// Uso:
//   node scripts/sync-shared-version.js          # modo sync: atualiza se necessário
//   node scripts/sync-shared-version.js --check  # modo check: valida sem modificar (exit 1 se divergir)

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHARED_PKG = path.join(ROOT, 'packages', 'shared', 'package.json');
const CLI_PKG = path.join(ROOT, 'packages', 'cli', 'package.json');
const SHARED_DEP_NAME = '@tarcisiojunior/shared';

const isCheckMode = process.argv.includes('--check');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Erro ao ler ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  } catch (err) {
    console.error(`Erro ao escrever ${filePath}: ${err.message}`);
    process.exit(1);
  }
}

// Extrai o prefixo semver (^, ~ ou vazio) de uma string de versão
function extractPrefix(versionStr) {
  if (versionStr.startsWith('^')) return '^';
  if (versionStr.startsWith('~')) return '~';
  return '';
}

const sharedPkg = readJson(SHARED_PKG);
const cliPkg = readJson(CLI_PKG);

const sharedVersion = sharedPkg.version;
if (!sharedVersion) {
  console.error(`Erro: campo "version" não encontrado em ${SHARED_PKG}`);
  process.exit(1);
}

const currentRef = cliPkg.dependencies && cliPkg.dependencies[SHARED_DEP_NAME];
if (currentRef === undefined) {
  console.error(`Erro: dependência "${SHARED_DEP_NAME}" não encontrada em ${CLI_PKG}`);
  process.exit(1);
}

const prefix = extractPrefix(currentRef);
const expectedRef = prefix + sharedVersion;

if (currentRef === expectedRef) {
  console.log(`OK: ${SHARED_DEP_NAME} já está sincronizado em ${expectedRef}`);
  process.exit(0);
}

if (isCheckMode) {
  console.error(
    `ERRO: versões inconsistentes!\n` +
    `  packages/cli/package.json referencia ${SHARED_DEP_NAME}@${currentRef}\n` +
    `  packages/shared/package.json declara version ${sharedVersion}\n` +
    `  Execute "node scripts/sync-shared-version.js" para corrigir.`
  );
  process.exit(1);
}

// Modo sync: atualiza o arquivo
cliPkg.dependencies[SHARED_DEP_NAME] = expectedRef;
writeJson(CLI_PKG, cliPkg);
console.log(`Atualizado: ${SHARED_DEP_NAME} ${currentRef} → ${expectedRef} em packages/cli/package.json`);
process.exit(0);
