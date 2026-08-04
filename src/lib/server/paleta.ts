import sharp from 'sharp';
import { rgbParaOklch } from '$lib/cores';
import type { Tema } from '$lib/tema';

/** As colunas de tema do Convite, prontas pra um insert/update. */
export function colunasDoTema(tema: Tema | null) {
	return {
		temaMatiz: tema?.matiz ?? null,
		temaCroma: tema?.croma ?? null,
		temaModo: tema?.modo ?? null,
		temaAccentMatiz: tema?.accentMatiz ?? null,
		temaAccentCroma: tema?.accentCroma ?? null
	};
}

/**
 * Destila a arte de um Convite em matiz, croma e modo.
 *
 * Trabalha numa miniatura. 48x48 bastava pra saber "de que cor é essa imagem",
 * mas não pra achar a segunda cor: um buquê de girassóis num convite azul cabe
 * em meia dúzia de pixels nessa escala, e meia dúzia de pixels é ruído. 160x160
 * dá amostra pra faixa minoritária significar alguma coisa e ainda roda em
 * milissegundos no caminho do upload.
 */
const LADO_AMOSTRA = 160;

/** Abaixo disso o pixel é cinza, e cinza não tem matiz pra opinar. */
const CROMA_MINIMO = 0.035;

/** Fração de pixels coloridos que uma arte precisa ter pra ganhar tema. */
const FRACAO_MINIMA = 0.12;

/** Luminosidade média acima da qual a arte pede um Convite claro. */
const LIMIAR_CLARO = 0.68;

const FAIXAS = 24;

/** Fração dos pixels coloridos que a accent inteira precisa ocupar. */
const FRACAO_ACCENT = 0.01;

/** Pixels que uma faixa precisa ter pra opinar — abaixo disso é respingo. */
const PIXELS_MINIMOS = 12;

/** Distância de matiz abaixo da qual a candidata ainda é "a mesma cor" da dominante. */
const DISTANCIA_ACCENT = 40;

/** Vibrância a partir da qual uma faixa é quente o bastante pra virar accent. */
const CROMA_ACCENT = 0.11;

/** Quão mais vibrante que a dominante a accent precisa ser pra valer a troca. */
const VANTAGEM_ACCENT = 1.25;

/**
 * A vibrância de uma faixa é o percentil 90 do croma dela, e não a média.
 *
 * A média mente na cor minoritária: a borda serrilhada de uma letra amarela é
 * meio amarela e meio fundo, e essa meia-cor puxa a média da faixa pra baixo
 * até empatar com um fundo azul chapado. O percentil 90 pergunta outra coisa —
 * "quando essa cor aparece de verdade, quão viva ela é?" — e aí o amarelo do
 * girassol (0.14) se separa do azul da noite (0.10), que é o que o olho vê.
 */
function vibrancia(cromas: number[]): number {
	if (cromas.length < PIXELS_MINIMOS) return 0;
	const ordenados = [...cromas].sort((a, b) => a - b);
	return ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * 0.9))];
}

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
	// Os cromas crus de cada faixa, pro percentil que mede a vibrância.
	const cromas: number[][] = Array.from({ length: FAIXAS }, () => []);

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
		cromas[faixa].push(c);
		coloridos++;
	}

	if (total === 0) return null;

	const modo = somaLuz / total > LIMIAR_CLARO ? 'claro' : 'escuro';
	if (coloridos / total < FRACAO_MINIMA) return null;

	/**
	 * Funde faixas numa cor só: matiz pela soma vetorial (imune à volta dos 360°
	 * pra 0°) e croma médio — e não máximo, senão um único pixel neon decidiria
	 * o quanto o Convite inteiro satura.
	 */
	function fundir(faixas: number[]): { matiz: number; croma: number } {
		const peso = faixas.reduce((soma, f) => soma + pesos[f], 0);
		const seno = faixas.reduce((soma, f) => soma + senos[f], 0);
		const cosseno = faixas.reduce((soma, f) => soma + cossenos[f], 0);
		const contagem = faixas.reduce((soma, f) => soma + contagens[f], 0);

		let matiz = (Math.atan2(seno, cosseno) * 180) / Math.PI;
		if (matiz < 0) matiz += 360;
		return { matiz, croma: peso / contagem };
	}

	/**
	 * A faixa vizinha mais forte entra junto: uma cor pousada em cima da divisa
	 * de duas faixas se dividiria entre elas e perderia pra uma cor secundária.
	 */
	function comVizinha(faixa: number): number[] {
		const antes = (faixa + FAIXAS - 1) % FAIXAS;
		const depois = (faixa + 1) % FAIXAS;
		return [faixa, pesos[antes] >= pesos[depois] ? antes : depois];
	}

	/**
	 * A segunda cor da arte: o bloco de faixas vibrantes longe da dominante.
	 *
	 * Vence a maior VIBRÂNCIA, e não o maior peso — é isso que faz o amarelo dos
	 * girassóis bater o azul que ocupa o convite inteiro. Nula quando a arte é de
	 * uma cor só, e aí o accent do tema segue a dominante como sempre seguiu.
	 */
	function elegerAccent(dominantes: number[], matizDominante: number) {
		const piso = Math.max(
			CROMA_ACCENT,
			vibrancia(dominantes.flatMap((f) => cromas[f])) * VANTAGEM_ACCENT
		);

		// Uma cor real quase nunca cabe numa faixa só: girassol tem miolo laranja e
		// pétala amarela. Quem qualifica é a faixa; quem vira accent é o bloco
		// contíguo delas, senão a matiz sairia torta pra ponta do buquê.
		const qualifica = (f: number) =>
			!dominantes.includes(f) &&
			vibrancia(cromas[f]) >= piso &&
			distancia(centroDaFaixa(f), matizDominante) >= DISTANCIA_ACCENT;

		let melhor = -1;
		for (let f = 0; f < FAIXAS; f++) {
			if (!qualifica(f)) continue;
			if (melhor < 0 || vibrancia(cromas[f]) > vibrancia(cromas[melhor])) melhor = f;
		}
		if (melhor < 0) return null;

		const bloco = [melhor];
		for (let passo = 1; passo < FAIXAS; passo++) {
			const antes = (melhor - passo + FAIXAS) % FAIXAS;
			if (!qualifica(antes) || bloco.includes(antes)) break;
			bloco.unshift(antes);
		}
		for (let passo = 1; passo < FAIXAS; passo++) {
			const depois = (melhor + passo) % FAIXAS;
			if (!qualifica(depois) || bloco.includes(depois)) break;
			bloco.push(depois);
		}

		const pixels = bloco.reduce((soma, f) => soma + contagens[f], 0);
		if (pixels / coloridos < FRACAO_ACCENT) return null;

		return {
			matiz: fundir(bloco).matiz,
			// A vibrância do bloco, e não o croma médio: é ela que diz o quanto o
			// accent tem direito de saturar.
			croma: vibrancia(bloco.flatMap((f) => cromas[f]))
		};
	}

	let dominante = 0;
	for (let f = 1; f < FAIXAS; f++) if (pesos[f] > pesos[dominante]) dominante = f;
	if (pesos[dominante] === 0) return null;

	const eleitas = comVizinha(dominante);
	const { matiz, croma } = fundir(eleitas);
	const accent = elegerAccent(eleitas, matiz);

	return {
		matiz,
		croma,
		modo,
		accentMatiz: accent?.matiz ?? null,
		accentCroma: accent?.croma ?? null
	};
}

const centroDaFaixa = (faixa: number) => ((faixa + 0.5) * 360) / FAIXAS;

/** Distância entre duas matizes pelo menor arco — 0 a 180. */
function distancia(a: number, b: number): number {
	const bruta = Math.abs(a - b) % 360;
	return bruta > 180 ? 360 - bruta : bruta;
}
