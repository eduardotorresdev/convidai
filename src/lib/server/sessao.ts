import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export type Anfitriao = { id: string; nome: string; email: string; foto: string | null };

export async function anfitriaoAtual(event: RequestEvent): Promise<Anfitriao | null> {
	const sessao = await event.locals.auth();
	const u = sessao?.user;
	if (!u?.id) return null;
	return { id: u.id, nome: u.name ?? 'Você', email: u.email ?? '', foto: u.image ?? null };
}

/**
 * Só caminho da própria origem vira destino — qualquer outra coisa é tentativa de open redirect.
 * Comparar prefixos à mão não basta: o parser de URL trata `\` como `/`, então `/\evil.com`
 * também vira autoridade externa. Resolver contra a origem e exigir mesma origem cobre todas
 * as variantes de uma vez.
 */
export function destinoSeguro(bruto: string | null, origem: string): string {
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

/** Guarda de rota do Anfitrião. Volta pra página pedida depois do login. */
export async function exigirAnfitriao(event: RequestEvent): Promise<Anfitriao> {
	const anfitriao = await anfitriaoAtual(event);
	if (!anfitriao) {
		const destino = event.url.pathname + event.url.search;
		redirect(303, `/entrar?destino=${encodeURIComponent(destino)}`);
	}
	return anfitriao;
}
