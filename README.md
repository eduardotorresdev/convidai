# convidai

Convites de festa em formato de imagem, compartilhados por WhatsApp, com confirmação de presença
rastreável por pessoa.

O vocabulário do domínio está em [CONTEXT.md](./CONTEXT.md) e é usado literalmente no código —
`Convidado`, `Reivindicação`, `Abertura` e `Anfitrião` significam ali exatamente o que significam
aqui. As decisões que parecem bug e não são estão registradas em [docs/adr](./docs/adr).

## Rodando

```sh
npm install
cp .env.example .env     # preencha as credenciais do Google
npm exec -- drizzle-kit push
npm run dev
```

Para `AUTH_SECRET`, rode `npx auth secret`.

No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um ID do cliente
OAuth do tipo "aplicativo da Web" com:

- Origem autorizada: `http://localhost:5173`
- URI de redirecionamento: `http://localhost:5173/auth/callback/google`

## Rotas

| Rota | Quem acessa |
| --- | --- |
| `/` | qualquer um — landing |
| `/entrar` | qualquer um — login com Google |
| `/criar` | Anfitrião logado |
| `/visualizar` | Anfitrião logado — seus Convites |
| `/visualizar/[hash]` | só o Anfitrião daquele Convite — Relatório e edição |
| `/convites/[hash]/[slug]` | qualquer um — o Convite e o RSVP |

O `hash` é a identidade do Convite e nunca muda. O `slug` é enfeite legível: se vier errado na URL,
a página redireciona pro canônico em vez de dar 404. O parâmetro `?convidado=<token>` no endereço
público é o Link Pessoal de um Convidado Nomeado.

## Deploy

No ar em <https://convites.celebre.digital>, como app Dokku. Push na `main` publica.
Detalhes, operação e backup em [docs/DEPLOY.md](./docs/DEPLOY.md).

Precisa de **disco persistente** — banco e artes ficam no filesystem, então Vercel, Netlify e
Cloudflare não servem. Veja [ADR 0002](./docs/adr/0002-imagens-no-filesystem.md).
