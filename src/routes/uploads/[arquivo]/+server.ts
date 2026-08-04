import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { error } from '@sveltejs/kit';
import { caminhoDaImagem, imagemExiste } from '$lib/server/uploads';
import type { RequestHandler } from './$types';

/**
 * Serve a arte dos Convites a partir do disco.
 *
 * O nome do arquivo é aleatório e imutável — trocar a arte gera um nome novo —,
 * então dá pra cachear pra sempre sem risco de servir imagem velha.
 */
export const GET: RequestHandler = ({ params }) => {
	const caminho = caminhoDaImagem(params.arquivo);
	if (!caminho || !imagemExiste(params.arquivo)) error(404, 'Imagem não encontrada');

	return new Response(Readable.toWeb(createReadStream(caminho)) as ReadableStream, {
		headers: {
			'content-type': 'image/webp',
			'cache-control': 'public, max-age=31536000, immutable'
		}
	});
};
