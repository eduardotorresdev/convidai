# Não existe mais Convidado sem nome: quem responde se apresenta

Responder pelo Link Aberto passou a exigir o nome — os botões de Resposta só destravam depois que a
pessoa escreve como se chama. O Convidado Anônimo deixou de ser criado.

Não é um fluxo novo. Quem se nomeia ali vira um Convidado igual ao que o Anfitrião cria no
**Convidar**: nome, token próprio e Link Pessoal. A diferença é só a procedência do nome. O token
volta para o navegador como **Vínculo** (um cookie por Convite), que faz o papel do Link Pessoal que
ninguém mandou: reabrir o Link Aberto no mesmo navegador chega ao Convite já identificado, e mudar a
resposta atualiza a mesma linha em vez de criar outra.

Nomes não são verificados. Podem vir repetidos, abreviados ou inventados, e o popover do botão
**Compartilhar** diz isso ao Anfitrião com todas as letras: garantia de quem respondeu o quê continua
sendo coisa do Link Pessoal enviado por ele.

## Consequências

**Quem abre o Link Aberto e não responde não aparece no Relatório.** Antes, a Abertura pelo Link
Aberto criava na hora uma linha anônima só para registrar que alguém tinha visto — era de lá que
saíam os "Anônimo 1 — Viu, não respondeu". Como o Convidado agora nasce na Resposta, já com nome, não
há a quem pendurar essa Abertura. O Anfitrião perde a noção de quantos espiaram sem responder pelo
link aberto; continua tendo Abertura de todo mundo que ele mesmo convidou. Quem for mexer nisso vai
achar que o contador quebrou. Não quebrou.

O índice parcial `uniq_anonimo_por_visitante` foi removido: ele existia para dar um Anônimo por
Visitante por Convite, e não há mais Anônimo. A defesa contra resposta dupla passou do banco para o
Vínculo no dispositivo — mais frágil de propósito, e coerente com a [ADR 0001](./0001-reivindicacao-na-primeira-resposta.md),
que já aceitava a mesma pessoa contar duas vezes ao trocar de navegador.

Linhas antigas com `nome` nulo continuam no banco, sem backfill, e o Relatório segue mostrando
"Anônimo N" para elas. `ehAnonimo`/`nomeExibido` em `src/lib/estado.ts` existem só por causa delas.
