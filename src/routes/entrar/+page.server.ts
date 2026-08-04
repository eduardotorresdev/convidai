import { redirect } from '@sveltejs/kit';
import { signIn } from '$lib/server/auth';
import { anfitriaoAtual } from '$lib/server/sessao';
import type { Actions, PageServerLoad } from './$types';

/**
 * Só caminho da própria origem vira destino — qualquer outra coisa é tentativa de open redirect.
 * Comparar prefixos à mão não basta: o parser de URL trata `\` como `/`, então `/\evil.com`
 * também vira autoridade externa. Resolver contra a origem e exigir mesma origem cobre todas
 * as variantes de uma vez.
 */
function destinoSeguro(bruto: string | null, origem: string): string {
	if (!bruto || !bruto.startsWith('/')) return '/visualizar';
	let alvo: URL;
	try {
		alvo = new URL(bruto, origem);
	} catch {
		return '/visualizar';
	}
	if (alvo.origin !== origem) return '/visualizar';
	return alvo.pathname + alvo.search;
}

export const load: PageServerLoad = async (event) => {
	const destino = destinoSeguro(event.url.searchParams.get('destino'), event.url.origin);
	if (await anfitriaoAtual(event)) redirect(303, destino);
	return { destino };
};

export const actions: Actions = { default: signIn };
