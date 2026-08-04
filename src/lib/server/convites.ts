import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { db } from './db';
import { convidados, convites, type Convidado, type Convite } from './db/schema';
import { novoTokenConvidado } from '$lib/ids';
import { prazoVencido } from '$lib/estado';
import type { Resposta } from './db/schema';

export function buscarConvite(hash: string): Convite | undefined {
	return db.select().from(convites).where(eq(convites.hash, hash)).get();
}

/** Carrega um Convite garantindo que quem pede é o Anfitrião dele. */
export function exigirConviteDoAnfitriao(hash: string, anfitriaoId: string): Convite {
	const convite = buscarConvite(hash);
	// 404 e não 403 de propósito: quem não é dono não deve nem saber que existe.
	if (!convite || convite.anfitriaoId !== anfitriaoId) error(404, 'Convite não encontrado');
	return convite;
}

export function listarConvidados(conviteHash: string): Convidado[] {
	return db
		.select()
		.from(convidados)
		.where(eq(convidados.conviteHash, conviteHash))
		.orderBy(asc(convidados.criadoEm))
		.all();
}

function buscarPorToken(conviteHash: string, token: string): Convidado | undefined {
	return db
		.select()
		.from(convidados)
		.where(and(eq(convidados.conviteHash, conviteHash), eq(convidados.token, token)))
		.get();
}

/**
 * Resolve quem é o Convidado numa Abertura de `/convites/[hash]/[slug]`.
 *
 * Só existe Convidado onde existe token — o do Link Pessoal ou o do Vínculo
 * guardado no dispositivo. Quem chega pelo Link Aberto sem nunca ter respondido
 * ainda não é ninguém: o Convidado dele nasce na Resposta, quando se nomeia.
 */
export function registrarAbertura(conviteHash: string, token: string | null): Convidado | undefined {
	const convidado = token ? buscarPorToken(conviteHash, token) : undefined;
	if (!convidado) return undefined;

	if (!convidado.abertoEm) {
		const abertoEm = new Date();
		db.update(convidados).set({ abertoEm }).where(eq(convidados.token, convidado.token)).run();
		return { ...convidado, abertoEm };
	}

	return convidado;
}

export type ResultadoResposta =
	| { ok: true; convidado: Convidado; linkJaUsado: boolean }
	| { ok: false; motivo: 'prazo_vencido' | 'convite_inexistente' | 'nome_obrigatorio' };

/**
 * Grava a Resposta e aplica a regra de Reivindicação.
 *
 * A Reivindicação acontece aqui, na PRIMEIRA Resposta — nunca na Abertura. Um
 * Convidado Nomeado já Reivindicado por outro Visitante não é sobrescrito: quem
 * responde depois se nomeia e vira um Convidado próprio. É por isso que um link
 * repassado no grupo da família rende um nome do Anfitrião e vários nomes
 * escritos pelas próprias pessoas.
 *
 * `nome` só é usado — e só é exigido — quando a Resposta cria um Convidado novo.
 * Quem responde pelo próprio Link Pessoal já tem nome dado pelo Anfitrião.
 */
export function registrarResposta(
	conviteHash: string,
	token: string | null,
	visitanteId: string,
	resposta: Resposta,
	nome: string | null
): ResultadoResposta {
	const convite = buscarConvite(conviteHash);
	if (!convite) return { ok: false, motivo: 'convite_inexistente' };
	if (prazoVencido(convite.prazo)) return { ok: false, motivo: 'prazo_vencido' };

	const nomeado = token ? buscarPorToken(conviteHash, token) : undefined;
	const podeAssumirONome = nomeado && (nomeado.reivindicadoPor ?? visitanteId) === visitanteId;
	const escrito = normalizarNome(nome ?? '');

	if (!(nomeado && podeAssumirONome) && !escrito) {
		return { ok: false, motivo: 'nome_obrigatorio' };
	}

	return db.transaction((tx) => {
		const agora = new Date();

		if (nomeado && podeAssumirONome) {
			/*
			 * Legado: antes de o Convidado nascer nomeado, uma Abertura pelo Link
			 * Aberto criava uma linha sem nome pra este Visitante. É a mesma pessoa —
			 * some com ela pra não sobrar "Anônimo: viu" órfão no Relatório.
			 */
			tx.delete(convidados)
				.where(
					and(
						eq(convidados.conviteHash, conviteHash),
						isNull(convidados.nome),
						eq(convidados.reivindicadoPor, visitanteId)
					)
				)
				.run();

			const atualizado = tx
				.update(convidados)
				.set({
					resposta,
					respondidoEm: agora,
					reivindicadoPor: visitanteId,
					abertoEm: nomeado.abertoEm ?? agora
				})
				.where(eq(convidados.token, nomeado.token))
				.returning()
				.get();

			return { ok: true as const, convidado: atualizado, linkJaUsado: false };
		}

		/*
		 * Sem Link Pessoal, ou com um slot já Reivindicado por outro navegador: a
		 * pessoa escreveu o próprio nome e vira um Convidado como qualquer outro. O
		 * token dele volta pra quem chamou gravar como Vínculo no dispositivo — é o
		 * que faz a próxima visita reencontrar esta linha em vez de criar outra.
		 */
		const proprio = tx
			.insert(convidados)
			.values({
				token: novoTokenConvidado(),
				conviteHash,
				nome: escrito,
				reivindicadoPor: visitanteId,
				resposta,
				respondidoEm: agora,
				abertoEm: agora
			})
			.returning()
			.get();

		return { ok: true as const, convidado: proprio, linkJaUsado: nomeado !== undefined };
	});
}

/** Um nome de Convidado cabe numa linha da lista do Anfitrião. */
export const MAX_NOME = 60;

function normalizarNome(nome: string): string {
	return nome.trim().slice(0, MAX_NOME);
}

export function criarConvidado(conviteHash: string, token: string, nome: string): void {
	db.insert(convidados)
		.values({ token, conviteHash, nome: normalizarNome(nome) })
		.onConflictDoNothing()
		.run();
}

export function slugEmUso(slug: string): boolean {
	return db.select({ n: sql<number>`1` }).from(convites).where(eq(convites.slug, slug)).get() !== undefined;
}
