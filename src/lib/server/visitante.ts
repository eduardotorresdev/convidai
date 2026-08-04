import type { Handle } from '@sveltejs/kit';

export const COOKIE_VISITANTE = 'visitante';

const UM_ANO = 60 * 60 * 24 * 365;

/**
 * Garante que todo request carrega um id de Visitante.
 *
 * Um Visitante é um NAVEGADOR, não uma pessoa: o WhatsApp abre links num WebView
 * com cookie jar próprio, então a mesma pessoa vira dois Visitantes ao reabrir o
 * link no Safari. Isso é conhecido e aceito — vira Convidado Anônimo.
 */
export const visitanteHandle: Handle = async ({ event, resolve }) => {
	let id = event.cookies.get(COOKIE_VISITANTE);

	if (!id) {
		id = crypto.randomUUID();
		event.cookies.set(COOKIE_VISITANTE, id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !event.url.hostname.includes('localhost'),
			maxAge: UM_ANO
		});
	}

	event.locals.visitanteId = id;
	return resolve(event);
};
