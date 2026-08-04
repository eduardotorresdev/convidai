import { fail, redirect } from '@sveltejs/kit';
import { novoHash, paraSlug } from '$lib/ids';
import { db, schema } from '$lib/server/db';
import { slugEmUso } from '$lib/server/convites';
import { exigirAnfitriao } from '$lib/server/sessao';
import { colunasDoTema } from '$lib/server/paleta';
import { salvarImagem, TAMANHO_MAX } from '$lib/server/uploads';
import type { Actions, PageServerLoad } from './$types';

const MAX_TITULO = 80;
const MAX_DESCRICAO = 600;

/**
 * 'YYYY-MM-DD' vira o FIM do dia no fuso do servidor: um Prazo marcado pro dia
 * 12 tem que valer o dia 12 inteiro, não morrer à meia-noite que o abre.
 */
function fimDoDia(iso: string): Date | null {
	const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!partes) return null;

	const ano = Number(partes[1]);
	const mes = Number(partes[2]);
	const dia = Number(partes[3]);
	const data = new Date(ano, mes - 1, dia, 23, 59, 59, 999);

	// Pega 2025-02-31 e afins, que o Date normaliza silenciosamente.
	if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
		return null;
	}
	return data;
}

export const load: PageServerLoad = async (event) => {
	await exigirAnfitriao(event);
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const anfitriao = await exigirAnfitriao(event);
		const dados = await event.request.formData();

		const titulo = String(dados.get('titulo') ?? '').trim();
		const descricao = String(dados.get('descricao') ?? '').trim();
		const prazoBruto = String(dados.get('prazo') ?? '').trim();
		const imagem = dados.get('imagem');

		const erros: Record<string, string> = {};
		const valores = { titulo, descricao, prazo: prazoBruto };

		if (!titulo) erros.titulo = 'Dê um título ao convite.';
		else if (titulo.length > MAX_TITULO) erros.titulo = `No máximo ${MAX_TITULO} caracteres.`;

		if (descricao.length > MAX_DESCRICAO) {
			erros.descricao = `No máximo ${MAX_DESCRICAO} caracteres.`;
		}

		if (!(imagem instanceof File) || imagem.size === 0) {
			erros.imagem = 'Escolha a arte do convite.';
		} else if (!imagem.type.startsWith('image/')) {
			erros.imagem = 'O arquivo precisa ser uma imagem.';
		} else if (imagem.size > TAMANHO_MAX) {
			erros.imagem = `A imagem passa de ${Math.round(TAMANHO_MAX / 1024 / 1024)} MB.`;
		}

		let prazo: Date | null = null;
		if (prazoBruto) {
			prazo = fimDoDia(prazoBruto);
			if (!prazo) erros.prazo = 'Data inválida.';
		}

		if (Object.keys(erros).length > 0) return fail(400, { erros, valores });

		const hash = novoHash();
		const base = paraSlug(titulo);
		let slug = base;
		while (slugEmUso(slug)) slug = `${base}-${novoHash(4)}`;

		const arte = await salvarImagem(await (imagem as File).arrayBuffer());

		db.insert(schema.convites)
			.values({
				hash,
				slug,
				anfitriaoId: anfitriao.id,
				titulo,
				descricao,
				imagem: arte.arquivo,
				...colunasDoTema(arte.tema),
				prazo
			})
			.run();

		redirect(303, `/visualizar/${hash}`);
	}
};
