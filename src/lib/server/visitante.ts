import type { Cookies, Handle } from '@sveltejs/kit';

export const COOKIE_VISITANTE = 'visitante';

const UM_ANO = 60 * 60 * 24 * 365;

/**
 * Garante que todo request carrega um id de Visitante.
 *
 * Um Visitante é um NAVEGADOR, não uma pessoa: o WhatsApp abre links num WebView
 * com cookie jar próprio, então a mesma pessoa vira dois Visitantes ao reabrir o
 * link no Safari. Isso é conhecido e aceito — ela responde duas vezes, com o
 * nome que escrever em cada uma.
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

/*
 * Vínculo: o token do Convidado guardado no próprio dispositivo.
 *
 * Quem se nomeia ao responder pelo Link Aberto ganha um token de Convidado como
 * qualquer outro, só que ninguém lhe mandou o Link Pessoal por WhatsApp. O
 * cookie faz o papel do link: mesmo reabrindo o Link Aberto — sem `?convidado=`
 * na URL — o navegador chega ao Convite já identificado. Um por Convite, porque
 * o mesmo aparelho pode ter se nomeado em vários.
 */
function nomeDoVinculo(conviteHash: string): string {
	return `convidado_${conviteHash}`;
}

export function lerVinculo(cookies: Cookies, conviteHash: string): string | undefined {
	return cookies.get(nomeDoVinculo(conviteHash));
}

export function gravarVinculo(
	cookies: Cookies,
	conviteHash: string,
	token: string,
	url: URL
): void {
	cookies.set(nomeDoVinculo(conviteHash), token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !url.hostname.includes('localhost'),
		maxAge: UM_ANO
	});
}
