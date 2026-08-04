import type { AdapterAccountType } from '@auth/core/adapters';
import { relations, sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core';

const agora = () => new Date();

/* ────────────────────────── Auth.js ──────────────────────────
 * Formato exigido pelo @auth/drizzle-adapter. Não renomear colunas.
 * Um `user` aqui é um Anfitrião no domínio — Convidados nunca logam.
 */

export const users = sqliteTable('user', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text('name'),
	email: text('email').unique(),
	emailVerified: integer('emailVerified', { mode: 'timestamp_ms' }),
	image: text('image')
});

export const accounts = sqliteTable(
	'account',
	{
		userId: text('userId')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: text('type').$type<AdapterAccountType>().notNull(),
		provider: text('provider').notNull(),
		providerAccountId: text('providerAccountId').notNull(),
		refresh_token: text('refresh_token'),
		access_token: text('access_token'),
		expires_at: integer('expires_at'),
		token_type: text('token_type'),
		scope: text('scope'),
		id_token: text('id_token'),
		session_state: text('session_state')
	},
	(account) => [
		primaryKey({ columns: [account.provider, account.providerAccountId] })
	]
);

export const sessions = sqliteTable('session', {
	sessionToken: text('sessionToken').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: integer('expires', { mode: 'timestamp_ms' }).notNull()
});

export const verificationTokens = sqliteTable(
	'verificationToken',
	{
		identifier: text('identifier').notNull(),
		token: text('token').notNull(),
		expires: integer('expires', { mode: 'timestamp_ms' }).notNull()
	},
	(vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

/* ────────────────────────── Domínio ────────────────────────── */

export const convites = sqliteTable(
	'convites',
	{
		/** Identidade real e imutável do Convite. O slug é só enfeite legível. */
		hash: text('hash').primaryKey(),
		slug: text('slug').notNull(),
		anfitriaoId: text('anfitriao_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		titulo: text('titulo').notNull(),
		descricao: text('descricao').notNull().default(''),
		/** Nome do arquivo dentro de `uploads/` — sempre 1080x1080 .webp. */
		imagem: text('imagem').notNull(),
		/*
		 * Tema destilado da arte, em OKLCH. Nulo = arte sem cor de que se falar,
		 * ou Convite anterior a este recurso: a página cai no tema padrão. Só a
		 * matiz vem da imagem; a luminosidade de cada token é fixa no código.
		 */
		temaMatiz: real('tema_matiz'),
		temaCroma: real('tema_croma'),
		temaModo: text('tema_modo').$type<'claro' | 'escuro'>(),
		/** Prazo de Confirmação. Nulo = aceita Resposta pra sempre. */
		prazo: integer('prazo', { mode: 'timestamp_ms' }),
		criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().$defaultFn(agora)
	},
	(t) => [index('idx_convites_anfitriao').on(t.anfitriaoId, t.criadoEm)]
);

export const RESPOSTAS = ['sim', 'nao'] as const;
export type Resposta = (typeof RESPOSTAS)[number];

export const convidados = sqliteTable(
	'convidados',
	{
		/** Valor de `?convidado=` no Link Pessoal. Gerado no cliente, nunca reutilizado. */
		token: text('token').primaryKey(),
		conviteHash: text('convite_hash')
			.notNull()
			.references(() => convites.hash, { onDelete: 'cascade' }),
		/** Nulo = Convidado Anônimo. */
		nome: text('nome'),
		/**
		 * Id do Visitante que Reivindicou este Convidado. A Reivindicação acontece
		 * na primeira Resposta — nunca na Abertura — e jamais se desfaz.
		 */
		reivindicadoPor: text('reivindicado_por'),
		resposta: text('resposta').$type<Resposta>(),
		respondidoEm: integer('respondido_em', { mode: 'timestamp_ms' }),
		/** Primeira Abertura. Nulo = o Convidado nunca abriu o Convite. */
		abertoEm: integer('aberto_em', { mode: 'timestamp_ms' }),
		criadoEm: integer('criado_em', { mode: 'timestamp_ms' }).notNull().$defaultFn(agora)
	},
	(t) => [
		index('idx_convidados_convite').on(t.conviteHash, t.criadoEm),
		/*
		 * Um Visitante rende no máximo um Convidado Anônimo por Convite — é o que
		 * impede resposta dupla pelo Link Aberto. Convidados Nomeados ficam de fora
		 * do índice de propósito: um mesmo celular pode Reivindicar a mãe e o pai.
		 */
		uniqueIndex('uniq_anonimo_por_visitante')
			.on(t.conviteHash, t.reivindicadoPor)
			.where(sql`nome is null`)
	]
);

export const convitesRelations = relations(convites, ({ one, many }) => ({
	anfitriao: one(users, { fields: [convites.anfitriaoId], references: [users.id] }),
	convidados: many(convidados)
}));

export const convidadosRelations = relations(convidados, ({ one }) => ({
	convite: one(convites, { fields: [convidados.conviteHash], references: [convites.hash] })
}));

export type Convite = typeof convites.$inferSelect;
export type Convidado = typeof convidados.$inferSelect;
