const ALFABETO = 'abcdefghijkmnopqrstuvwxyz23456789'; // sem l/1/0/o

/** Id curto, imprevisível e legível em voz alta. Usado como hash de Convite. */
export function novoHash(tamanho = 8): string {
	const bytes = crypto.getRandomValues(new Uint8Array(tamanho));
	let saida = '';
	for (const b of bytes) saida += ALFABETO[b % ALFABETO.length];
	return saida;
}

/** Token de Link Pessoal. Longo porque é a única credencial de um Convidado. */
export function novoTokenConvidado(): string {
	return crypto.randomUUID();
}

/**
 * Enfeite legível na URL. Nunca é usado pra buscar nada — se vier errado, a
 * página redireciona pro slug canônico em vez de dar 404.
 */
export function paraSlug(texto: string): string {
	const limpo = texto
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60)
		.replace(/-+$/g, '');

	return limpo || 'convite';
}

export function caminhoDoConvite(hash: string, slug: string): string {
	return `/convites/${hash}/${slug}`;
}
