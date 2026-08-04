import { error, fail, redirect } from '@sveltejs/kit';
import { caminhoDoConvite } from '$lib/ids';
import { ehAnonimo, prazoVencido } from '$lib/estado';
import { buscarConvite, registrarAbertura, registrarResposta } from '$lib/server/convites';
import { RESPOSTAS, type Resposta } from '$lib/server/db/schema';
import { temaDoConvite } from '$lib/tema';
import type { Actions, PageServerLoad } from './$types';

function ehResposta(valor: unknown): valor is Resposta {
	return typeof valor === 'string' && (RESPOSTAS as readonly string[]).includes(valor);
}

export const load: PageServerLoad = ({ params, url, locals }) => {
	const convite = buscarConvite(params.hash);
	if (!convite) error(404, 'Convite não encontrado');

	// O slug é enfeite: se vier errado, o canônico é 301 — nunca 404. A query
	// precisa sobreviver ao redirect, senão o ?convidado= evapora e a pessoa
	// perde o Link Pessoal no meio do caminho.
	if (params.slug !== convite.slug) {
		redirect(301, caminhoDoConvite(convite.hash, convite.slug) + url.search);
	}

	const token = url.searchParams.get('convidado');
	const convidado = registrarAbertura(convite.hash, token, locals.visitanteId);

	// A Resposta é de quem Reivindicou o Convidado. Um Link Pessoal repassado
	// abre o Convite no Convidado Nomeado alheio, e mostrar a Resposta dele aqui
	// vazaria Relatório pra um terceiro — além de esconder dele os botões.
	// `reivindicadoPor` só é preenchido na Resposta, nunca na Abertura.
	const meu =
		convidado.reivindicadoPor === null || convidado.reivindicadoPor === locals.visitanteId;

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
		// Nunca "Anônimo N" aqui: esse vocabulário é do Relatório, não da pessoa.
		nomeConvidado: ehAnonimo(convidado) ? null : convidado.nome,
		resposta: meu ? convidado.resposta : null,
		venceu: prazoVencido(convite.prazo),
		token
	};
};

export const actions: Actions = {
	responder: async ({ params, request, locals }) => {
		const dados = await request.formData();
		const resposta = dados.get('resposta');
		if (!ehResposta(resposta)) return fail(400, { motivo: 'resposta_invalida' as const });

		const token = dados.get('token');
		const resultado = registrarResposta(
			params.hash,
			typeof token === 'string' && token ? token : null,
			locals.visitanteId,
			resposta
		);

		if (!resultado.ok) {
			if (resultado.motivo === 'prazo_vencido') {
				return fail(410, { motivo: 'prazo_vencido' as const });
			}
			error(404, 'Convite não encontrado');
		}

		return {
			resposta: resultado.convidado.resposta,
			virouAnonimo: resultado.virouAnonimo
		};
	}
};
