import { getTranslations, setRequestLocale } from 'next-intl/server';

/** Definicao de cada endpoint da API para a documentacao */
interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  auth: 'none' | 'bearer' | 'token';
  params?: Array<{ name: string; type: string; description: string; required: boolean }>;
  response?: string;
}

/** Cores por metodo HTTP */
const METHOD_COLORS: Record<string, string> = {
  GET: '#00ff88',
  POST: '#00d4ff',
  PATCH: '#ff8800',
  DELETE: '#ff2d95',
};

export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('Docs');

  /* Definicao dos endpoints da API organizados por grupo */
  const apiGroups: Array<{ title: string; description: string; endpoints: ApiEndpoint[] }> = [
    {
      title: t('authTitle'),
      description: t('authDesc'),
      endpoints: [
        {
          method: 'POST',
          path: '/api/v1/auth/cli-token',
          description: t('authCliToken'),
          auth: 'bearer',
          params: [
            { name: 'name', type: 'string', description: t('authTokenName'), required: true },
          ],
          response: '{ "token": "aitk_xxx...", "id": "uuid" }',
        },
        {
          method: 'GET',
          path: '/api/v1/auth/verify',
          description: t('authVerify'),
          auth: 'token',
          response: '{ "valid": true, "user_id": "uuid" }',
        },
      ],
    },
    {
      title: t('artifactsTitle'),
      description: t('artifactsDesc'),
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/artifacts',
          description: t('artifactsList'),
          auth: 'none',
          params: [
            { name: 'page', type: 'number', description: t('paramPage'), required: false },
            { name: 'limit', type: 'number', description: t('paramLimit'), required: false },
            { name: 'type', type: 'string', description: t('paramType'), required: false },
          ],
          response: '{ "data": [Artifact], "total": number, "page": number }',
        },
        {
          method: 'GET',
          path: '/api/v1/artifacts/search',
          description: t('artifactsSearch'),
          auth: 'none',
          params: [
            { name: 'q', type: 'string', description: t('paramQuery'), required: true },
            { name: 'type', type: 'string', description: t('paramType'), required: false },
            { name: 'tool', type: 'string', description: t('paramTool'), required: false },
          ],
          response: '{ "data": [Artifact], "total": number }',
        },
        {
          method: 'POST',
          path: '/api/v1/artifacts',
          description: t('artifactsCreate'),
          auth: 'bearer',
          params: [
            { name: 'name', type: 'string', description: t('paramName'), required: true },
            { name: 'type', type: 'string', description: t('paramArtifactType'), required: true },
            { name: 'description', type: 'string', description: t('paramDescription'), required: true },
            { name: 'visibility', type: 'string', description: t('paramVisibility'), required: false },
            { name: 'keywords', type: 'string[]', description: t('paramKeywords'), required: false },
            { name: 'tool_targets', type: 'string[]', description: t('paramToolTargets'), required: false },
          ],
          response: '{ "data": Artifact }',
        },
        {
          method: 'GET',
          path: '/api/v1/artifacts/:scope/:name',
          description: t('artifactsGet'),
          auth: 'none',
          response: '{ "data": Artifact }',
        },
      ],
    },
    {
      title: t('versionsTitle'),
      description: t('versionsDesc'),
      endpoints: [
        {
          method: 'POST',
          path: '/api/v1/artifacts/:scope/:name/versions',
          description: t('versionsPublish'),
          auth: 'bearer',
          params: [
            { name: 'version', type: 'string', description: t('paramVersion'), required: true },
            { name: 'tarball', type: 'File', description: t('paramTarball'), required: true },
            { name: 'changelog', type: 'string', description: t('paramChangelog'), required: false },
          ],
          response: '{ "data": ArtifactVersion }',
        },
        {
          method: 'GET',
          path: '/api/v1/artifacts/:scope/:name/versions/:version/download',
          description: t('versionsDownload'),
          auth: 'none',
          response: 'application/gzip (tarball)',
        },
        {
          method: 'GET',
          path: '/api/v1/artifacts/:scope/:name/stats',
          description: t('versionsStats'),
          auth: 'none',
          response: '{ "total_downloads": number, "weekly": [...] }',
        },
      ],
    },
    {
      title: t('teamsTitle'),
      description: t('teamsDesc'),
      endpoints: [
        {
          method: 'GET',
          path: '/api/v1/teams',
          description: t('teamsList'),
          auth: 'bearer',
          response: '{ "data": [Team] }',
        },
        {
          method: 'POST',
          path: '/api/v1/teams',
          description: t('teamsCreate'),
          auth: 'bearer',
          params: [
            { name: 'slug', type: 'string', description: t('paramSlug'), required: true },
            { name: 'name', type: 'string', description: t('paramTeamName'), required: true },
            { name: 'description', type: 'string', description: t('paramDescription'), required: false },
          ],
          response: '{ "data": Team }',
        },
        {
          method: 'GET',
          path: '/api/v1/teams/:slug',
          description: t('teamsGet'),
          auth: 'bearer',
          response: '{ "data": Team }',
        },
        {
          method: 'POST',
          path: '/api/v1/teams/:slug/members',
          description: t('teamsAddMember'),
          auth: 'bearer',
          params: [
            { name: 'username', type: 'string', description: t('paramUsername'), required: true },
            { name: 'role', type: 'string', description: t('paramRole'), required: false },
          ],
          response: '{ "data": TeamMember }',
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Cabecalho da documentacao */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold">
          <span className="text-[#00d4ff]">&gt;</span> {t('title')}
        </h2>
        <p className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#94a3b8]">
          {t('subtitle')}
        </p>
      </div>

      {/* Secao de autenticacao */}
      <div className="mb-10 glass rounded-2xl p-6">
        <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#e2e8f0]">
          {t('authSectionTitle')}
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-[#94a3b8]">
          {t('authSectionDesc')}
        </p>
        <div className="space-y-3">
          {/* Exemplo Bearer Token */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('bearerExample')}
            </div>
            <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              Authorization: Bearer &lt;supabase-jwt&gt;
            </div>
          </div>
          {/* Exemplo API Token */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
              {t('tokenExample')}
            </div>
            <div className="mt-2 font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              X-API-Token: aitk_xxxxxxxxxxxxxxxx
            </div>
          </div>
        </div>
      </div>

      {/* URL base */}
      <div className="mb-10 glass rounded-2xl p-6">
        <h3 className="mb-3 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#e2e8f0]">
          Base URL
        </h3>
        <div className="terminal-window">
          <div className="terminal-header">
            <div className="terminal-dot terminal-dot-red" />
            <div className="terminal-dot terminal-dot-yellow" />
            <div className="terminal-dot terminal-dot-green" />
            <span className="terminal-title">api</span>
          </div>
          <div className="terminal-body">
            <span className="terminal-arg">https://aitk.dev/api/v1</span>
          </div>
        </div>
      </div>

      {/* Grupos de endpoints */}
      <div className="space-y-10">
        {apiGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-[#e2e8f0]">
              {group.title}
            </h3>
            <p className="mb-6 text-sm text-[#94a3b8]">{group.description}</p>

            <div className="space-y-4">
              {group.endpoints.map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="glass rounded-2xl overflow-hidden"
                >
                  {/* Header do endpoint: metodo + path */}
                  <div className="flex items-center gap-3 border-b border-white/[0.06] px-6 py-4">
                    <span
                      className="rounded px-2.5 py-1 font-[family-name:var(--font-jetbrains)] text-xs font-bold"
                      style={{
                        color: METHOD_COLORS[endpoint.method],
                        backgroundColor: `${METHOD_COLORS[endpoint.method]}15`,
                        border: `1px solid ${METHOD_COLORS[endpoint.method]}30`,
                      }}
                    >
                      {endpoint.method}
                    </span>
                    <code className="font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
                      {endpoint.path}
                    </code>
                    {/* Badge de autenticacao */}
                    {endpoint.auth !== 'none' && (
                      <span className="ml-auto rounded-full border border-[#ff8800]/20 bg-[#ff8800]/10 px-2 py-0.5 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff8800]">
                        {endpoint.auth === 'bearer' ? 'JWT' : 'API Token'}
                      </span>
                    )}
                  </div>

                  {/* Corpo do endpoint: descricao + parametros + resposta */}
                  <div className="px-6 py-4">
                    <p className="text-sm text-[#94a3b8]">{endpoint.description}</p>

                    {/* Tabela de parametros */}
                    {endpoint.params && endpoint.params.length > 0 && (
                      <div className="mt-4">
                        <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
                          {t('parameters')}
                        </div>
                        <div className="space-y-1.5">
                          {endpoint.params.map((param) => (
                            <div
                              key={param.name}
                              className="flex items-baseline gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-sm"
                            >
                              <code className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">
                                {param.name}
                              </code>
                              <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                                {param.type}
                              </span>
                              {param.required && (
                                <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff2d95]">
                                  {t('required')}
                                </span>
                              )}
                              <span className="text-[#94a3b8]">{param.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Formato da resposta */}
                    {endpoint.response && (
                      <div className="mt-4">
                        <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
                          {t('response')}
                        </div>
                        <code className="block rounded-lg bg-white/[0.02] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-[#00ff88]">
                          {endpoint.response}
                        </code>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Secao CLI - referencia rapida */}
      <div className="mt-16 glass rounded-2xl p-6">
        <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-[#e2e8f0]">
          {t('cliTitle')}
        </h3>
        <p className="mb-6 text-sm text-[#94a3b8]">
          {t('cliDesc')}
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Comandos do CLI organizados */}
          {[
            { cmd: 'aitk login', desc: t('cliLogin') },
            { cmd: 'aitk search "query"', desc: t('cliSearch') },
            { cmd: 'aitk install scope/name', desc: t('cliInstall') },
            { cmd: 'aitk publish', desc: t('cliPublish') },
            { cmd: 'aitk init', desc: t('cliInit') },
            { cmd: 'aitk list', desc: t('cliList') },
            { cmd: 'aitk update', desc: t('cliUpdate') },
            { cmd: 'aitk team create slug', desc: t('cliTeam') },
          ].map((item) => (
            <div
              key={item.cmd}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3"
            >
              <code className="font-[family-name:var(--font-jetbrains)] text-sm text-[#00d4ff]">
                $ {item.cmd}
              </code>
              <p className="mt-1 text-xs text-[#64748b]">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Instalacao do CLI */}
        <div className="mt-6">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
            {t('cliInstallTitle')}
          </div>
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot terminal-dot-red" />
              <div className="terminal-dot terminal-dot-yellow" />
              <div className="terminal-dot terminal-dot-green" />
              <span className="terminal-title">terminal</span>
            </div>
            <div className="terminal-body">
              <div>
                <span className="terminal-prompt">$ </span>
                <span className="terminal-command">npx</span>{' '}
                <span className="terminal-arg">@ai-toolkit/cli</span>{' '}
                <span className="terminal-flag">login</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secao de autocompletion */}
      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-lg font-semibold text-[#e2e8f0]">
          {t('completionsTitle')}
        </h3>
        <div className="space-y-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">Bash</div>
            <code className="mt-1 block font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              eval &quot;$(aitk completions bash)&quot;
            </code>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">Zsh</div>
            <code className="mt-1 block font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              eval &quot;$(aitk completions zsh)&quot;
            </code>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">Fish</div>
            <code className="mt-1 block font-[family-name:var(--font-jetbrains)] text-sm text-[#e2e8f0]">
              aitk completions fish | source
            </code>
          </div>
        </div>
      </div>

      {/* Secao de CI/CD — GitHub Action */}
      <div className="mt-8 glass rounded-2xl p-6">
        <h3 className="mb-4 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-[#e2e8f0]">
          {t('cicdTitle')}
        </h3>
        <p className="mb-6 text-sm text-[#94a3b8]">
          {t('cicdDesc')}
        </p>

        {/* Passos de configuracao */}
        <div className="mb-6">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-3">
            {t('cicdSetup')}
          </div>
          <ol className="space-y-2 text-sm text-[#94a3b8]">
            <li className="flex gap-2">
              <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">1.</span>
              {t('cicdStep1')}
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">2.</span>
              {t('cicdStep2')}
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">3.</span>
              {t('cicdStep3')}
            </li>
            <li className="flex gap-2">
              <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">4.</span>
              {t('cicdStep4')}
            </li>
          </ol>
        </div>

        {/* Exemplo de workflow */}
        <div className="mb-6">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
            {t('cicdUsage')}
          </div>
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dot terminal-dot-red" />
              <div className="terminal-dot terminal-dot-yellow" />
              <div className="terminal-dot terminal-dot-green" />
              <span className="terminal-title">.github/workflows/aitk-publish.yml</span>
            </div>
            <div className="terminal-body text-xs leading-relaxed">
              <div className="text-[#64748b]">{'# .github/workflows/aitk-publish.yml'}</div>
              <div><span className="text-[#ff8800]">name</span>: Publish to ai-toolkit</div>
              <div><span className="text-[#ff8800]">on</span>:</div>
              <div>{'  '}<span className="text-[#ff8800]">release</span>:</div>
              <div>{'    '}<span className="text-[#ff8800]">types</span>: [published]</div>
              <div><span className="text-[#ff8800]">jobs</span>:</div>
              <div>{'  '}<span className="text-[#ff8800]">publish</span>:</div>
              <div>{'    '}<span className="text-[#ff8800]">runs-on</span>: ubuntu-latest</div>
              <div>{'    '}<span className="text-[#ff8800]">steps</span>:</div>
              <div>{'      '}- <span className="text-[#ff8800]">uses</span>: actions/checkout@v4</div>
              <div>{'      '}- <span className="text-[#ff8800]">uses</span>: <span className="text-[#00ff88]">tarcisiojr/ai-toolkit/.github/actions/aitk-publish@main</span></div>
              <div>{'        '}<span className="text-[#ff8800]">with</span>:</div>
              <div>{'          '}<span className="text-[#ff8800]">api-token</span>: {'${{ secrets.AITK_API_TOKEN }}'}</div>
              <div>{'          '}<span className="text-[#ff8800]">directory</span>: &apos;.&apos;</div>
            </div>
          </div>
        </div>

        {/* Inputs da action */}
        <div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
            Inputs
          </div>
          <div className="space-y-1.5">
            {[
              { name: 'api-token', type: 'string', desc: t('cicdInputToken'), req: true },
              { name: 'directory', type: 'string', desc: t('cicdInputDir'), req: false },
              { name: 'access', type: 'string', desc: t('cicdInputAccess'), req: false },
              { name: 'team', type: 'string', desc: t('cicdInputTeam'), req: false },
              { name: 'registry-url', type: 'string', desc: t('cicdInputRegistry'), req: false },
            ].map((input) => (
              <div
                key={input.name}
                className="flex items-baseline gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-sm"
              >
                <code className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">
                  {input.name}
                </code>
                <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                  {input.type}
                </span>
                {input.req && (
                  <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[10px] text-[#ff2d95]">
                    {t('required')}
                  </span>
                )}
                <span className="text-[#94a3b8]">{input.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Output da action */}
        <div className="mt-4">
          <div className="font-[family-name:var(--font-jetbrains)] text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
            Outputs
          </div>
          <div className="rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
            <div className="flex items-baseline gap-3">
              <code className="shrink-0 font-[family-name:var(--font-jetbrains)] text-[#00d4ff]">
                artifact-slug
              </code>
              <span className="shrink-0 font-[family-name:var(--font-jetbrains)] text-xs text-[#64748b]">
                string
              </span>
              <span className="text-[#94a3b8]">{t('cicdOutputSlug')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
