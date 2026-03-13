# Changelog

## [0.2.8](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.7...aitk-cli-v0.2.8) (2026-03-13)


### Correções

* **deps:** atualizar referência do shared para 0.2.3 em cli e web ([d7940b4](https://github.com/tarcisiojr/ai-toolkit/commit/d7940b440531a18ba759b0c14706dd5f83841020))

## [0.2.7](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.6...aitk-cli-v0.2.7) (2026-03-13)


### Funcionalidades

* **cli:** adicionar fontes Git e comando create ([521e259](https://github.com/tarcisiojr/ai-toolkit/commit/521e259e165abdc362283db985a9bfc320cd33e9))

## [0.2.6](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.5...aitk-cli-v0.2.6) (2026-03-13)


### Correções

* **cli:** parar spinner antes de exibir erro no publish e install ([8929c76](https://github.com/tarcisiojr/ai-toolkit/commit/8929c7680c0e5c98f72ef07228cfc1f4102c9d8f))

## [0.2.5](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.4...aitk-cli-v0.2.5) (2026-03-13)


### Correções

* **cli:** corrigir install falhando quando latest_version é null no registro ([e95c3b8](https://github.com/tarcisiojr/ai-toolkit/commit/e95c3b8130e0e6f883ac3fff2a13e5fd49e2254d))

## [0.2.4](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.3...aitk-cli-v0.2.4) (2026-03-12)


### Correções

* **login:** propagar host real de escuta do CLI ao web app via parâmetro host ([4d04018](https://github.com/tarcisiojr/ai-toolkit/commit/4d04018851c72265e719893f56a53eb3b5773850))
* **login:** propagar host real de escuta do CLI ao web app via parâmetro host ([b20647b](https://github.com/tarcisiojr/ai-toolkit/commit/b20647b582194be3b1af22e00decc6b580f94d0a)), closes [#17](https://github.com/tarcisiojr/ai-toolkit/issues/17)

## [0.2.3](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.2...aitk-cli-v0.2.3) (2026-03-12)


### Correções

* **deps:** sync @tarcisiojunior/shared to 0.2.2 and regenerate lock file ([5d01238](https://github.com/tarcisiojr/ai-toolkit/commit/5d0123824d2dafef1884b81ca3644c621fff6f2e))

## [0.2.2](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.1...aitk-cli-v0.2.2) (2026-03-12)


### Correções

* **cli:** corrigir erro de autenticação OAuth no CLI (Issue [#6](https://github.com/tarcisiojr/ai-toolkit/issues/6)) ([5c727f5](https://github.com/tarcisiojr/ai-toolkit/commit/5c727f5ebe1db1d44ba8c7a9dec314ad94be8edd))
* **cli:** usar dual-stack IPv4+IPv6 no servidor OAuth com fallback IPv4 ([e4c637b](https://github.com/tarcisiojr/ai-toolkit/commit/e4c637b823e01e9d51c0a2d28bc4dc9d69217d9b)), closes [#6](https://github.com/tarcisiojr/ai-toolkit/issues/6)

## [0.2.1](https://github.com/tarcisiojr/ai-toolkit/compare/aitk-cli-v0.2.0...aitk-cli-v0.2.1) (2026-03-12)


### Funcionalidades

* bootstrap do monorepo ai-toolkit ([a175047](https://github.com/tarcisiojr/ai-toolkit/commit/a17504745e8ae9212f09541805a0e1ba67ba63d3))
* CI/CD, shell completions, docs API, explore melhorado, download stats ([f89161c](https://github.com/tarcisiojr/ai-toolkit/commit/f89161c96359b7c9dd17881f58a741a5b1cf67b5))
* CLI funcional com login, publish e install + correção RLS ([0d3b2f4](https://github.com/tarcisiojr/ai-toolkit/commit/0d3b2f4c18b6dc68e9767cc2346a3ea20c110a96))
* Fase 2 - CLI avançado, testes, dashboard melhorado ([069a9a8](https://github.com/tarcisiojr/ai-toolkit/commit/069a9a8f4c219c75f3b11f69e7863bf108ab7079))
* Fase 3 - aitk init, TemplateInstaller, páginas públicas, middleware auth ([0cfab02](https://github.com/tarcisiojr/ai-toolkit/commit/0cfab0292d3ac2db1c0b84d21f259bb5fdf7242e))
* GitHub Action para publicação automatizada de artefatos ([57efae8](https://github.com/tarcisiojr/ai-toolkit/commit/57efae882e6d20ae9e0cb4b4cf5d2a10539dc039))
* páginas web (login, dashboard, detalhe) + installers MCP/Config/Hook ([ef09654](https://github.com/tarcisiojr/ai-toolkit/commit/ef0965406176393e8b923c66fd4560c7e799aed0))
* publicação npm + correção auth callback OAuth ([259ffc0](https://github.com/tarcisiojr/ai-toolkit/commit/259ffc0260046ada794767fd72bfb8e01d511043))
* Teams CRUD, download stats, CLI sync/config + páginas web de equipes ([6878e3c](https://github.com/tarcisiojr/ai-toolkit/commit/6878e3ca1828e08904de6f2db98269b487dd2011))
* trending endpoint, explore com discovery, testes completions ([91096e8](https://github.com/tarcisiojr/ai-toolkit/commit/91096e853283db559cdb014857b470ef398768bd))


### Correções

* **cli:** corrigir erro de login via CLI (issue [#1](https://github.com/tarcisiojr/ai-toolkit/issues/1)) ([7baa0b0](https://github.com/tarcisiojr/ai-toolkit/commit/7baa0b07f67793aa04f381b8fb5f605b9c4d955b))
* **cli:** corrigir fluxo OAuth usando web app como intermediário para evitar 404 ([af2c918](https://github.com/tarcisiojr/ai-toolkit/commit/af2c918cd72e5a674da9e47a6332a156feeed210)), closes [#1](https://github.com/tarcisiojr/ai-toolkit/issues/1)
* **cli:** ler versão do package.json em vez de hardcode ([d2069a6](https://github.com/tarcisiojr/ai-toolkit/commit/d2069a64f0edf76ff465864f57b1c14aaee979cf))
* corrigir referências npx aitk, URL do registry e versão do health endpoint ([3fcd827](https://github.com/tarcisiojr/ai-toolkit/commit/3fcd827ef6cf33297efbb120ddceeb729e514d9e))
* fixar Node 20.x para Vercel e bumpar CLI para 0.2.1 ([f40a321](https://github.com/tarcisiojr/ai-toolkit/commit/f40a321804c2cbfdf8d1d8e63dc70650f857121b))
