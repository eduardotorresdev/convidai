import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export type Anfitriao = { id: string; nome: string; email: string; foto: string | null };

export async function anfitriaoAtual(event: RequestEvent): Promise<Anfitriao | null> {
	const sessao = await event.locals.auth();
	const u = sessao?.user;
	if (!u?.id) return null;
	return { id: u.id, nome: u.name ?? 'Você', email: u.email ?? '', foto: u.image ?? null };
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
