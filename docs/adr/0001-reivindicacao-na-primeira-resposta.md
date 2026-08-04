# Reivindicação acontece na primeira Resposta, e nunca se desfaz

Um Link Pessoal identifica um Convidado Nomeado, mas nada impede que ele seja repassado no grupo da
família. Decidimos que o primeiro Visitante a **responder** por aquele link toma posse do Convidado
em definitivo; quem responder depois pelo mesmo link escreve o próprio nome e vira um Convidado
próprio. A Reivindicação é disparada pela Resposta e não pela Abertura, porque abrir o convite é algo
que várias pessoas fazem casualmente — responder é o ato que a pessoa assume como seu.

## Consequências

Um Visitante é um navegador, não uma pessoa. O WhatsApp abre links num WebView com cookie jar
próprio, então quem responde pelo WhatsApp e depois reabre o link no Safari não leva junto nem o id
de Visitante nem o Vínculo: responde de novo, como Convidado novo, e conta duas vezes no Relatório.
**Isso é conhecido e aceito**, e foi decidido sem válvula de escape: rejeitamos tanto o "Anfitrião
pode liberar o slot" quanto a "janela de tempo pra re-reivindicar" — o primeiro por não valer a
superfície de UI num app deste tamanho, a segunda por ser heurística com comportamento imprevisível
pro Anfitrião.

O efeito visível é o mesmo nome aparecendo duas vezes na lista, com respostas que podem até divergir.
Quem for mexer nisso vai achar que é bug. Não é — e como o nome agora é escrito pela própria pessoa
(ver [ADR 0003](./0003-fim-do-convidado-anonimo.md)), homônimos de verdade também existem. O Anfitrião
remove pela lista quando quiser.

Como um Visitante pode Reivindicar mais de um Convidado no mesmo Convite (o celular da casa abre o
link da mãe e o do pai), não há restrição de unicidade por Visitante — nem parcial. O que impede a
resposta dupla no caso comum é o Vínculo guardado no próprio dispositivo, não o banco.

Quando um Visitante que ainda tinha um Convidado Anônimo antigo Reivindica um Convidado Nomeado, a
linha anônima é apagada: é a mesma pessoa, e contá-la duas vezes seria pior que perder o registro da
visita. Isso só alcança linhas anteriores à ADR 0003 — um Convidado com nome nunca é apagado por
baixo do pano.
