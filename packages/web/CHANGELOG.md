# Changelog

## [0.3.5](https://github.com/tarcisiojr/ai-toolkit/compare/@tarcisiojunior/web-v0.3.4...@tarcisiojunior/web-v0.3.5) (2026-03-13)


### Correções

* **deps:** atualizar referência do shared para 0.2.3 em cli e web ([d7940b4](https://github.com/tarcisiojr/ai-toolkit/commit/d7940b440531a18ba759b0c14706dd5f83841020))

## [0.3.4](https://github.com/tarcisiojr/ai-toolkit/compare/@tarcisiojunior/web-v0.3.3...@tarcisiojunior/web-v0.3.4) (2026-03-12)


### Correções

* **login:** propagar host real de escuta do CLI ao web app via parâmetro host ([4d04018](https://github.com/tarcisiojr/ai-toolkit/commit/4d04018851c72265e719893f56a53eb3b5773850))
* **login:** propagar host real de escuta do CLI ao web app via parâmetro host ([b20647b](https://github.com/tarcisiojr/ai-toolkit/commit/b20647b582194be3b1af22e00decc6b580f94d0a)), closes [#17](https://github.com/tarcisiojr/ai-toolkit/issues/17)

## [0.3.3](https://github.com/tarcisiojr/ai-toolkit/compare/@tarcisiojunior/web-v0.3.2...@tarcisiojunior/web-v0.3.3) (2026-03-12)


### Correções

* **auth:** detect existing session in cli-callback to prevent login timeout ([eb91fb4](https://github.com/tarcisiojr/ai-toolkit/commit/eb91fb405f672261afbbcf50b21d13a6e7af61fa))

## [0.3.2](https://github.com/tarcisiojr/ai-toolkit/compare/@tarcisiojunior/web-v0.3.1...@tarcisiojunior/web-v0.3.2) (2026-03-12)


### Correções

* **deps:** sync @tarcisiojunior/shared to 0.2.2 and regenerate lock file ([5d01238](https://github.com/tarcisiojr/ai-toolkit/commit/5d0123824d2dafef1884b81ca3644c621fff6f2e))
* **deps:** sync @tarcisiojunior/shared to 0.2.2 and regenerate lock file ([3d2e081](https://github.com/tarcisiojr/ai-toolkit/commit/3d2e0819017fdddccbe87a42691757034a4c8711))

## [0.3.1](https://github.com/tarcisiojr/ai-toolkit/compare/@tarcisiojunior/web-v0.3.0...@tarcisiojunior/web-v0.3.1) (2026-03-12)


### Funcionalidades

* bootstrap do monorepo ai-toolkit ([a175047](https://github.com/tarcisiojr/ai-toolkit/commit/a17504745e8ae9212f09541805a0e1ba67ba63d3))
* CI/CD, shell completions, docs API, explore melhorado, download stats ([f89161c](https://github.com/tarcisiojr/ai-toolkit/commit/f89161c96359b7c9dd17881f58a741a5b1cf67b5))
* CLI funcional com login, publish e install + correção RLS ([0d3b2f4](https://github.com/tarcisiojr/ai-toolkit/commit/0d3b2f4c18b6dc68e9767cc2346a3ea20c110a96))
* Fase 2 - CLI avançado, testes, dashboard melhorado ([069a9a8](https://github.com/tarcisiojr/ai-toolkit/commit/069a9a8f4c219c75f3b11f69e7863bf108ab7079))
* Fase 3 - aitk init, TemplateInstaller, páginas públicas, middleware auth ([0cfab02](https://github.com/tarcisiojr/ai-toolkit/commit/0cfab0292d3ac2db1c0b84d21f259bb5fdf7242e))
* GitHub Action para publicação automatizada de artefatos ([57efae8](https://github.com/tarcisiojr/ai-toolkit/commit/57efae882e6d20ae9e0cb4b4cf5d2a10539dc039))
* migrações SQL e endpoints da API REST ([d8f1c59](https://github.com/tarcisiojr/ai-toolkit/commit/d8f1c59c9b1b8483c4530210dfadf942517ae2d6))
* páginas web (login, dashboard, detalhe) + installers MCP/Config/Hook ([ef09654](https://github.com/tarcisiojr/ai-toolkit/commit/ef0965406176393e8b923c66fd4560c7e799aed0))
* publicação npm + correção auth callback OAuth ([259ffc0](https://github.com/tarcisiojr/ai-toolkit/commit/259ffc0260046ada794767fd72bfb8e01d511043))
* Teams CRUD, download stats, CLI sync/config + páginas web de equipes ([6878e3c](https://github.com/tarcisiojr/ai-toolkit/commit/6878e3ca1828e08904de6f2db98269b487dd2011))
* trending endpoint, explore com discovery, testes completions ([91096e8](https://github.com/tarcisiojr/ai-toolkit/commit/91096e853283db559cdb014857b470ef398768bd))
* **web:** adicionar endpoint GET /api/auth/cli-callback para fluxo OAuth do CLI ([a1ff0e2](https://github.com/tarcisiojr/ai-toolkit/commit/a1ff0e22c92171df42f42845c2d2521b24b57977)), closes [#1](https://github.com/tarcisiojr/ai-toolkit/issues/1)
* **web:** detectar fluxo CLI no callback OAuth e redirecionar token para localhost ([3ebaaf7](https://github.com/tarcisiojr/ai-toolkit/commit/3ebaaf730b5948f989b0bfaea7e789f8e74f7353)), closes [#1](https://github.com/tarcisiojr/ai-toolkit/issues/1)
* **web:** editor de artefatos no portal com file browser e CodeMirror ([edc0126](https://github.com/tarcisiojr/ai-toolkit/commit/edc01269d23c81d6e8ede81d2f7a1832c724c8ba))


### Correções

* **cli:** corrigir erro de login via CLI (issue [#1](https://github.com/tarcisiojr/ai-toolkit/issues/1)) ([7baa0b0](https://github.com/tarcisiojr/ai-toolkit/commit/7baa0b07f67793aa04f381b8fb5f605b9c4d955b))
* corrigir fluxo OAuth — usar cookie para next path e interceptar fallback ([3845f1e](https://github.com/tarcisiojr/ai-toolkit/commit/3845f1eb86b0a35182b74b9fa6b6d3721103ac5f))
* corrigir header autenticado e search_path do trigger handle_new_user ([9457096](https://github.com/tarcisiojr/ai-toolkit/commit/9457096d860bc3d699901cff194f586786533cbd))
* corrigir referências npx aitk, URL do registry e versão do health endpoint ([3fcd827](https://github.com/tarcisiojr/ai-toolkit/commit/3fcd827ef6cf33297efbb120ddceeb729e514d9e))
* garantir lockfile no repo e referência explícita ao shared ([44d7c23](https://github.com/tarcisiojr/ai-toolkit/commit/44d7c237c7da2fa305915a728bc201f3728186a8))
* **web:** adicionar @parcel/watcher e --include=optional no Vercel ([828405f](https://github.com/tarcisiojr/ai-toolkit/commit/828405f61a1f7964092cf596a7372b41cd1dd70b))
* **web:** atualizar badge de versão para v0.3.0 nas traduções ([aa9abe1](https://github.com/tarcisiojr/ai-toolkit/commit/aa9abe11fff91f5527ce37bc5bc0217fbf2fe145))
* **web:** conectar VersionBumpModal ao botão Nova Versão ([0aa180f](https://github.com/tarcisiojr/ai-toolkit/commit/0aa180fe7581d9580a5e54d652a531780ceeae58))
* **web:** converter next.config.ts para .mjs para corrigir build no Vercel ([c7292cd](https://github.com/tarcisiojr/ai-toolkit/commit/c7292cd401151f61073382a53333e2a4831b3e77))
* **web:** corrigir redirecionamento após publicar artefato ([81e48bf](https://github.com/tarcisiojr/ai-toolkit/commit/81e48bf7456dd0eae1acee7524ac14a71859c3a9))
* **web:** ler versão do package.json automaticamente no build ([4cbac23](https://github.com/tarcisiojr/ai-toolkit/commit/4cbac233796e4faf694ff1f6d42de727ccc4c58a))
* **web:** pinar Next.js e eslint-config-next em 15.2.4 ([3a1bcf0](https://github.com/tarcisiojr/ai-toolkit/commit/3a1bcf0055f8716f3f9e8e7fc5979dced4383e6b))
* **web:** usar createRequire para ler package.json no next.config ([5b9fc80](https://github.com/tarcisiojr/ai-toolkit/commit/5b9fc80776b2ddbe3ea95f7b3b6e54719a13fb2b))


### Refatoração

* **web:** extrair lógica de geração de CLI token para função reutilizável ([a074e9a](https://github.com/tarcisiojr/ai-toolkit/commit/a074e9aa65744edb482d5a245f6078171c6fdf47)), closes [#1](https://github.com/tarcisiojr/ai-toolkit/issues/1)
