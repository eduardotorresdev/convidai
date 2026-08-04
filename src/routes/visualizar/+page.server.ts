import { desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { signOut } from '$lib/server/auth';
import { exigirAnfitriao } from '$lib/server/sessao';
import type { Totais } from '$lib/estado';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const anfitriao = await exigirAnfitriao(event);

	const meusConvites = db
		.select()
		.from(schema.convites)
		.where(eq(schema.convites.anfitriaoId, anfitriao.id))
		.orderBy(desc(schema.convites.criadoEm))
		.all();

	/*
	 * Uma agregação só pra todos os Convites do Anfitrião. Contar Convidados
	 * dentro de um loop viraria N+1 assim que alguém tiver dez Convites.
	 */
	const agregados = db
		.select({
			hash: schema.convidados.conviteHash,
			convidados: sql<number>`count(*)`,
			abertos: sql<number>`sum(case when ${schema.convidados.abertoEm} is not null then 1 else 0 end)`,
			sim: sql<number>`sum(case when ${schema.convidados.resposta} = 'sim' then 1 else 0 end)`,
			nao: sql<number>`sum(case when ${schema.convidados.resposta} = 'nao' then 1 else 0 end)`
		})
		.from(schema.convidados)
		.innerJoin(schema.convites, eq(schema.convites.hash, schema.convidados.conviteHash))
		.where(eq(schema.convites.anfitriaoId, anfitriao.id))
		.groupBy(schema.convidados.conviteHash)
		.all();

	const porHash = new Map<string, Totais>(
		agregados.map((a) => [
			a.hash,
			{ convidados: a.convidados, abertos: a.abertos, sim: a.sim, nao: a.nao }
		])
	);

	const vazio: Totais = { convidados: 0, abertos: 0, sim: 0, nao: 0 };

	return {
		anfitriao,
		convites: meusConvites.map((c) => ({
			hash: c.hash,
			slug: c.slug,
			titulo: c.titulo,
			imagem: c.imagem,
			prazo: c.prazo,
			totais: porHash.get(c.hash) ?? vazio
		}))
	};
};

/*
 * Postar direto em /auth/signout não desloga: o @auth/core exige um campo
 * `csrfToken` batendo com o cookie e devolve MissingCSRF sem ele. Passar pela
 * action do próprio Auth.js é o que injeta esse token.
 */
export const actions: Actions = { sair: signOut };
