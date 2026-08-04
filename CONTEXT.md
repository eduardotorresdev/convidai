# Convidai

Convites de festa em formato de imagem, compartilhados por WhatsApp, com
confirmação de presença rastreável por pessoa.

## Language

### O convite

**Convite**:
Uma arte quadrada, uma descrição e um prazo, publicados numa página pública que
aceita confirmações de presença.
_Avoid_: Evento, festa, invite

**Anfitrião**:
A pessoa autenticada que criou o Convite e é a única que enxerga seu Relatório.
_Avoid_: Dono, owner, organizador, criador

**Prazo de Confirmação**:
Data opcional após a qual o Convite deixa de aceitar Respostas, sem deixar de
ser visível.
_Avoid_: Deadline, data limite, expiração, RSVP by

### Quem recebe

**Convidado**:
Uma pessoa registrada num Convite, tenha sido nomeada pelo Anfitrião ou não.
Existe a partir do momento em que é criada — antes mesmo de abrir o Convite.
_Avoid_: Guest, participante, pessoa

**Convidado Nomeado**:
Um Convidado criado pelo Anfitrião com um nome, dono de um Link Pessoal próprio.
_Avoid_: Convidado identificado, convidado real

**Convidado Anônimo**:
Um Convidado sem nome, criado automaticamente por quem responde sem um Link
Pessoal disponível. Conta nos números, mas o Anfitrião nunca sabe quem é.
_Avoid_: Convidado desconhecido, guest anônimo, visitante

**Visitante**:
A identidade de um navegador específico, e não de uma pessoa. Dois navegadores
da mesma pessoa são dois Visitantes; um navegador usado por duas pessoas é um
Visitante só.
_Avoid_: Sessão, dispositivo, usuário anônimo

### Como o link circula

**Link Pessoal**:
O endereço de um Convite carregando a identificação de um Convidado Nomeado
específico. Enviado individualmente, é o que permite atribuir a Resposta a
alguém.
_Avoid_: Link com hash, link rastreado, link único

**Link Aberto**:
O endereço de um Convite sem identificação de Convidado. Quem responde por ele
vira um Convidado Anônimo.
_Avoid_: Link puro, link genérico, link público

**Reivindicação**:
O ato de um Visitante tomar posse do Link Pessoal de um Convidado Nomeado, o que
acontece na primeira Resposta e nunca mais se desfaz. Quem responder depois pelo
mesmo Link Pessoal vira um Convidado Anônimo.
_Avoid_: Claim, associação, vínculo, lock

### O que se mede

**Resposta**:
A declaração de um Convidado de que vai ou não vai. Só existe em duas formas —
não há "talvez" — e pode ser trocada por quem Reivindicou o Convidado.
_Avoid_: RSVP, confirmação, presença

**Abertura**:
O registro de que um Convidado teve seu Convite aberto ao menos uma vez.
Independe de haver Resposta, e é o que separa "não viu" de "viu e ignorou".
_Avoid_: Visualização, view, acesso, impressão

**Relatório**:
A visão que o Anfitrião tem de um Convite: seus Convidados, o estado de cada um
e os totais de Aberturas, sins e nãos.
_Avoid_: Dashboard, painel, estatísticas
