import type { AdapterAccountType } from '@auth/core/adapters';
import { relations } from 'drizzle-orm';
import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
	image: text('image'),
	/*
	 * Coluna nossa, fora do contrato do adapter — ele ignora o que não conhece.
	 * Hash scrypt no formato `scrypt$salt$hash`. Nulo em quem entrou pelo Google
	 * e nunca definiu senha.
	 */
	senha: text('senha')
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
		/*
		 * A segunda cor da arte, a que canta: pinta só os tokens de accent. Nula
		 * quando a arte é de uma cor só — aí o accent segue a matiz dominante.
		 */
		temaAccentMatiz: real('tema_accent_matiz'),
		temaAccentCroma: real('tema_accent_croma'),
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
		/**
		 * Nomeado pelo Anfitrião no Convidar, ou pelo próprio Convidado ao responder
		 * pelo Link Aberto. Nulo só nas linhas anteriores ao fim do Convidado Anônimo.
		 */
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
	/*
	 * Sem índice por Visitante: quem responde pelo Link Aberto vira um Convidado
	 * com token próprio, e é esse token — memorizado no dispositivo — que impede a
	 * resposta dupla. Um mesmo celular pode ter vários Convidados no mesmo Convite
	 * de propósito: o telefone da casa responde pela mãe e pelo pai.
	 */
	(t) => [index('idx_convidados_convite').on(t.conviteHash, t.criadoEm)]
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
