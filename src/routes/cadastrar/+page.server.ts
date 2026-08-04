import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { ehCredencialRecusada, signIn } from '$lib/server/auth';
import { anfitriaoAtual, destinoSeguro } from '$lib/server/sessao';
import { MINIMO, gerarHash } from '$lib/server/senha';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const destino = destinoSeguro(event.url.searchParams.get('destino'), event.url.origin);
	if (await anfitriaoAtual(event)) redirect(303, destino);
	return { destino, minimo: MINIMO };
};

export const actions: Actions = {
	default: async (event) => {
		/*
		 * Clonar antes de ler: o corpo de um Request só se consome uma vez, e no fim
		 * quem lê o original é o `signIn` do Auth.js — é ele que injeta o csrfToken
		 * que o @auth/core exige.
		 */
		const dados = await event.request.clone().formData();
		const email = String(dados.get('email') ?? '')
			.trim()
			.toLowerCase();
		const senha = String(dados.get('senha') ?? '');
		const repetida = String(dados.get('repetida') ?? '');

		const invalido = (erro: string) => fail(400, { erro, email });

		if (!email.includes('@')) return invalido('Escreva um e-mail válido.');
		if (senha.length < MINIMO) return invalido(`A senha precisa de pelo menos ${MINIMO} caracteres.`);
		if (senha !== repetida) return invalido('As duas senhas não são iguais.');

		const existente = db
			.select({ senha: schema.users.senha })
			.from(schema.users)
			.where(eq(schema.users.email, email))
			.get();

		if (existente) {
			/*
			 * Conta sem senha é conta de Google. Deixar o cadastro definir a senha dela
			 * seria entregar a conta alheia a quem só souber o e-mail — a senha dessas
			 * contas só nasce em /conta, com a pessoa já logada.
			 */
			return invalido(
				existente.senha
					? 'Já existe conta com esse e-mail. Entre com sua senha.'
					: 'Esse e-mail já entra pelo Google. Entre por lá e crie uma senha em Conta.'
			);
		}

		db.insert(schema.users)
			.values({
				email,
				// Sem campo de nome no cadastro: a parte antes do @ já identifica o Anfitrião.
				name: email.slice(0, email.indexOf('@')),
				senha: await gerarHash(senha)
			})
			.run();

		// O form já carrega providerId, email, senha e redirectTo: entra logado direto.
		try {
			return await signIn(event);
		} catch (erro) {
			/*
			 * A conta acabou de nascer com esta senha, então recusa aqui é sinal de
			 * bug — mas ainda assim não pode virar 500 em cima de um cadastro que deu
			 * certo: manda pro login, onde a pessoa tenta de novo.
			 */
			if (!ehCredencialRecusada(erro)) throw erro;
			redirect(303, '/entrar');
		}
	}
};
