import { error, fail, redirect } from '@sveltejs/kit';
import { caminhoDoConvite } from '$lib/ids';
import { prazoVencido } from '$lib/estado';
import {
	buscarConvite,
	MAX_NOME,
	registrarAbertura,
	registrarResposta
} from '$lib/server/convites';
import { gravarVinculo, lerVinculo } from '$lib/server/visitante';
import { RESPOSTAS, type Resposta } from '$lib/server/db/schema';
import { temaDoConvite } from '$lib/tema';
import type { Actions, PageServerLoad } from './$types';

function ehResposta(valor: unknown): valor is Resposta {
	return typeof valor === 'string' && (RESPOSTAS as readonly string[]).includes(valor);
}

export const load: PageServerLoad = ({ params, url, cookies, locals }) => {
	const convite = buscarConvite(params.hash);
	if (!convite) error(404, 'Convite não encontrado');

	// O slug é enfeite: se vier errado, o canônico é 301 — nunca 404. A query
	// precisa sobreviver ao redirect, senão o ?convidado= evapora e a pessoa
	// perde o Link Pessoal no meio do caminho.
	if (params.slug !== convite.slug) {
		redirect(301, caminhoDoConvite(convite.hash, convite.slug) + url.search);
	}

	// O Vínculo é o Link Pessoal de quem se nomeou aqui mesmo: sem ele, reabrir o
	// Link Aberto pelo WhatsApp faria a pessoa se apresentar de novo do zero.
	const token = url.searchParams.get('convidado') ?? lerVinculo(cookies, convite.hash) ?? null;
	const convidado = registrarAbertura(convite.hash, token);

	// A Resposta é de quem Reivindicou o Convidado. Um Link Pessoal repassado
	// abre o Convite no Convidado alheio, e mostrar a Resposta dele aqui vazaria
	// Relatório pra um terceiro — além de esconder dele os botões.
	// `reivindicadoPor` só é preenchido na Resposta, nunca na Abertura.
	const meu =
		convidado !== undefined &&
		(convidado.reivindicadoPor === null || convidado.reivindicadoPor === locals.visitanteId);

	return {
		convite: {
			hash: convite.hash,
			slug: convite.slug,
			titulo: convite.titulo,
			descricao: convite.descricao,
			imagem: convite.imagem,
			prazo: convite.prazo
		},
		// A página inteira se pinta com a cor da arte — nulo cai no tema padrão.
		tema: temaDoConvite(convite),
		nomeConvidado: meu ? (convidado?.nome ?? null) : null,
		resposta: meu ? (convidado?.resposta ?? null) : null,
		// Sem Convidado próprio, a Resposta vai criar um — e todo Convidado tem nome.
		precisaNome: !meu,
		venceu: prazoVencido(convite.prazo),
		linkJaUsado: url.searchParams.get('link_usado') !== null,
		token
	};
};

export const actions: Actions = {
	responder: async ({ params, request, url, cookies, locals }) => {
		const dados = await request.formData();
		const resposta = dados.get('resposta');
		const nome = String(dados.get('nome') ?? '').trim();

		if (!ehResposta(resposta)) return fail(400, { motivo: 'resposta_invalida' as const });
		if (nome.length > MAX_NOME) {
			return fail(400, { motivo: 'nome_longo' as const, nome });
		}

		// O Vínculo é a última palavra sobre quem é este aparelho: sem ele aqui, uma
		// página velha em cache responderia sem token e criaria um Convidado a mais.
		const postado = dados.get('token');
		const token =
			(typeof postado === 'string' && postado ? postado : null) ??
			lerVinculo(cookies, params.hash) ??
			null;

		const resultado = registrarResposta(
			params.hash,
			token,
			locals.visitanteId,
			resposta,
			nome || null
		);

		if (!resultado.ok) {
			if (resultado.motivo === 'prazo_vencido') {
				return fail(410, { motivo: 'prazo_vencido' as const });
			}
			if (resultado.motivo === 'nome_obrigatorio') {
				return fail(400, { motivo: 'nome_obrigatorio' as const, nome });
			}
			error(404, 'Convite não encontrado');
		}

		/*
		 * O Convidado que acabou de se nomear vira Vínculo neste aparelho, e o
		 * redirect põe o token na URL: quem recarregar a página não reposta a
		 * Resposta, e quem voltar depois cai identificado.
		 */
		gravarVinculo(cookies, params.hash, resultado.convidado.token, url);

		const destino = new URL(url);
		destino.search = '';
		destino.searchParams.set('convidado', resultado.convidado.token);
		if (resultado.linkJaUsado) destino.searchParams.set('link_usado', '1');

		redirect(303, destino.pathname + destino.search);
	}
};
