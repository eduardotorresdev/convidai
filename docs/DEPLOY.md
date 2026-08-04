# Deploy

Produção: <https://convites.celebre.digital> — app Dokku `convidai` em `177.93.132.42`
(`anami-prod`), a mesma máquina que hospeda `celebre.digital`, `tereco.com.br` e outros.
**Nada aqui deve mexer em nginx, certbot ou systemd na mão**: o Dokku é dono dessa configuração e
alterá-la à mão derruba os vizinhos.

## Como o deploy acontece

`push na main` → GitHub Actions → `git push` para o Dokku → build do `Dockerfile` → `predeploy`
roda as migrações → o Dokku só manda tráfego pro release novo depois que o `CHECKS` passa.

| Peça | Arquivo |
| --- | --- |
| Pipeline | `.github/workflows/deploy.yml` |
| Imagem | `Dockerfile` (Node 24; o buildpack da máquina não resolve 24) |
| Processo | `Procfile` |
| Migração pré-deploy | `app.json` → `scripts/migrar.mjs` |
| Health check | `CHECKS` |

Secrets do repositório: `DOKKU_SSH_KEY` (chave privada cuja pública está em `dokku ssh-keys:add`)
e `DOKKU_HOST`. **Os segredos da aplicação não passam pelo CI** — vivem em `dokku config`.

## Estado atual no servidor

```sh
dokku apps:create convidai
dokku builder:set convidai selected dockerfile
dokku domains:set convidai convites.celebre.digital
dokku git:set convidai deploy-branch main
dokku ports:set convidai http:80:3000
dokku nginx:set convidai client-max-body-size 12m   # sem isso o upload de 8MB morre com 413
dokku storage:ensure-directory convidai             # /var/lib/dokku/data/storage/convidai → /app/storage
dokku letsencrypt:set convidai email <email>
dokku letsencrypt:enable convidai
```

Config vars: `ORIGIN`, `DATABASE_URL=/app/storage/convidai.db`, `UPLOADS_DIR=/app/storage/uploads`,
`BODY_SIZE_LIMIT=12M`, `NODE_ENV`, `AUTH_TRUST_HOST`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
`AUTH_GOOGLE_SECRET`.

`AUTH_SECRET` assina o JWT da sessão. Trocá-lo desloga todo mundo de uma vez — é o
botão de pânico se algum cookie vazar, e não um valor pra rotacionar por hábito.

## Sessão

A sessão vive num JWT no cookie, não em linha de banco. É o que o provider
Credentials do Auth.js exige, e foi o preço de aceitar login por e-mail e senha.
Consequências que não são óbvias:

- A tabela `session` ficou ociosa. Não vale dropar: o `DrizzleAdapter` ainda a
  declara e o Auth.js reclamaria da falta.
- Não há como derrubar a sessão de alguém pelo servidor — não existe linha pra
  apagar. Só o vencimento (30 dias, o padrão do Auth.js) ou a troca do
  `AUTH_SECRET`.
- Trocar a senha em `/conta` **não** invalida as sessões abertas em outros
  dispositivos, pela mesma razão.

## Google OAuth

O `@auth/sveltekit` usa **`https://convites.celebre.digital/auth/callback/google`** — com o sufixo
do provider. A URI sem o sufixo (`/auth/callback`) faz o login falhar com `redirect_uri_mismatch`.
Para conferir o que o app realmente envia:

```sh
curl -s https://convites.celebre.digital/auth/providers | jq .google.callbackUrl
```

No Google Console, o cliente OAuth precisa de:

- Origem JavaScript autorizada: `https://convites.celebre.digital`
- URI de redirecionamento autorizado: `https://convites.celebre.digital/auth/callback/google`

## Operação

```sh
dokku logs convidai -t              # logs ao vivo
dokku ps:restart convidai           # reiniciar
dokku ps:rebuild convidai           # rebuildar do último commit recebido
dokku config:show convidai          # variáveis (mostra segredos — cuidado com a tela)
```

Rollback: `dokku ps:rebuild` reconstrói o release atual. Para voltar a um commit anterior, faça
`git revert` e push — o caminho auditável. Não existe rollback de imagem por tag configurado.

## Dados e backup

Banco SQLite e artes ficam em `/var/lib/dokku/data/storage/convidai`, num disco só, **sem réplica e
sem backup automático**. Um snapshot manual:

```sh
ssh debian@177.93.132.42 'sudo tar czf - -C /var/lib/dokku/data/storage convidai' > convidai-backup.tgz
```

Vale agendar isso num cron se o app passar a valer alguma coisa.
