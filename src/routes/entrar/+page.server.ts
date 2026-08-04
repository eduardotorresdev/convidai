import { redirect } from '@sveltejs/kit';
import { ehCredencialRecusada, signIn } from '$lib/server/auth';
import { anfitriaoAtual, destinoSeguro } from '$lib/server/sessao';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const destino = destinoSeguro(event.url.searchParams.get('destino'), event.url.origin);
	if (await anfitriaoAtual(event)) redirect(303, destino);

	/*
	 * O fracasso não volta como `fail` da action: quem recusa é o Auth.js, e o
	 * caminho de volta pra cá é a query. Uma mensagem só pra e-mail inexistente e
	 * senha errada — de propósito, pra não revelar quem tem conta.
	 */
	const erro = event.url.searchParams.get('error');
	return {
		destino,
		erro: erro
			? erro === 'credenciais'
				? 'E-mail ou senha não conferem.'
				: 'Não deu pra entrar. Tente de novo.'
			: null
	};
};

export const actions: Actions = {
	default: async (event) => {
		try {
			return await signIn(event);
		} catch (erro) {
			// Só a senha recusada vira mensagem; qualquer outra falha continua subindo.
			if (!ehCredencialRecusada(erro)) throw erro;

			const busca = new URLSearchParams({ error: 'credenciais' });
			const destino = event.url.searchParams.get('destino');
			if (destino) busca.set('destino', destino);
			redirect(303, `/entrar?${busca}`);
		}
	}
};
