import { oklchParaHex } from '$lib/cores';

/**
 * O tema de um Convite: o que sobra da arte depois de destilada.
 *
 * A imagem só decide MATIZ e quanto de cor existe (croma), mais se o convite é
 * claro ou escuro. Toda a luminosidade dos tokens é fixa aqui — é isso que
 * impede uma arte qualquer de gerar um Convite ilegível.
 *
 * A matiz principal pinta o ambiente; a accent, quando a arte tem uma segunda
 * cor mais quente que a dominante, pinta só os tokens que cantam. Accent nula
 * significa arte de uma cor só: aí o accent segue a dominante, como sempre foi.
 */
export type Tema = {
	matiz: number;
	croma: number;
	modo: 'claro' | 'escuro';
	accentMatiz?: number | null;
	accentCroma?: number | null;
};

/** Cor de fundo do tema padrão (`--color-creme` do app.css). */
export const FUNDO_PADRAO = '#fdfbf7';

/** Verde de "Vou": a semântica da Resposta não pode virar refém da arte. */
const MATIZ_SIM = 152;

/** Croma da arte que já conta como "cor cheia" — acima disso não satura mais. */
const CROMA_CHEIO = 0.11;

type Degrau = { l: number; c: number; matiz?: number; accent?: true };

/*
 * Cada token é um degrau de luminosidade fixa. O croma baixo de fundo e texto é
 * proposital: eles seguram a página, o accent é que canta. `matiz` só aparece
 * nos tokens que não seguem a cor da arte, e `accent` marca os que seguem a
 * segunda cor dela em vez da dominante.
 */
const ESCADAS: Record<'claro' | 'escuro', Record<string, Degrau>> = {
	escuro: {
		creme: { l: 0.21, c: 0.038 },
		papel: { l: 0.27, c: 0.042 },
		linha: { l: 0.36, c: 0.036 },
		'linha-forte': { l: 0.55, c: 0.048 },
		tinta: { l: 0.96, c: 0.018 },
		suave: { l: 0.79, c: 0.028 },
		terracota: { l: 0.8, c: 0.13, accent: true },
		'terracota-forte': { l: 0.88, c: 0.11, accent: true },
		'terracota-fraca': { l: 0.31, c: 0.055, accent: true },
		'sobre-accent': { l: 0.2, c: 0.04, accent: true },
		sim: { l: 0.8, c: 0.13, matiz: MATIZ_SIM },
		'sim-fraca': { l: 0.31, c: 0.05, matiz: MATIZ_SIM },
		'sobre-sim': { l: 0.2, c: 0.04, matiz: MATIZ_SIM },
		nao: { l: 0.79, c: 0.028 }
	},
	claro: {
		creme: { l: 0.96, c: 0.022 },
		papel: { l: 0.99, c: 0.008 },
		linha: { l: 0.89, c: 0.026 },
		'linha-forte': { l: 0.71, c: 0.042 },
		tinta: { l: 0.25, c: 0.03 },
		suave: { l: 0.51, c: 0.032 },
		terracota: { l: 0.5, c: 0.14, accent: true },
		'terracota-forte': { l: 0.42, c: 0.13, accent: true },
		'terracota-fraca': { l: 0.94, c: 0.035, accent: true },
		'sobre-accent': { l: 0.99, c: 0.006, accent: true },
		sim: { l: 0.48, c: 0.12, matiz: MATIZ_SIM },
		'sim-fraca': { l: 0.95, c: 0.03, matiz: MATIZ_SIM },
		'sobre-sim': { l: 0.99, c: 0.006, matiz: MATIZ_SIM },
		nao: { l: 0.51, c: 0.032 }
	}
};

/**
 * Deriva a paleta inteira do Convite.
 *
 * Tema nulo (arte sem cor, ou Convite anterior a este recurso) devolve mapa
 * vazio: nenhum override, o app.css manda.
 */
export function derivarTema(tema: Tema | null | undefined): Record<string, string> {
	if (!tema) return {};

	// Arte discreta rende tema discreto: o croma da imagem escala o da paleta,
	// com piso pra não virar cinza puro em foto lavada.
	const fator = escalar(tema.croma);
	// A accent costuma ser bem mais saturada que a média da arte; escalá-la pelo
	// croma do ambiente devolveria um botão lavado no meio de um convite vibrante.
	const fatorAccent = escalar(tema.accentCroma ?? tema.croma);
	const escada = ESCADAS[tema.modo];

	const paleta: Record<string, string> = {};
	for (const [nome, degrau] of Object.entries(escada)) {
		// O verde do "Vou" tem matiz própria e não deve encolher junto com a arte.
		const [matiz, croma] =
			degrau.matiz !== undefined
				? [degrau.matiz, degrau.c]
				: degrau.accent
					? [tema.accentMatiz ?? tema.matiz, degrau.c * fatorAccent]
					: [tema.matiz, degrau.c * fator];
		paleta[`--color-${nome}`] = oklchParaHex(degrau.l, croma, matiz);
	}
	return paleta;
}

/** Croma da arte → multiplicador do croma da paleta. */
function escalar(croma: number): number {
	return Math.min(1, Math.max(0.6, croma / CROMA_CHEIO));
}

/**
 * Remonta o Tema a partir das colunas do Convite.
 *
 * As três primeiras colunas andam juntas ou não valem nada: qualquer uma nula
 * significa Convite sem tema. As duas da accent são independentes — nulas em
 * arte de uma cor só e em Convite anterior a esse recurso.
 */
export function temaDoConvite(convite: {
	temaMatiz: number | null;
	temaCroma: number | null;
	temaModo: 'claro' | 'escuro' | null;
	temaAccentMatiz: number | null;
	temaAccentCroma: number | null;
}): Tema | null {
	if (convite.temaMatiz === null || convite.temaCroma === null || convite.temaModo === null) {
		return null;
	}
	return {
		matiz: convite.temaMatiz,
		croma: convite.temaCroma,
		modo: convite.temaModo,
		accentMatiz: convite.temaAccentMatiz,
		accentCroma: convite.temaAccentCroma
	};
}

/** Cor de fundo do Convite, para o `<meta name="theme-color">`. */
export function corDeFundo(tema: Tema | null | undefined): string {
	return derivarTema(tema)['--color-creme'] ?? FUNDO_PADRAO;
}

/**
 * Serializa a paleta como um bloco `:root`.
 *
 * Vai num `<style>` no head da página, e não numa classe: o `background-color`
 * da página está no `html`, e os utilitários do Tailwind já leem `var(--color-*)`
 * — sobrescrever a variável na raiz retinge o app inteiro sem tocar em componente.
 */
export function cssDoTema(tema: Tema | null | undefined): string {
	const paleta = derivarTema(tema);
	const linhas = Object.entries(paleta).map(([nome, cor]) => `${nome}:${cor}`);
	return linhas.length === 0 ? '' : `:root{${linhas.join(';')}}`;
}
