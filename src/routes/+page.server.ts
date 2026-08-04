import { redirect } from '@sveltejs/kit';
import { anfitriaoAtual } from '$lib/server/sessao';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	// A landing é o destino do redirect pós-login do Google: quem já entrou vai direto pro Relatório.
	if (await anfitriaoAtual(event)) redirect(303, '/visualizar');
	return {};
};
