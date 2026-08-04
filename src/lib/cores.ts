/**
 * Conversões de cor sRGB ↔ OKLab ↔ OKLCH.
 *
 * OKLCH é o espaço em que o tema é pensado: matiz (h) é a única coisa que a arte
 * decide, enquanto luminosidade (L) fica travada no código. Como L em OKLab é
 * perceptualmente uniforme, travar L é o que garante contraste independente da
 * cor que vier da imagem.
 *
 * A saída é sempre hex: nada aqui depende de `oklch()` no navegador, que o
 * WebView antigo do WhatsApp pode não entender.
 */

export type Oklch = { l: number; c: number; h: number };

const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** sRGB 0–255 → linear 0–1. */
function paraLinear(canal: number): number {
	const v = canal / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** Linear 0–1 → sRGB 0–255, já arredondado. */
function paraSrgb(linear: number): number {
	const v = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
	return Math.round(limitar(v, 0, 1) * 255);
}

export function rgbParaOklab(r: number, g: number, b: number): { l: number; a: number; b: number } {
	const rl = paraLinear(r);
	const gl = paraLinear(g);
	const bl = paraLinear(b);

	const l = Math.cbrt(0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl);
	const m = Math.cbrt(0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl);
	const s = Math.cbrt(0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl);

	return {
		l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	};
}

export function rgbParaOklch(r: number, g: number, b: number): Oklch {
	const lab = rgbParaOklab(r, g, b);
	const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b);
	let h = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
	if (h < 0) h += 360;
	return { l: lab.l, c, h };
}

/** Devolve nulo quando a cor não cabe no gamut sRGB. */
function oklchParaRgb(l: number, c: number, h: number): [number, number, number] | null {
	const rad = (h * Math.PI) / 180;
	const a = c * Math.cos(rad);
	const b = c * Math.sin(rad);

	const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
	const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
	const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;

	const rl = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_;
	const gl = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_;
	const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_;

	const folga = 0.0001; // arredondamento de ponto flutuante não conta como fuga
	if (Math.min(rl, gl, bl) < -folga || Math.max(rl, gl, bl) > 1 + folga) return null;
	return [paraSrgb(rl), paraSrgb(gl), paraSrgb(bl)];
}

export function paraHex(r: number, g: number, b: number): string {
	return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * OKLCH → hex, cedendo croma até a cor caber no gamut sRGB.
 *
 * A luminosidade nunca é sacrificada — ela é o que sustenta o contraste. Quem
 * cede é a saturação, que é só sabor.
 */
export function oklchParaHex(l: number, c: number, h: number): string {
	const luz = limitar(l, 0, 1);
	for (let croma = Math.max(c, 0); croma > 0.0005; croma -= 0.005) {
		const rgb = oklchParaRgb(luz, croma, h);
		if (rgb) return paraHex(...rgb);
	}
	const cinza = oklchParaRgb(luz, 0, h) ?? [0, 0, 0];
	return paraHex(...cinza);
}

/** Luminância relativa WCAG a partir de canais sRGB 0–255. */
function luminancia(r: number, g: number, b: number): number {
	return 0.2126 * paraLinear(r) + 0.7152 * paraLinear(g) + 0.0722 * paraLinear(b);
}

function lerHex(hex: string): [number, number, number] {
	const limpo = hex.replace('#', '');
	return [
		parseInt(limpo.slice(0, 2), 16),
		parseInt(limpo.slice(2, 4), 16),
		parseInt(limpo.slice(4, 6), 16)
	];
}

/** Razão de contraste WCAG entre dois hex — 1 (igual) a 21 (preto no branco). */
export function contraste(hexA: string, hexB: string): number {
	const a = luminancia(...lerHex(hexA));
	const b = luminancia(...lerHex(hexB));
	const claro = Math.max(a, b);
	const escuro = Math.min(a, b);
	return (claro + 0.05) / (escuro + 0.05);
}
