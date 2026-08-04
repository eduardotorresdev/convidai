import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { exigirAnfitriao } from '$lib/server/sessao';
import { MINIMO, conferir, gerarHash } from '$lib/server/senha';
import type { Actions, PageServerLoad } from './$types';

/** Lê só se existe senha — o hash nunca sai do servidor. */
function senhaGuardada(id: string): string | null {
	const linha = db
		.select({ senha: schema.users.senha })
		.from(schema.users)
		.where(eq(schema.users.id, id))
		.get();
	return linha?.senha ?? null;
}

export const load: PageServerLoad = async (event) => {
	const anfitriao = await exigirAnfitriao(event);
	return { anfitriao, temSenha: senhaGuardada(anfitriao.id) !== null, minimo: MINIMO };
};

export const actions: Actions = {
	salvar: async (event) => {
		const anfitriao = await exigirAnfitriao(event);
		const dados = await event.request.formData();
		const atual = String(dados.get('atual') ?? '');
		const nova = String(dados.get('nova') ?? '');
		const repetida = String(dados.get('repetida') ?? '');

		const guardada = senhaGuardada(anfitriao.id);

		/*
		 * Quem entrou pelo Google e nunca teve senha não tem o que confirmar — está
		 * logado, e a sessão já é a prova de posse da conta. Quem tem senha precisa
		 * repetir a atual: uma sessão esquecida aberta não pode virar sequestro.
		 */
		if (guardada && !(await conferir(atual, guardada))) {
			return fail(400, { erro: 'A senha atual não confere.' });
		}
		if (nova.length < MINIMO) {
			return fail(400, { erro: `A senha precisa de pelo menos ${MINIMO} caracteres.` });
		}
		if (nova !== repetida) return fail(400, { erro: 'As duas senhas não são iguais.' });

		db.update(schema.users)
			.set({ senha: await gerarHash(nova) })
			.where(eq(schema.users.id, anfitriao.id))
			.run();

		/*
		 * A sessão continua valendo: com JWT não há linha em banco pra derrubar, e
		 * quem trocou a senha foi a própria pessoa que está logada aqui.
		 */
		return { salvo: true };
	}
};
