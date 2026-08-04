# Arte dos Convites vive no filesystem, não no banco nem num object store

As imagens 1080x1080 são gravadas como `.webp` num diretório local (`UPLOADS_DIR`) e servidas por uma
rota do próprio SvelteKit. Escolhemos isso por simplicidade deliberada, sabendo que é a decisão que
mais restringe o deploy.

## Consequências

Isto amarra o projeto a `adapter-node` com disco persistente. **Vercel, Netlify e Cloudflare Workers
estão fora** — o filesystem deles é efêmero e as imagens somem entre deploys. Trocar de host depois
significa migrar os arquivos e trocar a camada de storage.

O nome do arquivo é aleatório e não deriva do hash do Convite, de propósito: trocar a arte de um
Convite existente precisa gerar uma URL nova, senão o cache do navegador e o preview do WhatsApp
continuam servindo a imagem velha. Em troca, a rota de upload pode marcar `immutable` com validade de
um ano.
