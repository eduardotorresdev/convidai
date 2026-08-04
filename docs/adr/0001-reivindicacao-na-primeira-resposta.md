# Reivindicação acontece na primeira Resposta, e nunca se desfaz

Um Link Pessoal identifica um Convidado Nomeado, mas nada impede que ele seja repassado no grupo da
família. Decidimos que o primeiro Visitante a **responder** por aquele link toma posse do Convidado
em definitivo; quem responder depois pelo mesmo link vira Convidado Anônimo. A Reivindicação é
disparada pela Resposta e não pela Abertura, porque abrir o convite é algo que várias pessoas fazem
casualmente — responder é o ato que a pessoa assume como seu.

## Consequências

Um Visitante é um navegador, não uma pessoa. O WhatsApp abre links num WebView com cookie jar
próprio, então quem responde pelo WhatsApp e depois reabre o link no Safari vira Anônimo na segunda
vez, contando duas vezes no Relatório. **Isso é conhecido e aceito**, e foi decidido sem válvula de
escape: rejeitamos tanto o "Anfitrião pode liberar o slot" quanto a "janela de tempo pra
re-reivindicar" — o primeiro por não valer a superfície de UI num app deste tamanho, a segunda por
ser heurística com comportamento imprevisível pro Anfitrião.

O efeito visível é Anônimos aparecendo no Relatório sem explicação aparente. Quem for mexer nisso vai
achar que é bug. Não é.

Como um Visitante pode Reivindicar mais de um Convidado no mesmo Convite (o celular da casa abre o
link da mãe e o do pai), a unicidade por Visitante vale **só** para Convidados Anônimos — é um índice
parcial, não uma restrição geral. E quando um Visitante que já tinha um Convidado Anônimo Reivindica
um Convidado Nomeado, a linha anônima é apagada: é a mesma pessoa, e contá-la duas vezes seria pior
que perder o registro da visita.
