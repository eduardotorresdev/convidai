import sharp from 'sharp';
import { rgbParaOklch } from '$lib/cores';
import type { Tema } from '$lib/tema';

/** As colunas de tema do Convite, prontas pra um insert/update. */
export function colunasDoTema(tema: Tema | null) {
	return {
		temaMatiz: tema?.matiz ?? null,
		temaCroma: tema?.croma ?? null,
		temaModo: tema?.modo ?? null
	};
}

/**
 * Destila a arte de um Convite em matiz, croma e modo.
 *
 * Trabalha numa miniatura: 48x48 já basta pra saber "de que cor é essa imagem"
 * e é rápido o bastante pra rodar no caminho do upload.
 */
const LADO_AMOSTRA = 48;

/** Abaixo disso o pixel é cinza, e cinza não tem matiz pra opinar. */
const CROMA_MINIMO = 0.035;

/** Fração de pixels coloridos que uma arte precisa ter pra ganhar tema. */
const FRACAO_MINIMA = 0.12;

/** Luminosidade média acima da qual a arte pede um Convite claro. */
const LIMIAR_CLARO = 0.68;

const FAIXAS = 24;

/**
 * Extrai o tema da arte, ou nulo quando ela não tem cor de que se falar
 * (preto e branco, sépia lavada) — aí o Convite fica no tema padrão.
 */
export async function extrairTema(arte: Buffer): Promise<Tema | null> {
	const { data, info } = await sharp(arte)
		.resize(LADO_AMOSTRA, LADO_AMOSTRA, { fit: 'fill' })
		.raw()
		.toBuffer({ resolveWithObject: true });

	const canais = info.channels;
	const total = info.width * info.height;

	// Soma vetorial por faixa de matiz: dá pra achar a faixa dominante e, dentro
	// dela, a matiz média sem sofrer com a volta dos 360° pra 0°.
	const pesos = new Array<number>(FAIXAS).fill(0);
	const senos = new Array<number>(FAIXAS).fill(0);
	const cossenos = new Array<number>(FAIXAS).fill(0);
	const contagens = new Array<number>(FAIXAS).fill(0);

	let somaLuz = 0;
	let coloridos = 0;

	for (let i = 0; i < total; i++) {
		const p = i * canais;
		// Pixel transparente não é cor de ninguém — a arte gravada é opaca, mas
		// o cliente pode ter mandado PNG com alpha antes do recorte.
		if (canais === 4 && data[p + 3] < 128) continue;

		const { l, c, h } = rgbParaOklch(data[p], data[p + 1], data[p + 2]);
		somaLuz += l;

		// Preto e branco quase puros distorcem a matiz sem contribuir com cor.
		if (c < CROMA_MINIMO || l < 0.12 || l > 0.95) continue;

		const faixa = Math.min(FAIXAS - 1, Math.floor((h / 360) * FAIXAS));
		const rad = (h * Math.PI) / 180;
		// O peso é o próprio croma: um pixel vibrante vale mais que um lavado.
		pesos[faixa] += c;
		senos[faixa] += Math.sin(rad) * c;
		cossenos[faixa] += Math.cos(rad) * c;
		contagens[faixa]++;
		coloridos++;
	}

	if (total === 0) return null;

	const modo = somaLuz / total > LIMIAR_CLARO ? 'claro' : 'escuro';
	if (coloridos / total < FRACAO_MINIMA) return null;

	let dominante = 0;
	for (let f = 1; f < FAIXAS; f++) if (pesos[f] > pesos[dominante]) dominante = f;
	if (pesos[dominante] === 0) return null;

	// A faixa vizinha mais forte entra junto: uma cor pousada em cima da divisa
	// de duas faixas se dividiria entre elas e perderia pra uma cor secundária.
	const antes = (dominante + FAIXAS - 1) % FAIXAS;
	const depois = (dominante + 1) % FAIXAS;
	const vizinha = pesos[antes] >= pesos[depois] ? antes : depois;
	const eleitas = [dominante, vizinha];

	const peso = eleitas.reduce((soma, f) => soma + pesos[f], 0);
	const seno = eleitas.reduce((soma, f) => soma + senos[f], 0);
	const cosseno = eleitas.reduce((soma, f) => soma + cossenos[f], 0);
	const contagem = eleitas.reduce((soma, f) => soma + contagens[f], 0);

	let matiz = (Math.atan2(seno, cosseno) * 180) / Math.PI;
	if (matiz < 0) matiz += 360;

	// Croma médio das faixas eleitas, e não o máximo: um único pixel neon não
	// deve decidir o quanto o Convite inteiro satura.
	const croma = peso / contagem;

	return { matiz, croma, modo };
}
