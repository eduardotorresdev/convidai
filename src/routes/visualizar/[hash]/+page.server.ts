import { and, eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { db, schema } from '$lib/server/db';
import { exigirAnfitriao } from '$lib/server/sessao';
import { criarConvidado, exigirConviteDoAnfitriao, listarConvidados, slugEmUso } from '$lib/server/convites';
import { apagarImagem, salvarImagem, TAMANHO_MAX } from '$lib/server/uploads';
import { colunasDoTema } from '$lib/server/paleta';
import { temaDoConvite } from '$lib/tema';
import { novoHash, paraSlug } from '$lib/ids';
import type { Actions, PageServerLoad } from './$types';

const MAX_TITULO = 80;
const MAX_DESCRICAO = 600;
const MAX_NOME = 60;

export const load: PageServerLoad = async (event) => {
	const anfitriao = await exigirAnfitriao(event);
	const convite = exigirConviteDoAnfitriao(event.params.hash, anfitriao.id);

	return {
		convite,
		// A prévia usa as mesmas cores que o Convidado vai ver.
		tema: temaDoConvite(convite),
		convidados: listarConvidados(convite.hash),
		// O cliente monta Link Pessoal e Link Aberto absolutos pra jogar no share.
		origem: event.url.origin
	};
};

/** Slug novo a partir do título. Nunca mexe no hash — o endereço tem que sobreviver. */
function slugParaTitulo(titulo: string, slugAtual: string): string {
	const base = paraSlug(titulo);
	if (base === slugAtual) return slugAtual;
	return slugEmUso(base) ? `${base}-${novoHash(4)}` : base;
}

/** `<input type="date">` manda 'AAAA-MM-DD'; o Prazo vale até o fim daquele dia. */
function lerPrazo(valor: string): { ok: true; prazo: Date | null } | { ok: false } {
	if (!valor) return { ok: true, prazo: null };
	const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
	if (!partes) return { ok: false };

	const ano = Number(partes[1]);
	const mes = Number(partes[2]);
	const dia = Number(partes[3]);
	const prazo = new Date(ano, mes - 1, dia, 23, 59, 59, 999);

	// Pega 2025-02-31 e afins, que o Date normaliza silenciosamente para outro dia.
	if (prazo.getFullYear() !== ano || prazo.getMonth() !== mes - 1 || prazo.getDate() !== dia) {
		return { ok: false };
	}
	return { ok: true, prazo };
}

export const actions: Actions = {
	convidar: async (event) => {
		const anfitriao = await exigirAnfitriao(event);
		// Posse conferida ANTES de qualquer escrita: hash alheio é 404, não 403.
		const convite = exigirConviteDoAnfitriao(event.params.hash, anfitriao.id);

		const dados = await event.request.formData();
		const token = String(dados.get('token') ?? '').trim();
		const nome = String(dados.get('nome') ?? '').trim();

		if (!token) return fail(400, { acao: 'convidar', erro: 'Token do convidado ausente.' });
		if (!nome) return fail(400, { acao: 'convidar', erro: 'Escreva o nome de quem você vai convidar.' });
		if (nome.length > MAX_NOME) {
			return fail(400, { acao: 'convidar', erro: `O nome pode ter até ${MAX_NOME} caracteres.` });
		}

		criarConvidado(convite.hash, token, nome);
		return { acao: 'convidar', ok: true };
	},

	editar: async (event) => {
		const anfitriao = await exigirAnfitriao(event);
		const convite = exigirConviteDoAnfitriao(event.params.hash, anfitriao.id);

		const dados = await event.request.formData();
		const titulo = String(dados.get('titulo') ?? '').trim();
		const descricao = String(dados.get('descricao') ?? '').trim();
		const prazoBruto = String(dados.get('prazo') ?? '').trim();
		const imagem = dados.get('imagem');

		if (!titulo) return fail(400, { acao: 'editar', erro: 'O convite precisa de um título.' });
		if (titulo.length > MAX_TITULO) {
			return fail(400, { acao: 'editar', erro: `O título pode ter até ${MAX_TITULO} caracteres.` });
		}
		if (descricao.length > MAX_DESCRICAO) {
			return fail(400, {
				acao: 'editar',
				erro: `A descrição pode ter até ${MAX_DESCRICAO} caracteres.`
			});
		}

		const prazo = lerPrazo(prazoBruto);
		if (!prazo.ok) return fail(400, { acao: 'editar', erro: 'Data de prazo inválida.' });

		let nomeArquivo = convite.imagem;
		// Sem arte nova, o tema atual fica de pé: quem manda nele é a imagem.
		let tema = colunasDoTema(temaDoConvite(convite));
		const trocouArte = imagem instanceof File && imagem.size > 0;

		if (trocouArte) {
			if (!imagem.type.startsWith('image/')) {
				return fail(400, { acao: 'editar', erro: 'Envie um arquivo de imagem.' });
			}
			if (imagem.size > TAMANHO_MAX) {
				return fail(400, { acao: 'editar', erro: 'A imagem precisa ter no máximo 8 MB.' });
			}
			const arte = await salvarImagem(await imagem.arrayBuffer());
			nomeArquivo = arte.arquivo;
			tema = colunasDoTema(arte.tema);
		}

		db.update(schema.convites)
			.set({
				titulo,
				descricao,
				prazo: prazo.prazo,
				imagem: nomeArquivo,
				...tema,
				slug: slugParaTitulo(titulo, convite.slug)
			})
			.where(eq(schema.convites.hash, convite.hash))
			.run();

		// Só some com a arte antiga depois que a nova já está gravada e apontada.
		if (trocouArte) await apagarImagem(convite.imagem);

		return { acao: 'editar', ok: true };
	},

	remover: async (event) => {
		const anfitriao = await exigirAnfitriao(event);
		const convite = exigirConviteDoAnfitriao(event.params.hash, anfitriao.id);

		const dados = await event.request.formData();
		const token = String(dados.get('token') ?? '').trim();
		if (!token) return fail(400, { acao: 'remover', erro: 'Convidado não informado.' });

		db.delete(schema.convidados)
			.where(
				and(eq(schema.convidados.token, token), eq(schema.convidados.conviteHash, convite.hash))
			)
			.run();

		return { acao: 'remover', ok: true };
	},

	apagar: async (event) => {
		const anfitriao = await exigirAnfitriao(event);
		const convite = exigirConviteDoAnfitriao(event.params.hash, anfitriao.id);

		db.delete(schema.convites).where(eq(schema.convites.hash, convite.hash)).run();
		await apagarImagem(convite.imagem);

		redirect(303, '/visualizar');
	}
};
