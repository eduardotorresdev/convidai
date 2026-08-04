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
Uma pessoa registrada num Convite, sempre com nome e sempre dona de um Link
Pessoal. Nasce quando o Anfitrião a convida, ou quando ela mesma se apresenta ao
responder.
_Avoid_: Guest, participante, pessoa

**Convidado Nomeado**:
Um Convidado criado pelo Anfitrião, que escolheu o nome e manda o Link Pessoal
para a pessoa certa. É o único caso em que o nome na lista tem garantia.
_Avoid_: Convidado identificado, convidado real

**Convidado que se nomeou**:
Um Convidado criado por quem responde sem ter um Link Pessoal disponível,
escrevendo o próprio nome na hora. Ninguém confere esse nome: ele pode vir
repetido ou inventado, e o Anfitrião sabe disso.
_Avoid_: Convidado anônimo, autodeclarado, guest anônimo, visitante

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
escreve o próprio nome e vira um Convidado ali mesmo.
_Avoid_: Link puro, link genérico, link público

**Vínculo**:
O token de Convidado guardado no navegador de quem se nomeou respondendo. Faz o
papel do Link Pessoal que ninguém mandou: com ele, reabrir o Link Aberto chega ao
Convite já identificado.
_Avoid_: Sessão do convidado, lembrar-me, cookie

**Reivindicação**:
O ato de um Visitante tomar posse do Link Pessoal de um Convidado Nomeado, o que
acontece na primeira Resposta e nunca mais se desfaz. Quem responder depois pelo
mesmo Link Pessoal se nomeia e vira um Convidado próprio.
_Avoid_: Claim, associação, lock

### O que se mede

**Resposta**:
A declaração de um Convidado de que vai ou não vai. Só existe em duas formas —
não há "talvez" — e pode ser trocada por quem Reivindicou o Convidado.
_Avoid_: RSVP, confirmação, presença

**Abertura**:
O registro de que um Convidado teve seu Convite aberto ao menos uma vez.
Independe de haver Resposta, e é o que separa "não viu" de "viu e ignorou". Só
existe onde já existe Convidado: quem espia o Link Aberto e vai embora sem
responder não deixa rastro nenhum.
_Avoid_: Visualização, view, acesso, impressão

**Relatório**:
A visão que o Anfitrião tem de um Convite: seus Convidados, o estado de cada um
e os totais de Aberturas, sins e nãos.
_Avoid_: Dashboard, painel, estatísticas
