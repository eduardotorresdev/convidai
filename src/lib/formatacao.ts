/*
 * A descrição do Convite é escrita no mesmo teclado em que o link é mandado, então
 * a marcação que o Anfitrião já tem na mão é a do WhatsApp — não markdown. Daí um
 * formatador próprio: uma lib de markdown entenderia sintaxe que ninguém digitou de
 * propósito (`[a](b)`, `#`, `**`) e deixaria `*negrito*` de fora.
 *
 * SEGURANÇA — é esta invariante que sustenta o `{@html}` de quem consome o módulo:
 * todo texto do usuário passa por `escapar()` antes de entrar na saída, e daí em
 * diante os únicos `<` e `>` da string são de tags escritas aqui. Nenhum passo pode
 * ser reordenado para emitir texto do usuário sem escapar.
 */

const ESCAPES: Record<string, string> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
};

function escapar(texto: string): string {
	return texto.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

/**
 * Trechos já prontos saem de cena marcados por NUL e voltam no fim. O NUL some do
 * texto do usuário em `normalizar()` — sem isso ele poderia forjar uma marca e
 * escolher o que reinserimos aqui.
 */
const MARCA = String.fromCharCode(0);
const PLACEHOLDER = new RegExp(`${MARCA}(\\d+)${MARCA}`, 'g');

/** Tira `\r` e caracteres de controle, preservando as quebras de linha. */
function normalizar(texto: string): string {
	return texto
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((linha) => linha.replace(/\p{Cc}/gu, ''))
		.join('\n');
}

/*
 * Marcadores inline. O conteúdo nunca cruza `<` nem `>`: depois do escape esses
 * caracteres só existem em tags nossas, então essa cerca é o que impede um passo
 * posterior de abrir uma tag dentro de outra e sair com aninhamento quebrado.
 * O lookahead exige caractere colado ao delimitador — é o que faz "2 * 3" continuar
 * sendo multiplicação, e não negrito.
 */
const NEGRITO = /\*(?=[^\s*<>])([^*<>\n]*?[^*<>\s])\*/g;
const ITALICO = /_(?=[^\s_<>])([^_<>\n]*?[^_<>\s])_/g;
const TACHADO = /~(?=[^\s~<>])([^~<>\n]*?[^~<>\s])~/g;

const CODIGO_EMBUTIDO = /`([^`\n]+)`/g;
const BLOCO_MONO = /```([\s\S]+?)```/g;

const CITACAO = /^>\s?(.*)$/;
const ITEM_LISTA = /^[*-][ \t]+(.+)$/;
const ITEM_NUMERADO = /^(\d{1,3})[.)][ \t]+(.+)$/;

type Bloco =
	| { tipo: 'paragrafo'; linhas: string[] }
	| { tipo: 'citacao'; linhas: string[] }
	| { tipo: 'lista'; linhas: string[] }
	| { tipo: 'numerada'; inicio: number; linhas: string[] };

/** Converte a descrição na marcação do WhatsApp para HTML pronto para `{@html}`. */
export function paraHtmlWhatsApp(texto: string): string {
	const guardados: string[] = [];
	const guardar = (html: string) => {
		guardados.push(html);
		return `${MARCA}${guardados.length - 1}${MARCA}`;
	};

	// O bloco ```mono``` atravessa linhas, então sai de cena antes do agrupamento —
	// senão o passo de blocos fatiaria o miolo dele em parágrafos e listas.
	const semBlocos = normalizar(texto).replace(BLOCO_MONO, (_, conteudo: string) =>
		guardar(`<code class="mono">${escapar(conteudo.replace(/^\n|\n$/g, ''))}</code>`)
	);

	const html = agrupar(semBlocos)
		.map((bloco) => renderizar(bloco, guardar))
		.join('');

	return html.replace(PLACEHOLDER, (_, i: string) => guardados[Number(i)]);
}

/**
 * O mesmo texto sem marcação nenhuma, para onde só cabe texto puro — o
 * `og:description`, que hoje entregaria os asteriscos crus ao card do WhatsApp.
 */
export function paraTextoSimples(texto: string): string {
	return normalizar(texto)
		.replace(BLOCO_MONO, (_, conteudo: string) => conteudo)
		.split('\n')
		.map((linha) => linha.replace(/^\s*(?:>\s?|[*-][ \t]+|\d{1,3}[.)][ \t]+)/, ''))
		.join('\n')
		.replace(CODIGO_EMBUTIDO, '$1')
		.replace(/\*(?=[^\s*])([^*\n]*?[^*\s])\*/g, '$1')
		.replace(/_(?=[^\s_])([^_\n]*?[^_\s])_/g, '$1')
		.replace(/~(?=[^\s~])([^~\n]*?[^~\s])~/g, '$1');
}

/** Junta linhas vizinhas do mesmo tipo; linha em branco fecha o bloco corrente. */
function agrupar(texto: string): Bloco[] {
	const blocos: Bloco[] = [];

	for (const linha of texto.split('\n')) {
		if (!linha.trim()) {
			// Sentinela vazio: só serve para quebrar a sequência, e o filtro do fim o tira.
			blocos.push({ tipo: 'paragrafo', linhas: [] });
			continue;
		}

		const citacao = CITACAO.exec(linha);
		const item = citacao ? null : ITEM_LISTA.exec(linha);
		const numerado = citacao || item ? null : ITEM_NUMERADO.exec(linha);

		const conteudo = citacao?.[1] ?? item?.[1] ?? numerado?.[2] ?? linha;
		const novo: Bloco = numerado
			? { tipo: 'numerada', inicio: Number(numerado[1]), linhas: [conteudo] }
			: { tipo: citacao ? 'citacao' : item ? 'lista' : 'paragrafo', linhas: [conteudo] };

		const ultimo = blocos.at(-1);
		if (ultimo?.tipo === novo.tipo && ultimo.linhas.length > 0) {
			ultimo.linhas.push(conteudo);
		} else {
			blocos.push(novo);
		}
	}

	return blocos.filter((bloco) => bloco.linhas.length > 0);
}

function renderizar(bloco: Bloco, guardar: (html: string) => string): string {
	const linhas = bloco.linhas.map((linha) => inline(escapar(linha), guardar));

	switch (bloco.tipo) {
		case 'citacao':
			return `<blockquote>${linhas.join('<br />')}</blockquote>`;
		case 'lista':
			return `<ul>${linhas.map((l) => `<li>${l}</li>`).join('')}</ul>`;
		case 'numerada': {
			const inicio = bloco.inicio === 1 ? '' : ` start="${bloco.inicio}"`;
			return `<ol${inicio}>${linhas.map((l) => `<li>${l}</li>`).join('')}</ol>`;
		}
		default:
			return `<p>${linhas.join('<br />')}</p>`;
	}
}

function inline(escapado: string, guardar: (html: string) => string): string {
	// `código` primeiro: o que está dentro dele não recebe mais nenhuma marcação.
	return escapado
		.replace(CODIGO_EMBUTIDO, (_, conteudo: string) => guardar(`<code>${conteudo}</code>`))
		.replace(NEGRITO, '<strong>$1</strong>')
		.replace(ITALICO, '<em>$1</em>')
		.replace(TACHADO, '<s>$1</s>');
}
