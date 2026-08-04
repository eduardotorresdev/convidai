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

function buscarAnonimo(conviteHash: string, visitanteId: string): Convidado | undefined {
	return db
		.select()
		.from(convidados)
		.where(
			and(
				eq(convidados.conviteHash, conviteHash),
				isNull(convidados.nome),
				eq(convidados.reivindicadoPor, visitanteId)
			)
		)
		.get();
}

/**
 * Resolve quem é o Convidado numa Abertura de `/convites/[hash]/[slug]`.
 *
 * Link Pessoal válido registra a Abertura no Convidado Nomeado e NÃO cria linha
 * anônima — mesmo que o slot já esteja Reivindicado por outro Visitante. Quem
 * chega pelo Link Aberto vira (ou reencontra) o seu Convidado Anônimo.
 */
export function registrarAbertura(
	conviteHash: string,
	token: string | null,
	visitanteId: string
): Convidado {
	const nomeado = token ? buscarPorToken(conviteHash, token) : undefined;

	if (nomeado) {
		if (!nomeado.abertoEm) {
			const abertoEm = new Date();
			db.update(convidados)
				.set({ abertoEm })
				.where(eq(convidados.token, nomeado.token))
				.run();
			return { ...nomeado, abertoEm };
		}
		return nomeado;
	}

	const existente = buscarAnonimo(conviteHash, visitanteId);
	if (existente) return existente;

	return db
		.insert(convidados)
		.values({
			token: novoTokenConvidado(),
			conviteHash,
			nome: null,
			reivindicadoPor: visitanteId,
			abertoEm: new Date()
		})
		.returning()
		.get();
}

export type ResultadoResposta =
	| { ok: true; convidado: Convidado; virouAnonimo: boolean }
	| { ok: false; motivo: 'prazo_vencido' | 'convite_inexistente' };

/**
 * Grava a Resposta e aplica a regra de Reivindicação.
 *
 * A Reivindicação acontece aqui, na PRIMEIRA Resposta — nunca na Abertura. Um
 * Convidado Nomeado já Reivindicado por outro Visitante não é sobrescrito: quem
 * responde depois cai como Convidado Anônimo. É por isso que um link repassado
 * no grupo da família rende um nome e vários anônimos.
 */
export function registrarResposta(
	conviteHash: string,
	token: string | null,
	visitanteId: string,
	resposta: Resposta
): ResultadoResposta {
	const convite = buscarConvite(conviteHash);
	if (!convite) return { ok: false, motivo: 'convite_inexistente' };
	if (prazoVencido(convite.prazo)) return { ok: false, motivo: 'prazo_vencido' };

	return db.transaction((tx) => {
		const agora = new Date();
		const nomeado = token ? buscarPorToken(conviteHash, token) : undefined;
		const podeAssumirONome = nomeado && (nomeado.reivindicadoPor ?? visitanteId) === visitanteId;

		if (nomeado && podeAssumirONome) {
			/*
			 * Este Visitante já podia ter um Convidado Anônimo neste Convite (abriu
			 * antes pelo Link Aberto). É a mesma pessoa — some com a linha anônima
			 * pra não contar duas vezes, e pra não sobrar "Anônimo: viu" órfão.
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

			return { ok: true as const, convidado: atualizado, virouAnonimo: false };
		}

		// Sem Link Pessoal, ou com um slot já Reivindicado por outro navegador.
		const anonimo = tx
			.insert(convidados)
			.values({
				token: novoTokenConvidado(),
				conviteHash,
				nome: null,
				reivindicadoPor: visitanteId,
				resposta,
				respondidoEm: agora,
				abertoEm: agora
			})
			.onConflictDoUpdate({
				target: [convidados.conviteHash, convidados.reivindicadoPor],
				targetWhere: isNull(convidados.nome),
				set: { resposta, respondidoEm: agora }
			})
			.returning()
			.get();

		return { ok: true as const, convidado: anonimo, virouAnonimo: nomeado !== undefined };
	});
}

export function criarConvidado(conviteHash: string, token: string, nome: string): void {
	db.insert(convidados)
		.values({ token, conviteHash, nome: nome.trim().slice(0, 60) })
		.onConflictDoNothing()
		.run();
}

export function slugEmUso(slug: string): boolean {
	return db.select({ n: sql<number>`1` }).from(convites).where(eq(convites.slug, slug)).get() !== undefined;
}
