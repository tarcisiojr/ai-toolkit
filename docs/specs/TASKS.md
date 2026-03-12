# Tarefas de Implementação — Issue #20: Revisão de CI

> **Referências:** [REQUIREMENTS.md](./REQUIREMENTS.md) | [DESIGN.md](./DESIGN.md)
>
> **Estratégia adotada:** Introduzir orquestração via `workflow_run` para garantir que o CI (`ci.yml`) seja o gate obrigatório antes de deploys na Vercel e criação de PRs de release. Criar `vercel-deploy.yml` para deploy automático de produção após CI aprovado. Corrigir `vercel.json` com `buildCommand` incorreto. Alterar `release-please.yml` para aguardar CI com sucesso antes de criar PRs de release.

---

## 1. Correção de Configuração Existente

- [x] 1.1 Em `vercel.json`, remover o trecho `&& echo '{"version":1,"success":false}' > packages/web/.next/export-detail.json` do campo `buildCommand`, mantendo apenas `npx turbo run build --filter=@tarcisiojunior/web` (CA-10, RF-02)

---

## 2. Atualização do Workflow release-please

- [x] 2.1 Em `.github/workflows/release-please.yml`, substituir o trigger `on: push: branches: [main]` por `on: workflow_run: workflows: ["CI"] types: [completed] branches: [main]` (RF-01, RF-04)
- [x] 2.2 Em `.github/workflows/release-please.yml`, adicionar condição `if: github.event.workflow_run.conclusion == 'success'` no job `release-please` para que só execute quando o CI aprovado (RF-01)

---

## 3. Criação do Workflow de Deploy na Vercel

- [x] 3.1 Criar `.github/workflows/vercel-deploy.yml` com trigger `workflow_run` aguardando o workflow `"CI"` completar na branch `main` (RF-02)
- [x] 3.2 Em `.github/workflows/vercel-deploy.yml`, adicionar condição `if: github.event.workflow_run.conclusion == 'success'` no job de deploy (RF-01, RF-02)
- [x] 3.3 Em `.github/workflows/vercel-deploy.yml`, configurar step de checkout usando `ref: ${{ github.event.workflow_run.head_sha }}` para garantir checkout do commit correto (evitar R-03 do DESIGN.md)
- [x] 3.4 Em `.github/workflows/vercel-deploy.yml`, configurar instalação do Vercel CLI (`npm install -g vercel`), autenticação e execução de `vercel --prod` com os secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` (RF-02)
- [x] 3.5 Em `.github/workflows/vercel-deploy.yml`, passar variáveis de ambiente de build do Next.js (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`) via secrets do repositório com fallback para placeholders (RF-02)
- [x] 3.6 Em `.github/workflows/vercel-deploy.yml`, adicionar grupo de concorrência `vercel-deploy-${{ github.ref }}` com `cancel-in-progress: false` para evitar deploys simultâneos (RNF-04)
- [x] 3.7 Em `.github/workflows/vercel-deploy.yml`, gerar sumário `$GITHUB_STEP_SUMMARY` com status do deploy e URL de produção (RNF-05)

---

## 4. Documentação de Pré-Requisitos Operacionais

- [x] 4.1 Documentar em comentários no `.github/workflows/vercel-deploy.yml` os secrets obrigatórios (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) e o pré-requisito de desabilitar auto-deploy do GitHub App da Vercel para `main` no painel da Vercel (R-02, R-04 do DESIGN.md)

---

*Documento gerado automaticamente pelo pipeline SDD — Fase 3 (Tarefas).*
*Issue: #20 | Branch: fix/issue-20 | Data: 2026-03-12*
