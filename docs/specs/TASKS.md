# Tarefas — Issue #3: CI não está trigando automaticamente

## 1. Gerenciamento de Versão (release-please)

- [x] 1.1 Adicionar entrada `"packages/web": { "component": "@tarcisiojunior/web" }` ao objeto `packages` em `release-please-config.json`
- [x] 1.2 Adicionar `"packages/web": "0.3.0"` ao `.release-please-manifest.json` para registrar a versão atual do pacote web

## 2. Deploy Automático na Vercel

- [x] 2.1 Adicionar job `deploy` ao `.github/workflows/ci.yml` com `needs: quality` e condicional `if: github.event_name == 'push'` para garantir que o deploy ocorra apenas em push (não em PRs) e somente após CI verde
- [x] 2.2 Configurar `concurrency` no job `deploy` com `group: deploy-vercel-${{ github.ref }}` e `cancel-in-progress: false` para evitar deploys paralelos conflitantes (RNF-02)
- [x] 2.3 Configurar `environment: production` com `url: ${{ steps.deploy.outputs.url }}` no job `deploy` para visibilidade do link de deploy no GitHub Actions (RF-04)
- [x] 2.4 Implementar step de deploy usando `npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}` com `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` referenciados via `secrets.*` (nunca hardcoded)

## 3. Validação

- [x] 3.1 Verificar que nenhum arquivo versionado contém valores reais dos tokens Vercel — apenas referências a `secrets.*`
- [x] 3.2 Confirmar consistência entre `release-please-config.json` e `.release-please-manifest.json` para `packages/web` (versão `0.3.0` em ambos)
